from datetime import datetime
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.http import (
	Http404, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, JsonResponse
)
from django.views.decorators.http import condition
from hsredshift.analytics.filters import Region
from hsredshift.analytics.library.base import InvalidOrMissingQueryParameterError
from hsreplaynet.decks.models import Deck
from hsreplaynet.utils import influx, log
from .processing import (
	evict_locks_cache, execute_query, get_concurrent_redshift_query_queue_semaphore,
	get_redshift_catalogue
)


@staff_member_required
def evict_query_from_cache(request, name):
	parameterized_query = _get_query_and_params(request, name)
	parameterized_query.evict_cache()

	# Clear out any lingering dogpile locks on this query
	evict_locks_cache(parameterized_query)

	return JsonResponse({"msg": "OK"})


@staff_member_required
def release_semaphore(request, name):
	semaphore = get_concurrent_redshift_query_queue_semaphore(name)
	if semaphore:
		semaphore.reset()
	return JsonResponse({"msg": "OK"})


def fetch_query_result_as_of(request, name):
	parameterized_query = _get_query_and_params(request, name)
	if issubclass(parameterized_query.__class__, HttpResponse):
		return None

	return parameterized_query.result_as_of


def _get_query_and_params(request, name):
	query = get_redshift_catalogue().get_query(name)
	if not query:
		raise Http404("No query named: %s" % name)

	supplied_params = request.GET.dict()
	if "deck_id" in supplied_params and not supplied_params["deck_id"].isdigit():
		# We got sent a shortid, so we need to translate it into a deck_id int
		try:
			deck = Deck.objects.get_by_shortid(supplied_params["deck_id"])
			supplied_params["deck_id"] = str(deck.id)
		except Deck.DoesNotExist:
			raise Http404("Deck does not exist")

	if query.is_personalized:
		if request.user and request.user.is_authenticated:
			if "Region" not in supplied_params:
				default_blizzard_account = request.user.blizzard_accounts.first()

				if default_blizzard_account:
					supplied_params["Region"] = default_blizzard_account.region.name
					supplied_params["account_lo"] = default_blizzard_account.account_lo
				else:
					raise Http404("User does not have any Blizzard Accounts.")
			else:
				user_owns_blizzard_account = request.user.blizzard_accounts.filter(
					region__exact=int(supplied_params["Region"]),
					account_lo__exact=int(supplied_params["account_lo"])
				).exists()
				if not user_owns_blizzard_account:
					return HttpResponseForbidden()

			if supplied_params["Region"].isdigit():
				region_member = Region.from_int(int(supplied_params["Region"]))
				supplied_params["Region"] = region_member.name

			try:
				personal_parameterized_query = query.build_full_params(supplied_params)
			except InvalidOrMissingQueryParameterError as e:
				# Return a 400 Bad Request response
				log.warn(str(e))
				return HttpResponseBadRequest()

			if not user_is_eligible_for_query(request.user, query, personal_parameterized_query):
				return HttpResponseForbidden()

			return personal_parameterized_query

		else:
			# Anonymous or Fake Users Can Never Request Personal Stats
			return HttpResponseForbidden()
	else:
		try:
			parameterized_query = query.build_full_params(supplied_params)
		except InvalidOrMissingQueryParameterError as e:
			# Return a 400 Bad Request response
			log.warn(str(e))
			return HttpResponseBadRequest()

		if not user_is_eligible_for_query(request.user, query, parameterized_query):
			return HttpResponseForbidden()

		return parameterized_query


def user_is_eligible_for_query(user, query, params):
	if user.is_staff:
		return True

	if params.has_premium_values:
		return user.is_authenticated and user.is_premium
	else:
		return True


@condition(last_modified_func=fetch_query_result_as_of)
def fetch_query_results(request, name):
	parameterized_query = _get_query_and_params(request, name)
	if issubclass(parameterized_query.__class__, HttpResponse):
		return parameterized_query

	return _fetch_query_results(parameterized_query)


@staff_member_required
@condition(last_modified_func=fetch_query_result_as_of)
def fetch_local_query_results(request, name):
	# This end point is intended only for administrator use.
	# It provides an entry point to force a query to be run locally
	# and by-pass all of the in-flight short circuits.
	# This can be critical in case a query is failing on Lambda, and
	# repeated attempts to run it on lambda are causing it's in-flight status
	# to always be true.
	parameterized_query = _get_query_and_params(request, name)
	return _fetch_query_results(parameterized_query, run_local=True)


def _fetch_query_results(parameterized_query, run_local=False):
	cache_is_populated = parameterized_query.cache_is_populated
	is_cache_hit = parameterized_query.result_available
	triggered_refresh = False

	if is_cache_hit:
		if parameterized_query.result_is_stale:
			triggered_refresh = True
			attempt_request_triggered_query_execution(parameterized_query, run_local)

		staleness = (datetime.utcnow() - parameterized_query.result_as_of).total_seconds()
		query_fetch_metric_fields = {
			"count": 1,
			"staleness": int(staleness)
		}
		query_fetch_metric_fields.update(
			parameterized_query.supplied_non_filters_dict
		)

		influx.influx_metric(
			"redshift_response_payload_staleness",
			query_fetch_metric_fields,
			query_name=parameterized_query.query_name,
			**parameterized_query.supplied_filters_dict
		)

		if settings.REDSHIFT_PRETTY_PRINT_QUERY_RESULTS:
			json_params = dict(indent=4)
		else:
			json_params = dict(separators=(",", ":"),)

		response = JsonResponse(
			parameterized_query.response_payload,
			json_dumps_params=json_params
		)
	elif cache_is_populated and parameterized_query.is_global:
		# There is no content for this permutation of parameters
		# For deck related queries this most likely means that someone hand crafted the URL
		# Or if it's a card related query, then it's a corner case where there is no data
		response = HttpResponse(status=204)
	else:
		# The cache is not populated yet for this query.
		# Perhaps it's a new query or perhaps the cache was recently flushed.
		# So attempt to trigger populating it
		attempt_request_triggered_query_execution(parameterized_query, run_local)
		result = {"msg": "Query is processing. Check back later."}
		response = JsonResponse(result, status=202)

	log.info("Query: %s Cache Populated: %s Cache Hit: %s Is Stale: %s" % (
		cache_is_populated,
		parameterized_query.cache_key,
		is_cache_hit,
		triggered_refresh
	))

	query_fetch_metric_fields = {
		"count": 1,
	}
	query_fetch_metric_fields.update(
		parameterized_query.supplied_non_filters_dict
	)

	influx.influx_metric(
		"redshift_query_fetch",
		query_fetch_metric_fields,
		cache_populated=cache_is_populated,
		cache_hit=is_cache_hit,
		query_name=parameterized_query.query_name,
		triggered_refresh=triggered_refresh,
		**parameterized_query.supplied_filters_dict
	)

	return response


def attempt_request_triggered_query_execution(parameterized_query, run_local=False):
	if run_local or settings.REDSHIFT_TRIGGER_CACHE_REFRESHES_FROM_QUERY_REQUESTS:
		execute_query(parameterized_query, run_local)
