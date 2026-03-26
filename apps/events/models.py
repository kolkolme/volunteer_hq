from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class EventType(models.Model):
    code = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class EventStatus(models.TextChoices):
    PLANNED = 'planned', 'Запланировано'
    ONGOING = 'ongoing', 'Идёт'
    COMPLETED = 'completed', 'Завершено'
    CANCELLED = 'cancelled', 'Отменено'


class ParticipationStatus(models.TextChoices):
    PENDING = 'pending', 'Ожидает ответа'
    ACCEPTED = 'accepted', 'Подтверждено'
    DECLINED = 'declined', 'Отказ'
    CANCELLED = 'cancelled', 'Отменено координатором'
    ATTENDED = 'attended', 'Присутствовал'
    ABSENT = 'absent', 'Не пришёл'


class Event(models.Model):
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, related_name='events')
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    date_start = models.DateTimeField(db_index=True)
    date_end = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=20, choices=EventStatus.choices, default=EventStatus.PLANNED, db_index=True)
    volunteers_count_min = models.PositiveIntegerField(default=1)
    volunteers_count_max = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_start', '-id']
        indexes = [
            models.Index(fields=['event_type', 'status']),
        ]

    def clean(self):
        if self.date_end < self.date_start:
            raise ValidationError('Дата окончания не может быть раньше даты начала.')
        if self.volunteers_count_min > self.volunteers_count_max:
            raise ValidationError('Минимум волонтёров не может быть больше максимума.')

    def __str__(self):
        return self.title


class EventParticipation(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='participations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participations')
    status = models.CharField(max_length=20, choices=ParticipationStatus.choices, default=ParticipationStatus.PENDING, db_index=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['event', 'user'], name='unique_event_user_participation'),
        ]
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['event', 'user']),
        ]

    def clean(self):
        if not self.user.is_active:
            raise ValidationError('Нельзя назначить неактивного пользователя.')
        if self.event.status == EventStatus.CANCELLED:
            raise ValidationError('Нельзя назначать участников в отменённое мероприятие.')

    def __str__(self):
        return f'{self.user} -> {self.event}'


class LectureRating(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lecture_ratings')
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['event', 'user'], name='unique_lecture_rating'),
        ]

    def clean(self):
        if not (1 <= self.rating <= 10):
            raise ValidationError('Оценка должна быть от 1 до 10.')

    def __str__(self):
        return f'{self.user} rated {self.event} — {self.rating}/5'


class TagType(models.TextChoices):
    SUBJECT = 'subject', 'Предмет'
    EXPERIENCE = 'experience', 'Стаж волонтёра'
    DURATION = 'duration', 'Длина лекции'
    TIME_SLOT = 'time_slot', 'Время'


class Tag(models.Model):
    code = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    tag_type = models.CharField(max_length=20, choices=TagType.choices, db_index=True)

    class Meta:
        ordering = ['tag_type', 'title']

    def __str__(self):
        return f'[{self.tag_type}] {self.title}'


class EventTag(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='event_tags')
    tag = models.ForeignKey('events.Tag', on_delete=models.CASCADE, related_name='event_tags')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['event', 'tag'], name='unique_event_tag'),
        ]

    def __str__(self):
        return f'{self.event} — {self.tag}'


class MaterialType(models.TextChoices):
    PRESENTATION = 'presentation', 'Презентация'
    TEXT = 'text', 'Текст'
    ASSIGNMENT = 'assignment', 'Задание'
    OTHER = 'other', 'Другое'


class LectureMaterial(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='materials')
    title = models.CharField(max_length=255)
    file_url = models.URLField(max_length=2000)
    material_type = models.CharField(max_length=20, choices=MaterialType.choices, default=MaterialType.OTHER)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='uploaded_materials')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.event})'
