from django.db.models import Avg, Count, Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import Role, User, VolunteerApplication, VolunteerApplicationStatus, ChatRoom, Message, Complaint, ComplaintStatus
from apps.events.models import ParticipationStatus, EventStatus


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'code', 'title', 'description']


class UserShortSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'first_name', 'last_name', 'contact', 'is_active', 'photo_url', 'avg_rating']


class UserListSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    events_total = serializers.IntegerField(read_only=True)
    accepted_events = serializers.IntegerField(read_only=True)
    attended_events = serializers.IntegerField(read_only=True)
    completed_events = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'contact', 'is_active',
            'role', 'events_total', 'accepted_events', 'attended_events', 'completed_events',
        ]


class UserDetailSerializer(UserListSerializer):
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ['email', 'date_joined', 'last_login']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'first_name', 'last_name', 'email',
            'role', 'contact', 'is_active',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        role = attrs.get('role', getattr(self.instance, 'role', None))

        # Только superuser и admin могут создавать/редактировать пользователей
        if request and hasattr(request.user, 'role') and request.user.role:
            if request.user.role.code == 'admin':
                if role and role.code == 'superuser':
                    raise serializers.ValidationError({'role': 'Администратор не может назначать роль суперпользователя.'})

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserStatsSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    events_total = serializers.IntegerField()
    accepted_events = serializers.IntegerField()
    attended_events = serializers.IntegerField()
    lectures_count = serializers.IntegerField()
    workshops_count = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    activity_score = serializers.IntegerField()


class MeSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'contact',
            'is_active', 'role', 'birth_date', 'gender', 'photo_url', 'has_permit', 'avg_rating',
        ]


class MeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'contact', 'birth_date', 'gender', 'photo_url']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role.code if user.role else None
        token['has_permit'] = user.has_permit
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data



def with_user_stats(queryset):
    return queryset.select_related('role').annotate(
        events_total=Count('participations', distinct=True),
        accepted_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED), distinct=True),
        attended_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED), distinct=True),
        completed_events=Count('participations', filter=Q(participations__event__status=EventStatus.COMPLETED), distinct=True),
    )


class MessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'created_at', 'is_read']
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']


class ChatRoomSerializer(serializers.ModelSerializer):
    participants = UserShortSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    participant_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = ChatRoom
        fields = ['id', 'participants', 'last_message', 'created_at', 'participant_id']
        read_only_fields = ['id', 'participants', 'last_message', 'created_at']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {'content': msg.content, 'sender': msg.sender.full_name, 'created_at': msg.created_at}
        return None

    def create(self, validated_data):
        other_user = validated_data.pop('participant_id', None)
        request_user = self.context['request'].user
        if other_user:
            # Find existing DM room between these two users
            room = ChatRoom.objects.filter(
                participants=request_user
            ).filter(
                participants=other_user
            ).first()
            if not room:
                room = ChatRoom.objects.create()
                room.participants.set([request_user, other_user])
            return room
        room = ChatRoom.objects.create()
        room.participants.add(request_user)
        return room


class ComplaintSerializer(serializers.ModelSerializer):
    reporter = UserShortSerializer(read_only=True)
    volunteer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__code='volunteer')
    )
    volunteer_detail = UserShortSerializer(source='volunteer', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True, default='')

    class Meta:
        model = Complaint
        fields = ['id', 'reporter', 'volunteer', 'volunteer_detail', 'event', 'event_title', 'text', 'status', 'created_at']
        read_only_fields = ['id', 'reporter', 'status', 'created_at']

    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        validated_data['status'] = ComplaintStatus.PENDING
        return super().create(validated_data)


class VolunteerApplicationSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = VolunteerApplication
        fields = ['id', 'user', 'photo_url', 'specialization', 'experience', 'about', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = VolunteerApplicationStatus.PENDING
        return super().create(validated_data)


class VolunteerApplicationAdminSerializer(serializers.ModelSerializer):
    user = UserShortSerializer(read_only=True)

    class Meta:
        model = VolunteerApplication
        fields = ['id', 'user', 'photo_url', 'specialization', 'experience', 'about', 'status', 'reviewed_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
