from rest_framework import serializers


class DashboardSummarySerializer(serializers.Serializer):
    volunteers = serializers.DictField()
    events = serializers.DictField()
    attendance = serializers.DictField()
    staffing = serializers.DictField()


class DashboardActivitySerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    attended_events = serializers.IntegerField()
    completed_events = serializers.IntegerField()
    activity_score = serializers.IntegerField()


class DashboardCalendarSerializer(serializers.Serializer):
    today = serializers.IntegerField()
    this_week = serializers.IntegerField()
    planned = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
