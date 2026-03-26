from datetime import timedelta

from django.db.models import Avg, Count, F, FloatField, IntegerField, Q, Sum, Value
from django.db.models.functions import Cast, Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event, EventParticipation, EventStatus, LectureRating, ParticipationStatus
from apps.users.permissions import IsAdminOrAbove
from apps.users.models import User


class DashboardBaseView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]


class DashboardSummaryView(DashboardBaseView):
    def get(self, request):
        users_qs = User.objects.all()
        events_qs = Event.objects.all()
        participations_qs = EventParticipation.objects.all()
        current_month = timezone.now().month
        response = {
            'volunteers': {
                'total': users_qs.filter(role__code='volunteer').count(),
                'active': users_qs.filter(role__code='volunteer', is_active=True).count(),
                'inactive': users_qs.filter(role__code='volunteer', is_active=False).count(),
            },
            'events': {
                'planned': events_qs.filter(status=EventStatus.PLANNED).count(),
                'ongoing': events_qs.filter(status=EventStatus.ONGOING).count(),
                'completed_this_month': events_qs.filter(status=EventStatus.COMPLETED, date_start__month=current_month).count(),
                'cancelled_this_month': events_qs.filter(status=EventStatus.CANCELLED, date_start__month=current_month).count(),
            },
            'attendance': {
                'avg_rate': min(round((participations_qs.filter(status=ParticipationStatus.ATTENDED).count() / max(participations_qs.filter(status=ParticipationStatus.ACCEPTED).count(), 1)) * 100, 2), 100),
                'attended_total': participations_qs.filter(status=ParticipationStatus.ATTENDED).count(),
                'absent_total': participations_qs.filter(status=ParticipationStatus.ABSENT).count(),
            },
            'staffing': {
                'understaffed_events': events_qs.annotate(accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED))).filter(accepted_count__lt=F('volunteers_count_min')).count(),
                'overstaffed_events': events_qs.annotate(assigned_count=Count('participations')).filter(assigned_count__gt=F('volunteers_count_max')).count(),
            },
        }
        return Response(response)


class DashboardActivityView(DashboardBaseView):
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        qs = User.objects.filter(role__code='volunteer')
        leaders = qs.annotate(
            attended_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED)),
            completed_events=Count('participations', filter=Q(participations__event__status=EventStatus.COMPLETED)),
        ).order_by('-attended_events', '-completed_events', 'id')[:limit]
        data = [
            {
                'user_id': item.id,
                'full_name': item.full_name,
                'attended_events': item.attended_events,
                'completed_events': item.completed_events,
                'activity_score': item.attended_events * 10 + item.completed_events * 2,
            }
            for item in leaders
        ]
        return Response({'leaders': data})


class DashboardPodiumView(DashboardBaseView):
    def get(self, request):
        qs = User.objects.filter(role__code='volunteer')
        leaders = list(qs.annotate(
            attended_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED)),
        ).order_by('-attended_events', 'id')[:3])
        slots = ['first', 'second', 'third']
        result = {}
        for index, slot in enumerate(slots):
            result[slot] = None
            if index < len(leaders):
                result[slot] = {
                    'user_id': leaders[index].id,
                    'full_name': leaders[index].full_name,
                    'score': leaders[index].attended_events * 10,
                }
        return Response(result)


class DashboardCalendarView(DashboardBaseView):
    def get(self, request):
        now = timezone.now()
        week_end = now + timedelta(days=7)
        qs = Event.objects.all()
        return Response({
            'today': qs.filter(date_start__date=now.date()).count(),
            'this_week': qs.filter(date_start__gte=now, date_start__lte=week_end).count(),
            'planned': qs.filter(status=EventStatus.PLANNED).count(),
            'completed': qs.filter(status=EventStatus.COMPLETED).count(),
            'cancelled': qs.filter(status=EventStatus.CANCELLED).count(),
        })


class DashboardProblemsView(DashboardBaseView):
    def get(self, request):
        events_qs = Event.objects.annotate(
            accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED)),
        )
        participations_qs = EventParticipation.objects.all()
        understaffed = events_qs.filter(status=EventStatus.PLANNED, accepted_count__lt=F('volunteers_count_min'))[:10]
        data = {
            'understaffed_events': [
                {
                    'event_id': item.id,
                    'title': item.title,
                    'date_start': item.date_start,
                    'volunteers_needed': item.volunteers_count_min - item.accepted_count,
                }
                for item in understaffed
            ],
            'no_response_participants': participations_qs.filter(status=ParticipationStatus.PENDING).count(),
            'low_attendance_events': Event.objects.filter(status=EventStatus.COMPLETED).annotate(
                attended_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED)),
                accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED)),
            ).filter(accepted_count__gt=0, attended_count__lt=F('accepted_count')).count(),
        }
        return Response(data)


class VolunteerRatingLeaderboardView(APIView):
    """Top-10 volunteers by rating. Available to all authenticated users."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        volunteers = User.objects.filter(
            role__code='volunteer',
            is_active=True,
        ).annotate(
            lecture_count=Count('created_events', distinct=True),
            total_stars=Coalesce(Sum('created_events__ratings__rating'), Value(0)),
        ).filter(lecture_count__gt=0).order_by('-avg_rating', '-lecture_count')[:10]

        data = [
            {
                'rank': idx + 1,
                'full_name': v.full_name,
                'avg_rating': round(v.avg_rating, 2),
                'lecture_count': v.lecture_count,
                'total_stars': v.total_stars,
            }
            for idx, v in enumerate(volunteers)
        ]
        return Response({'leaderboard': data})
