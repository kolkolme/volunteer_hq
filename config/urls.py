from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import MeView, RoleViewSet, UserViewSet, CustomTokenObtainPairView, LogoutView, RegisterView
from apps.geography.views import CityViewSet
from apps.events.views import EventTypeViewSet, EventViewSet, EventParticipationViewSet, MyEventsView, MyStatsView, my_participation_accept, my_participation_decline, MyParticipationsView
from apps.dashboard.views import DashboardSummaryView, DashboardActivityView, DashboardPodiumView, DashboardCalendarView, DashboardCitiesView, DashboardProblemsView

router = DefaultRouter()
router.register('roles', RoleViewSet, basename='role')
router.register('cities', CityViewSet, basename='city')
router.register('users', UserViewSet, basename='user')
router.register('event-types', EventTypeViewSet, basename='event-type')
router.register('events', EventViewSet, basename='event')
router.register('participations', EventParticipationViewSet, basename='participation')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/v1/auth/register/', RegisterView.as_view(), name='register'),
    path('api/v1/auth/me/', MeView.as_view(), name='me'),
    path('api/v1/my/events/', MyEventsView.as_view(), name='my-events'),
    path('api/v1/my/stats/', MyStatsView.as_view(), name='my-stats'),
    path('api/v1/my/participations/', MyParticipationsView.as_view(), name='my-participations'),
    path('api/v1/my/participations/<int:pk>/accept/', my_participation_accept, name='my-participation-accept'),
    path('api/v1/my/participations/<int:pk>/decline/', my_participation_decline, name='my-participation-decline'),
    path('api/v1/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('api/v1/dashboard/activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('api/v1/dashboard/podium/', DashboardPodiumView.as_view(), name='dashboard-podium'),
    path('api/v1/dashboard/calendar/', DashboardCalendarView.as_view(), name='dashboard-calendar'),
    path('api/v1/dashboard/cities/', DashboardCitiesView.as_view(), name='dashboard-cities'),
    path('api/v1/dashboard/problems/', DashboardProblemsView.as_view(), name='dashboard-problems'),
    path('api/v1/', include(router.urls)),
]
