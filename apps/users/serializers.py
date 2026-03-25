from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import Role, User
from apps.events.models import ParticipationStatus, EventStatus
from apps.geography.models import City


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'code', 'title', 'description']


class CityShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'title']


class UserShortSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    city = CityShortSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'first_name', 'last_name', 'city', 'contact', 'is_active']


class UserListSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    city = CityShortSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    events_total = serializers.IntegerField(read_only=True)
    accepted_events = serializers.IntegerField(read_only=True)
    attended_events = serializers.IntegerField(read_only=True)
    completed_events = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name', 'contact', 'is_active',
            'role', 'city', 'events_total', 'accepted_events', 'attended_events', 'completed_events',
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
            'role', 'city', 'contact', 'is_active',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        role = attrs.get('role', getattr(self.instance, 'role', None))
        city = attrs.get('city', getattr(self.instance, 'city', None))

        if role and role.code == 'city_coordinator' and city is None:
            raise serializers.ValidationError({'city': 'Для городского координатора необходимо указать город.'})

        if request and request.user.role.code == 'city_coordinator':
            if city and request.user.city_id != city.id:
                raise serializers.ValidationError({'city': 'Городской координатор может создавать и редактировать только пользователей своего города.'})
            if role and role.code not in {'volunteer', 'city_coordinator'}:
                raise serializers.ValidationError({'role': 'Городской координатор не может назначать эту роль.'})

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
    city = serializers.CharField(allow_null=True)
    events_total = serializers.IntegerField()
    accepted_events = serializers.IntegerField()
    attended_events = serializers.IntegerField()
    lectures_count = serializers.IntegerField()
    workshops_count = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    activity_score = serializers.IntegerField()


class MeSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    city = CityShortSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'contact', 'is_active', 'role', 'city']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role.code
        token['city_id'] = user.city_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data



def with_user_stats(queryset):
    return queryset.select_related('role', 'city').annotate(
        events_total=Count('participations', distinct=True),
        accepted_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED), distinct=True),
        attended_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED), distinct=True),
        completed_events=Count('participations', filter=Q(participations__event__status=EventStatus.COMPLETED), distinct=True),
    )
