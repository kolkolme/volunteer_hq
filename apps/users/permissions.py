from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role and request.user.role.code in {'superuser', 'admin'}


class IsAdminOrAbove(BasePermission):
    """superuser or admin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role and request.user.role.code in {'superuser', 'admin'}


class IsSuperuser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role and request.user.role.code == 'superuser'


class IsSelfOrAdminOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role and request.user.role.code in {'superuser', 'admin'}:
            return True
        return obj.pk == request.user.pk

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsCoordinatorOrAbove(BasePermission):
    """coordinator, admin, or superuser"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role and request.user.role.code in {'superuser', 'admin', 'coordinator'}
