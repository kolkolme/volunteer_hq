from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    code = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class GenderChoices(models.TextChoices):
    MALE = 'male', 'Мужской'
    FEMALE = 'female', 'Женский'
    OTHER = 'other', 'Другой'


class User(AbstractUser):
    role = models.ForeignKey('users.Role', on_delete=models.PROTECT, related_name='users', null=True, blank=True)
    city = models.ForeignKey('geography.City', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    contact = models.CharField(max_length=255, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GenderChoices.choices, blank=True)
    photo_url = models.URLField(max_length=1000, blank=True)
    has_permit = models.BooleanField(default=False)
    avg_rating = models.FloatField(default=0.0)

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['city']),
            models.Index(fields=['is_active']),
        ]
        ordering = ['id']

    @property
    def full_name(self):
        value = f'{self.first_name} {self.last_name}'.strip()
        return value or self.username


class VolunteerApplicationStatus(models.TextChoices):
    PENDING = 'pending', 'Ожидает рассмотрения'
    APPROVED = 'approved', 'Одобрена'
    REJECTED = 'rejected', 'Отклонена'


class VolunteerApplication(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='volunteer_applications')
    photo_url = models.URLField(max_length=1000, blank=True)
    specialization = models.CharField(max_length=255, blank=True)
    experience = models.TextField(blank=True)
    about = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=VolunteerApplicationStatus.choices, default=VolunteerApplicationStatus.PENDING, db_index=True)
    reviewed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_applications')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Application by {self.user} — {self.status}'


class ChatRoom(models.Model):
    participants = models.ManyToManyField('users.User', related_name='chat_rooms', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'ChatRoom #{self.pk}'


class Message(models.Model):
    room = models.ForeignKey('users.ChatRoom', on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender} in Room #{self.room_id}: {self.content[:40]}'


class ComplaintStatus(models.TextChoices):
    PENDING = 'pending', 'На рассмотрении'
    ACCEPTED = 'accepted', 'Принята'
    REJECTED = 'rejected', 'Отклонена'


class Complaint(models.Model):
    reporter = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='filed_complaints')
    volunteer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='received_complaints')
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    text = models.TextField()
    status = models.CharField(max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Complaint by {self.reporter} on {self.volunteer} — {self.status}'
