from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.geography.models import City
from apps.geography.serializers import CitySerializer
from apps.users.permissions import IsAdminOrReadOnly


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['is_active']
    search_fields = ['title']
    ordering_fields = ['id', 'title']
