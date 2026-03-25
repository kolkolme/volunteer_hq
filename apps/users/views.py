from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.events.models import EventParticipation, ParticipationStatus
from apps.users.models import Role, User
from apps.users.permissions import IsAdminOrReadOnly, IsCoordinatorOrAbove, IsSelfOrCoordinatorOrAbove
from apps.users.serializers import (
    RoleSerializer,
    UserCreateUpdateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserStatsSerializer,
    MeSerializer,
    CustomTokenObtainPairSerializer,
    with_user_stats,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'detail': 'Поле refresh обязательно.'}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        # Устанавливаем роль волонтера по умолчанию, если не указана
        if 'role' not in data:
            try:
                volunteer_role = Role.objects.get(code='volunteer')
                data['role'] = volunteer_role.id
            except Role.DoesNotExist:
                return Response({'detail': 'Роль волонтера не найдена. Обратитесь к администратору.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = UserCreateUpdateSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': MeSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(RetrieveAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['code', 'title', 'description']
    ordering_fields = ['id', 'title', 'code']


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'city', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'contact', 'email']
    ordering_fields = ['id', 'date_joined', 'username', 'last_name']

    def get_queryset(self):
        qs = with_user_stats(User.objects.all())
        user = self.request.user
        if user.role.code == 'city_coordinator':
            qs = qs.filter(city=user.city)
        elif user.role.code == 'volunteer':
            qs = qs.filter(pk=user.pk)
        return qs

    def get_serializer_class(self):
        if self.action in {'create', 'update', 'partial_update'}:
            return UserCreateUpdateSerializer
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.action in {'list', 'retrieve', 'stats', 'events'}:
            return [IsSelfOrCoordinatorOrAbove()]
        return [IsCoordinatorOrAbove()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        user = self.get_object()
        participations = EventParticipation.objects.filter(user=user).select_related('event', 'event__event_type', 'event__city')
        events_total = participations.count()
        accepted_events = participations.filter(status=ParticipationStatus.ACCEPTED).count()
        attended_events = participations.filter(status=ParticipationStatus.ATTENDED).count()
        lectures_count = participations.filter(status=ParticipationStatus.ATTENDED, event__event_type__code='lecture').count()
        workshops_count = participations.filter(status=ParticipationStatus.ATTENDED, event__event_type__code='workshop').count()
        attendance_rate = round((attended_events / max(accepted_events, 1)) * 100, 2)
        activity_score = attended_events * 10 + lectures_count * 5 + workshops_count * 7
        serializer = UserStatsSerializer({
            'user_id': user.id,
            'full_name': user.full_name,
            'city': user.city.title if user.city else None,
            'events_total': events_total,
            'accepted_events': accepted_events,
            'attended_events': attended_events,
            'lectures_count': lectures_count,
            'workshops_count': workshops_count,
            'attendance_rate': attendance_rate,
            'activity_score': activity_score,
        })
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        from apps.events.serializers import EventParticipationSerializer

        queryset = EventParticipation.objects.filter(user_id=pk).select_related(
            'event',
            'event__city',
            'event__event_type',
            'user',
            'user__city',
            'user__role',
        )
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        serializer = EventParticipationSerializer(queryset, many=True)
        return Response(serializer.data)
