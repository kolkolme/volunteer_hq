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


class User(AbstractUser):
    role = models.ForeignKey('users.Role', on_delete=models.PROTECT, related_name='users', null=True, blank=True)
    city = models.ForeignKey('geography.City', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    contact = models.CharField(max_length=255, blank=True)

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
