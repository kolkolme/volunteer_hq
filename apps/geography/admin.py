from django.contrib import admin

from apps.geography.models import City


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'is_active']
    search_fields = ['title']
    list_filter = ['is_active']
