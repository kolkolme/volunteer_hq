from datetime import timedelta

from django.db.models import Count, F, FloatField, IntegerField, Q, Value
from django.db.models.functions import Cast, Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event, EventParticipation, EventStatus, ParticipationStatus
from apps.geography.models import City
from apps.users.permissions import IsAdminOrAbove
from apps.users.models import User


class DashboardBaseView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get_city_filter(self, request):
        city = request.query_params.get('city')
        return int(city) if city else None


class DashboardSummaryView(DashboardBaseView):
    def get(self, request):
        city_id = self.get_city_filter(request)
        users_qs = User.objects.all()
        events_qs = Event.objects.all()
        participations_qs = EventParticipation.objects.all()
        if city_id:
            users_qs = users_qs.filter(city_id=city_id)
            events_qs = events_qs.filter(city_id=city_id)
            participations_qs = participations_qs.filter(event__city_id=city_id)
        current_month = timezone.now().month
        top_city = Event.objects.filter(status=EventStatus.COMPLETED).values('city_id', 'city__title').annotate(
            completed_events=Count('id')
        ).order_by('-completed_events').first()
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
                'avg_rate': round((participations_qs.filter(status=ParticipationStatus.ATTENDED).count() / max(participations_qs.filter(status=ParticipationStatus.ACCEPTED).count(), 1)) * 100, 2),
                'attended_total': participations_qs.filter(status=ParticipationStatus.ATTENDED).count(),
                'absent_total': participations_qs.filter(status=ParticipationStatus.ABSENT).count(),
            },
            'staffing': {
                'understaffed_events': events_qs.annotate(accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED))).filter(accepted_count__lt=F('volunteers_count_min')).count(),
                'overstaffed_events': events_qs.annotate(assigned_count=Count('participations')).filter(assigned_count__gt=F('volunteers_count_max')).count(),
            },
            'top_city': {
                'id': top_city['city_id'],
                'title': top_city['city__title'],
                'completed_events': top_city['completed_events'],
            } if top_city else None,
        }
        return Response(response)


class DashboardActivityView(DashboardBaseView):
    def get(self, request):
        city_id = self.get_city_filter(request)
        limit = int(request.query_params.get('limit', 10))
        qs = User.objects.filter(role__code='volunteer')
        if city_id:
            qs = qs.filter(city_id=city_id)
        leaders = qs.annotate(
            attended_events=Count('participations', filter=Q(participations__status=ParticipationStatus.ATTENDED)),
            completed_events=Count('participations', filter=Q(participations__event__status=EventStatus.COMPLETED)),
        ).order_by('-attended_events', '-completed_events', 'id')[:limit]
        data = [
            {
                'user_id': item.id,
                'full_name': item.full_name,
                'city': item.city.title if item.city else None,
                'attended_events': item.attended_events,
                'completed_events': item.completed_events,
                'activity_score': item.attended_events * 10 + item.completed_events * 2,
            }
            for item in leaders
        ]
        return Response({'leaders': data})


class DashboardPodiumView(DashboardBaseView):
    def get(self, request):
        city_id = self.get_city_filter(request)
        qs = User.objects.filter(role__code='volunteer')
        if city_id:
            qs = qs.filter(city_id=city_id)
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
        city_id = self.get_city_filter(request)
        now = timezone.now()
        week_end = now + timedelta(days=7)
        qs = Event.objects.all()
        if city_id:
            qs = qs.filter(city_id=city_id)
        return Response({
            'today': qs.filter(date_start__date=now.date()).count(),
            'this_week': qs.filter(date_start__gte=now, date_start__lte=week_end).count(),
            'planned': qs.filter(status=EventStatus.PLANNED).count(),
            'completed': qs.filter(status=EventStatus.COMPLETED).count(),
            'cancelled': qs.filter(status=EventStatus.CANCELLED).count(),
        })


class DashboardCitiesView(DashboardBaseView):
    def get(self, request):
        city_id = self.get_city_filter(request)
        cities = City.objects.all()
        if city_id:
            cities = cities.filter(id=city_id)
        data = []
        for city in cities:
            volunteers_total = city.users.filter(role__code='volunteer').count()
            active_volunteers = city.users.filter(role__code='volunteer', is_active=True).count()
            planned_events = city.events.filter(status=EventStatus.PLANNED).count()
            completed_events = city.events.filter(status=EventStatus.COMPLETED).count()
            accepted = EventParticipation.objects.filter(event__city=city, status=ParticipationStatus.ACCEPTED).count()
            attended = EventParticipation.objects.filter(event__city=city, status=ParticipationStatus.ATTENDED).count()
            attendance_rate = round((attended / max(accepted, 1)) * 100, 2)
            data.append({
                'city_id': city.id,
                'city_title': city.title,
                'volunteers_total': volunteers_total,
                'active_volunteers': active_volunteers,
                'planned_events': planned_events,
                'completed_events': completed_events,
                'attendance_rate': attendance_rate,
            })
        return Response(data)


class DashboardProblemsView(DashboardBaseView):
    def get(self, request):
        city_id = self.get_city_filter(request)
        events_qs = Event.objects.annotate(
            accepted_count=Count('participations', filter=Q(participations__status=ParticipationStatus.ACCEPTED)),
        )
        participations_qs = EventParticipation.objects.all()
        if city_id:
            events_qs = events_qs.filter(city_id=city_id)
            participations_qs = participations_qs.filter(event__city_id=city_id)
        understaffed = events_qs.filter(status=EventStatus.PLANNED, accepted_count__lt=F('volunteers_count_min'))[:10]
        data = {
            'understaffed_events': [
                {
                    'event_id': item.id,
                    'title': item.title,
                    'city': item.city.title,
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
