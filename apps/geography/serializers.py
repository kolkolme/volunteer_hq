from rest_framework import serializers

from apps.geography.models import City


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'title', 'is_active']
