from rest_framework import serializers


class DashboardSummarySerializer(serializers.Serializer):
    volunteers = serializers.DictField()
    events = serializers.DictField()
    attendance = serializers.DictField()
    staffing = serializers.DictField()
    top_city = serializers.DictField(allow_null=True)


class DashboardActivitySerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    city = serializers.CharField(allow_null=True)
    attended_events = serializers.IntegerField()
    completed_events = serializers.IntegerField()
    activity_score = serializers.IntegerField()


class DashboardCalendarSerializer(serializers.Serializer):
    today = serializers.IntegerField()
    this_week = serializers.IntegerField()
    planned = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class DashboardCityStatsSerializer(serializers.Serializer):
    city_id = serializers.IntegerField()
    city_title = serializers.CharField()
    volunteers_total = serializers.IntegerField()
    active_volunteers = serializers.IntegerField()
    planned_events = serializers.IntegerField()
    completed_events = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
