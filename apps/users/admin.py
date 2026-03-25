from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'title']
    search_fields = ['code', 'title']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'username', 'first_name', 'last_name', 'role', 'city', 'is_active']
    list_filter = ['role', 'city', 'is_active', 'is_staff', 'is_superuser']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'contact']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительно', {'fields': ('role', 'city', 'contact')}),
    )
