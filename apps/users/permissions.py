from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role.code == 'admin'


class IsCoordinatorOrAbove(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role.code in {'admin', 'coordinator', 'city_coordinator'}


class IsSelfOrCoordinatorOrAbove(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role.code in {'admin', 'coordinator', 'city_coordinator'}:
            return True
        return obj.pk == request.user.pk

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
