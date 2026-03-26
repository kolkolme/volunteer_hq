from django.contrib import admin

from apps.events.models import Event, EventParticipation, EventType, LectureRating


@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'title']
    search_fields = ['code', 'title']


class EventParticipationInline(admin.TabularInline):
    model = EventParticipation
    extra = 0


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'event_type', 'city', 'date_start', 'status']
    search_fields = ['title', 'address']
    list_filter = ['status', 'event_type', 'city']
    inlines = [EventParticipationInline]


@admin.register(EventParticipation)
class EventParticipationAdmin(admin.ModelAdmin):
    list_display = ['id', 'event', 'user', 'status', 'accepted_at', 'responded_at']
    list_filter = ['status', 'event__city']
    search_fields = ['event__title', 'user__username', 'user__first_name', 'user__last_name']


@admin.register(LectureRating)
class LectureRatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'event', 'user', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['event__title', 'user__username']
