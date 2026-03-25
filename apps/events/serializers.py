from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import serializers

from apps.events.models import EventType, Event, EventParticipation, ParticipationStatus, EventStatus
from apps.users.models import User
from apps.users.serializers import CityShortSerializer, UserShortSerializer


class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = ['id', 'code', 'title', 'description']


class EventListSerializer(serializers.ModelSerializer):
    event_type = EventTypeSerializer(read_only=True)
    city = CityShortSerializer(read_only=True)
    created_by = UserShortSerializer(read_only=True)
    assigned_count = serializers.IntegerField(read_only=True)
    accepted_count = serializers.IntegerField(read_only=True)
    attended_count = serializers.IntegerField(read_only=True)
    free_slots = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'event_type', 'title', 'description', 'address', 'city', 'date_start', 'date_end', 'status',
            'volunteers_count_min', 'volunteers_count_max', 'created_by', 'created_at', 'updated_at',
            'assigned_count', 'accepted_count', 'attended_count', 'free_slots',
        ]


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'event_type', 'title', 'description', 'address', 'city', 'date_start', 'date_end', 'status',
            'volunteers_count_min', 'volunteers_count_max',
        ]

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        date_start = attrs.get('date_start', getattr(instance, 'date_start', None))
        date_end = attrs.get('date_end', getattr(instance, 'date_end', None))
        status_value = attrs.get('status', getattr(instance, 'status', EventStatus.PLANNED))
        volunteers_count_min = attrs.get('volunteers_count_min', getattr(instance, 'volunteers_count_min', 1))
        volunteers_count_max = attrs.get('volunteers_count_max', getattr(instance, 'volunteers_count_max', 1))
        city = attrs.get('city', getattr(instance, 'city', None))

        if date_start and date_end and date_end < date_start:
            raise serializers.ValidationError({'date_end': 'Дата окончания не может быть раньше даты начала.'})
        if volunteers_count_min > volunteers_count_max:
            raise serializers.ValidationError({'volunteers_count_min': 'Минимум волонтёров не может быть больше максимума.'})
        if status_value == EventStatus.ONGOING and date_start and date_start > timezone.now():
            raise serializers.ValidationError({'status': 'Нельзя перевести событие в статус "Идёт" до его начала.'})

        request = self.context.get('request')
        if request and request.user.role.code == 'city_coordinator' and city and request.user.city_id != city.id:
            raise serializers.ValidationError({'city': 'Городской координатор может работать только со своим городом.'})

        if instance and instance.status == EventStatus.CANCELLED and status_value != EventStatus.CANCELLED:
            raise serializers.ValidationError({'status': 'Отменённое мероприятие нельзя изменить обратно через обычное редактирование.'})

        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class EventParticipationSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    event = serializers.PrimaryKeyRelatedField(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.select_related('role', 'city').all(), write_only=True, source='user', required=False)
    event_id = serializers.PrimaryKeyRelatedField(queryset=Event.objects.select_related('city').all(), write_only=True, source='event', required=False)

    class Meta:
        model = EventParticipation
        fields = [
            'id', 'event', 'event_id', 'user', 'user_id', 'status', 'accepted_at',
            'responded_at', 'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['accepted_at', 'responded_at', 'created_at', 'updated_at', 'event']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        event = attrs.get('event', getattr(instance, 'event', None))
        user = attrs.get('user', getattr(instance, 'user', None))
        status_value = attrs.get('status', getattr(instance, 'status', ParticipationStatus.PENDING))
        request = self.context.get('request')

        if not event:
            raise serializers.ValidationError({'event_id': 'Поле event_id обязательно.'})
        if not user:
            raise serializers.ValidationError({'user_id': 'Поле user_id обязательно.'})
        if not user.is_active:
            raise serializers.ValidationError({'user_id': 'Нельзя назначить неактивного пользователя.'})
        if event.status == EventStatus.CANCELLED:
            raise serializers.ValidationError({'event_id': 'Нельзя назначить участника в отменённое мероприятие.'})
        if event.status == EventStatus.COMPLETED and status_value in {ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED}:
            raise serializers.ValidationError({'status': 'Для завершённого мероприятия доступны только финальные статусы.'})

        if instance is None and EventParticipation.objects.filter(event=event, user=user).exists():
            raise serializers.ValidationError({'user_id': 'Этот пользователь уже назначен на мероприятие.'})

        if request and request.user.role.code == 'city_coordinator':
            if event.city_id != request.user.city_id:
                raise serializers.ValidationError({'event_id': 'Городской координатор может работать только с мероприятиями своего города.'})
            if user.city_id != request.user.city_id:
                raise serializers.ValidationError({'user_id': 'Нельзя назначать волонтёров из другого города.'})

        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._apply_status_side_effects(instance, previous_status=None)
        return instance

    def update(self, instance, validated_data):
        previous_status = instance.status
        instance = super().update(instance, validated_data)
        self._apply_status_side_effects(instance, previous_status=previous_status)
        return instance

    def _apply_status_side_effects(self, instance, previous_status=None):
        now = timezone.now()
        update_fields = []

        if instance.status != previous_status and instance.status in {
            ParticipationStatus.ACCEPTED,
            ParticipationStatus.DECLINED,
            ParticipationStatus.CANCELLED,
            ParticipationStatus.ATTENDED,
            ParticipationStatus.ABSENT,
        }:
            instance.responded_at = now
            update_fields.append('responded_at')

        if instance.status in {ParticipationStatus.ACCEPTED, ParticipationStatus.ATTENDED} and not instance.accepted_at:
            instance.accepted_at = now
            update_fields.append('accepted_at')

        if update_fields:
            update_fields.append('updated_at')
            instance.save(update_fields=update_fields)


class EventDetailSerializer(EventListSerializer):
    participants = EventParticipationSerializer(many=True, read_only=True, source='participations')

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + ['participants']


class MyStatsSerializer(serializers.Serializer):
    events_total = serializers.IntegerField()
    accepted_events = serializers.IntegerField()
    attended_events = serializers.IntegerField()
    declined_events = serializers.IntegerField()
    absent_events = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    activity_score = serializers.IntegerField()


class EventParticipantResultSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=[ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT])


class EventCompleteSerializer(serializers.Serializer):
    participants = EventParticipantResultSerializer(many=True, required=False)


class EventStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventStatus.choices)


class MyParticipationDecisionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000)



def with_event_stats(queryset):
    return queryset.select_related('event_type', 'city', 'created_by', 'created_by__city').annotate(
        assigned_count=Count('participations', distinct=True),
        accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED), distinct=True),
        attended_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED), distinct=True),
        free_slots=F('volunteers_count_max') - Count(
            'participations',
            filter=Q(participations__status__in=[
                ParticipationStatus.PENDING,
                ParticipationStatus.ACCEPTED,
                ParticipationStatus.ATTENDED,
            ]),
            distinct=True,
        ),
    ).prefetch_related('participations', 'participations__user', 'participations__user__city')
