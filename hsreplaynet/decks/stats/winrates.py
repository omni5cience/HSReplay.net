import hashlib
from collections import defaultdict
from django.core.cache import cache
from django.db import connection
from hsreplaynet.utils.collections import defaultdict_to_vanilla_dict
from hsreplaynet.utils.db import dictfetchall


WINRATES_BY_ARCHETYPE_FILTER_TEMPLATE_DEPRICATED = """
FILTER (
WHERE epoch_seconds > date_part('epoch', CURRENT_TIMESTAMP - INTERVAL '%s days')
AND game_type IN (%s)
AND region_id IN (%s)
AND rank BETWEEN %s AND %s
)
"""

WINRATES_BY_ARCHETYPE_FILTER_TEMPLATE = """
FILTER (
WHERE epoch_seconds BETWEEN date_part('epoch', CURRENT_TIMESTAMP - INTERVAL '%s days')
					AND date_part('epoch', CURRENT_TIMESTAMP - INTERVAL '%s days')
AND game_type IN (%s)
AND region_id IN (%s)
AND rank BETWEEN %s AND %s
)
"""

WINRATES_BY_ARCHETYPE_QUERY_TEMPLATE = """
SELECT
friendly_arch.id,
max(friendly_arch.name) AS "friendly_arch_name",
opposing_arch.id,
max(opposing_arch.name) AS "opposing_arch_name",
sum(hth.matches) %s as "match_count",
sum(hth.friendly_player_wins) %s AS "friendly_wins",
(1.0 * sum(hth.friendly_player_wins) %s ) / sum(hth.matches) %s AS f_wr_vs_o,
CASE WHEN friendly_arch.id = opposing_arch.id THEN 1 ELSE 0 END AS "is_mirror"
FROM cards_archetype friendly_arch
JOIN cards_archetype opposing_arch ON TRUE
LEFT JOIN head_to_head_archetype_stats hth
	ON hth.friendly_player_archetype_id = friendly_arch.id
	AND hth.opposing_player_archetype_id = opposing_arch.id
WHERE friendly_arch.id IN (%s)
AND opposing_arch.id IN (%s)
GROUP BY friendly_arch.id, opposing_arch.id;
"""


def get_head_to_head_winrates(
	lookback,
	offset,
	game_types,
	regions,
	min_rank,
	max_rank,
	archetypes
):
	lookback_window_start = str(int(lookback) + int(offset))
	lookback_window_end = offset
	query_params = (
		lookback_window_start,
		lookback_window_end,
		game_types,
		regions,
		min_rank,
		max_rank,
	)
	filter_expr = WINRATES_BY_ARCHETYPE_FILTER_TEMPLATE % query_params

	query = WINRATES_BY_ARCHETYPE_QUERY_TEMPLATE % (
		filter_expr,
		filter_expr,
		filter_expr,
		filter_expr,
		archetypes,
		archetypes
	)

	def gen_cache_value():
		return _generate_win_rates_by_archetype_table_from_db(query)

	m = hashlib.md5()
	m.update(offset.encode("utf8"))
	m.update(lookback.encode("utf8"))
	m.update(game_types.encode("utf8"))
	m.update(regions.encode("utf8"))
	m.update(min_rank.encode("utf8"))
	m.update(max_rank.encode("utf8"))
	m.update(archetypes.encode("utf8"))
	cache_key = m.hexdigest()

	win_rates_table, archetype_frequencies, expected_winrates = cache.get_or_set(
		cache_key,
		gen_cache_value,
		timeout=10
	)
	return win_rates_table, archetype_frequencies, expected_winrates


def _generate_win_rates_by_archetype_table_from_db(query):
	win_rates_table = defaultdict(lambda: defaultdict(dict))
	archetype_counts = defaultdict(int)
	total_matches = 0

	cursor = connection.cursor()
	cursor.execute(query)

	for record in dictfetchall(cursor):
		if record["match_count"]:
			total_matches += record["match_count"]
			archetype_counts[record["friendly_arch_name"]] += record["match_count"]

		head_to_head = win_rates_table[record["friendly_arch_name"]][record["opposing_arch_name"]]
		head_to_head["friendly_wins"] = record["friendly_wins"] if record["friendly_wins"] else 0
		head_to_head["match_count"] = record["match_count"] if record["match_count"] else 0

		if record["f_wr_vs_o"] is None:
			head_to_head["f_wr_vs_o"] = None
		else:
			head_to_head["f_wr_vs_o"] = float(record["f_wr_vs_o"])

		head_to_head["is_mirror"] = bool(record["is_mirror"])

	win_rates_table = defaultdict_to_vanilla_dict(win_rates_table)

	# Consider calculating this from deck_summary_stats to get higher resolution than 1 day.
	# E.g. deck_summary_stats can give a distribution up to the hour
	# Pull the archetype win_rates from one function
	# And the archetype frequencies from another query
	# And merge them in python to generate the expected win rates
	archetype_frequencies = {
		a: ((1.0 * c) / total_matches) for a, c in archetype_counts.items()
	}

	sorted_archetypes = sorted(archetype_frequencies.keys())

	expected_winrates = {}
	for archetype in sorted_archetypes:
		expected_win_rate = 0.0
		archetype_win_rates_vs_opponents = win_rates_table[archetype]
		for opponent_archetype in sorted_archetypes:
			opponent_frequency = archetype_frequencies[opponent_archetype]
			if opponent_archetype in archetype_win_rates_vs_opponents:
				head_to_head_winrate = archetype_win_rates_vs_opponents[opponent_archetype]
				MIN_SAMPLE_CUTOFF = 10
				if head_to_head_winrate["match_count"] \
					and head_to_head_winrate["match_count"] >= MIN_SAMPLE_CUTOFF\
					and head_to_head_winrate["f_wr_vs_o"]:
					win_rate_for_match = head_to_head_winrate["f_wr_vs_o"]
					expected_win_rate += opponent_frequency * win_rate_for_match
				else:
					expected_win_rate += opponent_frequency * .5
			else:
				expected_win_rate += opponent_frequency * .5
		expected_winrates[archetype] = expected_win_rate

	return win_rates_table, archetype_frequencies, expected_winrates
