from django.db import models


class City(models.Model):
    title = models.CharField(max_length=255, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title
