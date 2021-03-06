from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import GenericViewSet
from hearthsim_identity.api.models import APIKey
from hsreplaynet.games.models import GameReplay
from hsreplaynet.uploads.models import UploadEvent
from . import serializers
from .authentication import AuthTokenAuthentication, RequireAuthToken
from .permissions import APIKeyPermission, IsOwnerOrReadOnly


class WriteOnlyOnceViewSet(
	CreateModelMixin, UpdateModelMixin, RetrieveModelMixin, GenericViewSet
):
	pass


class APIKeyViewSet(WriteOnlyOnceViewSet):
	permission_classes = (AllowAny, )
	queryset = APIKey.objects.all()
	serializer_class = serializers.APIKeySerializer


class UploadEventViewSet(WriteOnlyOnceViewSet):
	authentication_classes = (AuthTokenAuthentication, SessionAuthentication)
	permission_classes = (RequireAuthToken, APIKeyPermission)
	queryset = UploadEvent.objects.all()
	serializer_class = serializers.UploadEventSerializer
	lookup_field = "shortid"


class GameReplayDetail(RetrieveUpdateDestroyAPIView):
	queryset = GameReplay.objects.live()
	serializer_class = serializers.GameReplaySerializer
	lookup_field = "shortid"
	permission_classes = (IsOwnerOrReadOnly, )

	def perform_destroy(self, instance):
		instance.is_deleted = True
		instance.save()


class GameReplayList(ListAPIView):
	queryset = GameReplay.objects.live().prefetch_related("user", "global_game__players")
	serializer_class = serializers.GameReplayListSerializer

	def check_permissions(self, request):
		if not request.user.is_authenticated:
			self.permission_denied(request)
		return super().check_permissions(request)

	def get_queryset(self):
		queryset = super().get_queryset()
		user = self.request.user
		if not user.is_staff:
			# For non-staff, only own games are visible
			queryset = queryset.filter(user=user)
		# Allow filtering on username key
		username = self.request.query_params.get("username", None)
		if username:
			queryset = queryset.filter(user__username=username)
		return queryset
