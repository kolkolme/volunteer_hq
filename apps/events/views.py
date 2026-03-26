from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event, EventParticipation, EventType, EventStatus, LectureRating, ParticipationStatus, Tag, LectureMaterial
from apps.events.serializers import (
    EventTypeSerializer,
    EventListSerializer,
    EventDetailSerializer,
    EventCreateUpdateSerializer,
    EventParticipationSerializer,
    LectureRatingSerializer,
    MyStatsSerializer,
    EventCompleteSerializer,
    MyParticipationDecisionSerializer,
    TagSerializer,
    LectureMaterialSerializer,
    with_event_stats,
)
from apps.users.models import User
from apps.users.permissions import IsAdminOrReadOnly, IsAdminOrAbove, IsCoordinatorOrAbove


class EventTypeViewSet(viewsets.ModelViewSet):
    queryset = EventType.objects.all()
    serializer_class = EventTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['code', 'title']
    ordering_fields = ['id', 'title']


class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['city', 'event_type', 'status']
    search_fields = ['title', 'description', 'address']
    ordering_fields = ['id', 'date_start', 'date_end', 'created_at']

    def get_queryset(self):
        queryset = with_event_stats(Event.objects.all())
        user = self.request.user
        if user.role.code == 'volunteer':
            # show events the volunteer participates in OR created themselves
            from django.db.models import Q
            queryset = queryset.filter(
                Q(participations__user=user) | Q(created_by=user)
            ).distinct()
        # 'user' role sees all events (they are visitors, not volunteers)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(date_start__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_start__date__lte=date_to)
        if self.request.query_params.get('is_understaffed') == 'true':
            queryset = queryset.filter(accepted_count__lt=F('volunteers_count_min'))
        return queryset

    def get_serializer_class(self):
        if self.action in {'create', 'update', 'partial_update'}:
            return EventCreateUpdateSerializer
        if self.action == 'retrieve':
            return EventDetailSerializer
        return EventListSerializer

    def get_permissions(self):
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated()]
        if self.action == 'create':
            return [IsAuthenticated()]  # volunteers (students) can create lectures
        return [IsAdminOrAbove()]

    @action(detail=True, methods=['get', 'post'])
    def participants(self, request, pk=None):
        event = self.get_object()
        if request.method == 'GET':
            serializer = EventParticipationSerializer(
                event.participations.select_related('event', 'user', 'user__city', 'user__role'),
                many=True,
            )
            return Response(serializer.data)

        serializer = EventParticipationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(event=event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def assign_volunteers(self, request, pk=None):
        event = self.get_object()
        current_user = request.user

        if current_user.role.code not in {'superuser', 'admin'}:
            raise PermissionDenied('Только администратор может назначать волонтёров.')

        volunteer_ids = request.data.get('volunteer_ids', [])
        if not isinstance(volunteer_ids, list):
            return Response({'detail': 'volunteer_ids должен быть списком id'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_volunteers = User.objects.filter(
            id__in=volunteer_ids,
            role__code='volunteer',
            city_id=event.city_id,
            is_active=True,
        )

        assigned = []
        already_assigned = []
        invalid = []

        allowed_ids = set(allowed_volunteers.values_list('id', flat=True))
        for vid in volunteer_ids:
            if vid not in allowed_ids:
                invalid.append(vid)
                continue
            participation, created = EventParticipation.objects.get_or_create(
                event=event,
                user_id=vid,
                defaults={'status': ParticipationStatus.PENDING},
            )
            if created:
                assigned.append(vid)
            else:
                already_assigned.append(vid)

        return Response({
            'event_id': event.id,
            'assigned': assigned,
            'already_assigned': already_assigned,
            'invalid': invalid,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def complete(self, request, pk=None):
        event = self.get_object()
        if event.status == EventStatus.CANCELLED:
            raise ValidationError({'status': 'Нельзя завершить отменённое мероприятие.'})

        serializer = EventCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event.status = EventStatus.COMPLETED
        event.save(update_fields=['status', 'updated_at'])

        participants_payload = serializer.validated_data.get('participants', [])
        for item in participants_payload:
            participation = get_object_or_404(EventParticipation, event=event, user_id=item['user_id'])
            participation.status = item['status']
            if item['status'] == ParticipationStatus.ATTENDED and not participation.accepted_at:
                participation.accepted_at = timezone.now()
            participation.responded_at = timezone.now()
            participation.save(update_fields=['status', 'accepted_at', 'responded_at', 'updated_at'])

        return Response({'detail': 'Мероприятие завершено.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        event = self.get_object()
        if event.status == EventStatus.COMPLETED:
            raise ValidationError({'status': 'Нельзя отменить уже завершённое мероприятие.'})
        event.status = EventStatus.CANCELLED
        event.save(update_fields=['status', 'updated_at'])
        event.participations.exclude(status__in=[ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT]).update(
            status=ParticipationStatus.CANCELLED,
            responded_at=timezone.now(),
        )
        return Response({'detail': 'Мероприятие отменено.'})


class EventParticipationViewSet(viewsets.ModelViewSet):
    serializer_class = EventParticipationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'event', 'status']
    ordering_fields = ['id', 'created_at', 'updated_at']

    def get_queryset(self):
        queryset = EventParticipation.objects.select_related('event', 'event__city', 'user', 'user__city', 'user__role')
        user = self.request.user
        if user.role.code in {'volunteer', 'user'}:
            queryset = queryset.filter(user=user)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(event__date_start__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(event__date_start__date__lte=date_to)
        return queryset

    def get_permissions(self):
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated()]
        if self.action == 'create':
            return [IsAuthenticated()]  # users can apply for lectures
        return [IsAdminOrAbove()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class MyEventsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Events the user participates in
        participations = EventParticipation.objects.filter(user=request.user).select_related(
            'event', 'event__city', 'event__event_type',
            'user', 'user__city', 'user__role',
        )
        # Events created by the user (self-created lectures) that may not have a participation
        participated_event_ids = participations.values_list('event_id', flat=True)
        created_events = Event.objects.filter(
            created_by=request.user
        ).exclude(
            id__in=participated_event_ids
        ).select_related('city', 'event_type')

        participation_data = EventParticipationSerializer(participations, many=True).data
        created_data = EventListSerializer(created_events, many=True, context={'request': request}).data

        return Response({
            'participations': participation_data,
            'created': created_data,
        })


class MyStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = EventParticipation.objects.filter(user=request.user)
        events_total = qs.count()
        accepted_events = qs.filter(status=ParticipationStatus.ACCEPTED).count()
        attended_events = qs.filter(status=ParticipationStatus.ATTENDED).count()
        declined_events = qs.filter(status=ParticipationStatus.DECLINED).count()
        absent_events = qs.filter(status=ParticipationStatus.ABSENT).count()
        attendance_rate = round((attended_events / max(accepted_events, 1)) * 100, 2)
        activity_score = attended_events * 10 - absent_events * 3
        serializer = MyStatsSerializer({
            'events_total': events_total,
            'accepted_events': accepted_events,
            'attended_events': attended_events,
            'declined_events': declined_events,
            'absent_events': absent_events,
            'attendance_rate': attendance_rate,
            'activity_score': activity_score,
        })
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def my_participation_accept(request, pk):
    serializer = MyParticipationDecisionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    participation = get_object_or_404(EventParticipation.objects.select_related('event', 'user'), pk=pk, user=request.user)
    if participation.event.status in {EventStatus.CANCELLED, EventStatus.COMPLETED}:
        raise ValidationError({'status': 'Нельзя подтвердить участие в отменённом или завершённом мероприятии.'})
    if participation.status not in {ParticipationStatus.PENDING, ParticipationStatus.DECLINED}:
        raise ValidationError({'status': 'Подтверждение доступно только для ожидающих или отклонённых заявок.'})

    participation.status = ParticipationStatus.ACCEPTED
    participation.accepted_at = timezone.now()
    participation.responded_at = timezone.now()
    if serializer.validated_data.get('comment') is not None:
        participation.comment = serializer.validated_data['comment']
    participation.save(update_fields=['status', 'accepted_at', 'responded_at', 'comment', 'updated_at'])
    return Response({'detail': 'Участие подтверждено.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def my_participation_decline(request, pk):
    serializer = MyParticipationDecisionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    participation = get_object_or_404(EventParticipation.objects.select_related('event', 'user'), pk=pk, user=request.user)
    if participation.event.status in {EventStatus.CANCELLED, EventStatus.COMPLETED}:
        raise ValidationError({'status': 'Нельзя отказаться от участия в отменённом или завершённом мероприятии.'})
    if participation.status not in {ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED}:
        raise ValidationError({'status': 'Отказ доступен только для ожидающих или подтверждённых заявок.'})

    participation.status = ParticipationStatus.DECLINED
    participation.responded_at = timezone.now()
    if serializer.validated_data.get('comment') is not None:
        participation.comment = serializer.validated_data['comment']
    participation.save(update_fields=['status', 'responded_at', 'comment', 'updated_at'])
    return Response({'detail': 'Участие отклонено.'})


class MyParticipationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        participations = EventParticipation.objects.filter(
            user=request.user
        ).select_related('event', 'event__city', 'event__event_type').order_by('-created_at')

        serializer = EventParticipationSerializer(participations, many=True)
        return Response(serializer.data)


class LectureRatingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = LectureRating.objects.select_related('event', 'user', 'user__city').all()
        if user.role.code in {'volunteer', 'user'}:
            return qs.filter(user=user)
        return qs

    def get_serializer_class(self):
        return LectureRatingSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and request.user.role.code not in {'admin', 'superuser'}:
            return Response({'detail': 'Нельзя редактировать чужую оценку.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and request.user.role.code not in {'admin', 'superuser'}:
            return Response({'detail': 'Нельзя удалять чужую оценку.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['tag_type']
    search_fields = ['code', 'title']
    ordering_fields = ['id', 'tag_type', 'title']


class LectureMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = LectureMaterialSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['event', 'material_type']
    ordering_fields = ['id', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = LectureMaterial.objects.select_related('event', 'uploaded_by').all()
        if user.role and user.role.code in {'volunteer', 'user'}:
            qs = qs.filter(event__participations__user=user).distinct()
        return qs

    def get_permissions(self):
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated()]
        return [IsCoordinatorOrAbove()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
