from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.events.models import EventParticipation, ParticipationStatus
from apps.users.models import Role, User, VolunteerApplication, ChatRoom, Message, Complaint, ComplaintStatus
from apps.users.permissions import IsAdminOrReadOnly, IsAdminOrAbove, IsSelfOrAdminOrAbove, IsSuperuser, IsCoordinatorOrAbove
from apps.users.serializers import (
    RoleSerializer,
    UserCreateUpdateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserShortSerializer,
    UserStatsSerializer,
    MeSerializer,
    MeUpdateSerializer,
    CustomTokenObtainPairSerializer,
    VolunteerApplicationSerializer,
    VolunteerApplicationAdminSerializer,
    ChatRoomSerializer,
    MessageSerializer,
    ComplaintSerializer,
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

    ALLOWED_REGISTRATION_ROLES = {'volunteer', 'user'}

    def post(self, request):
        data = request.data.copy()
        role_code = data.pop('role_code', 'user')
        if isinstance(role_code, list):
            role_code = role_code[0]

        if role_code not in self.ALLOWED_REGISTRATION_ROLES:
            role_code = 'user'

        try:
            role = Role.objects.get(code=role_code)
            data['role'] = role.id
        except Role.DoesNotExist:
            return Response({'detail': 'Роль не найдена. Обратитесь к администратору.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['code', 'title', 'description']
    ordering_fields = ['id', 'title', 'code']


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'contact', 'email']
    ordering_fields = ['id', 'date_joined', 'username', 'last_name']

    def get_queryset(self):
        qs = with_user_stats(User.objects.all())
        user = self.request.user
        if user.role.code in {'volunteer', 'user'}:
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
            return [IsSelfOrAdminOrAbove()]
        if self.action == 'chat_search':
            return [IsAuthenticated()]
        return [IsAdminOrAbove()]

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
        participations = EventParticipation.objects.filter(user=user).select_related('event', 'event__event_type')
        events_total = participations.count()
        accepted_events = participations.filter(status=ParticipationStatus.ACCEPTED).count()
        attended_events = participations.filter(status=ParticipationStatus.ATTENDED).count()
        lectures_count = participations.filter(status=ParticipationStatus.ATTENDED, event__event_type__code='lecture').count()
        workshops_count = participations.filter(status=ParticipationStatus.ATTENDED, event__event_type__code='workshop').count()
        attendance_rate = min(round((attended_events / max(accepted_events, 1)) * 100, 2), 100)
        activity_score = attended_events * 10 + lectures_count * 5 + workshops_count * 7
        serializer = UserStatsSerializer({
            'user_id': user.id,
            'full_name': user.full_name,
            'events_total': events_total,
            'accepted_events': accepted_events,
            'attended_events': attended_events,
            'lectures_count': lectures_count,
            'workshops_count': workshops_count,
            'attendance_rate': attendance_rate,
            'activity_score': activity_score,
        })
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='chat-search', permission_classes=[IsAuthenticated])
    def chat_search(self, request):
        """Search users by name/username for starting a chat. Available to all authenticated users."""
        from django.db.models import Q as DQ
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        users = User.objects.filter(
            DQ(first_name__icontains=q) | DQ(last_name__icontains=q) | DQ(username__icontains=q),
            is_active=True,
        ).exclude(pk=request.user.pk).select_related('role')[:20]
        return Response(UserShortSerializer(users, many=True).data)

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        from apps.events.serializers import EventParticipationSerializer

        queryset = EventParticipation.objects.filter(user_id=pk).select_related(
            'event',
            'event__event_type',
            'user',
            'user__role',
        )
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        serializer = EventParticipationSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrAbove])
    def grant_permit(self, request, pk=None):
        """Admin+ can grant coordinator permit to a volunteer with avg_rating >= 7.0"""
        user = self.get_object()
        if user.role and user.role.code not in {'volunteer', 'coordinator'}:
            return Response({'detail': 'Разрешение можно выдать только волонтёру.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.avg_rating < 7.0:
            return Response({'detail': f'Рейтинг {user.avg_rating} ниже минимума 7.0 для выдачи разрешения.'}, status=status.HTTP_400_BAD_REQUEST)
        user.has_permit = True
        user.save(update_fields=['has_permit'])
        return Response({'detail': 'Разрешение выдано.', 'has_permit': True})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperuser])
    def revoke_permit(self, request, pk=None):
        """Superuser can revoke coordinator permit"""
        user = self.get_object()
        user.has_permit = False
        user.save(update_fields=['has_permit'])
        return Response({'detail': 'Разрешение отозвано.', 'has_permit': False})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperuser])
    def grant_adminka(self, request, pk=None):
        """Superuser can promote a coordinator (with permit) to admin"""
        user = self.get_object()
        if not user.has_permit:
            return Response({'detail': 'Пользователь не имеет разрешения (permit).'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            admin_role = Role.objects.get(code='admin')
        except Role.DoesNotExist:
            return Response({'detail': 'Роль admin не найдена.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        user.role = admin_role
        user.save(update_fields=['role'])
        return Response({'detail': 'Пользователь назначен администратором.', 'role': 'admin'})


class VolunteerApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.role.code in {'admin', 'superuser'}:
            return VolunteerApplication.objects.select_related('user', 'user__city', 'reviewed_by').all()
        return VolunteerApplication.objects.select_related('user', 'user__city').filter(user=user)

    def get_serializer_class(self):
        user = self.request.user
        if user.role.code in {'admin', 'superuser'}:
            return VolunteerApplicationAdminSerializer
        return VolunteerApplicationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # One active application per user
        existing = VolunteerApplication.objects.filter(user=request.user, status='pending').first()
        if existing:
            return Response({'detail': 'У вас уже есть активная заявка на рассмотрении.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)


class ChatRoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return ChatRoom.objects.filter(participants=self.request.user).prefetch_related('participants', 'messages')

    def get_serializer_class(self):
        return ChatRoomSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(ChatRoomSerializer(room, context={'request': request}).data, status=status.HTTP_201_CREATED)


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    filterset_fields = ['room']

    def get_queryset(self):
        user = self.request.user
        return Message.objects.filter(room__participants=user).select_related('room', 'sender').order_by('created_at')

    def get_serializer_class(self):
        return MessageSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        room = serializer.validated_data['room']
        if self.request.user not in room.participants.all():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Вы не являетесь участником этого чата.')
        serializer.save(sender=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        room_id = request.data.get('room')
        if not room_id:
            return Response({'detail': 'Поле room обязательно.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = Message.objects.filter(room_id=room_id, room__participants=request.user).exclude(sender=request.user).update(is_read=True)
        return Response({'updated': updated})


class ComplaintViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['status', 'volunteer']

    def get_queryset(self):
        user = self.request.user
        if user.role and user.role.code in {'superuser', 'admin', 'coordinator'}:
            return Complaint.objects.select_related('reporter', 'volunteer', 'event').all()
        return Complaint.objects.filter(reporter=user).select_related('reporter', 'volunteer', 'event')

    def get_serializer_class(self):
        return ComplaintSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=True, methods=['post'], permission_classes=[IsCoordinatorOrAbove])
    def accept(self, request, pk=None):
        complaint = self.get_object()
        if complaint.status != ComplaintStatus.PENDING:
            return Response({'detail': 'Только ожидающие жалобы можно принять.'}, status=status.HTTP_400_BAD_REQUEST)
        complaint.status = ComplaintStatus.ACCEPTED
        complaint.save(update_fields=['status'])
        return Response({'detail': 'Жалоба принята.', 'status': ComplaintStatus.ACCEPTED})

    @action(detail=True, methods=['post'], permission_classes=[IsCoordinatorOrAbove])
    def reject(self, request, pk=None):
        complaint = self.get_object()
        if complaint.status != ComplaintStatus.PENDING:
            return Response({'detail': 'Только ожидающие жалобы можно отклонить.'}, status=status.HTTP_400_BAD_REQUEST)
        complaint.status = ComplaintStatus.REJECTED
        complaint.save(update_fields=['status'])
        return Response({'detail': 'Жалоба отклонена.', 'status': ComplaintStatus.REJECTED})
