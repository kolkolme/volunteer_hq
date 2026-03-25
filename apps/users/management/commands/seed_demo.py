from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.events.models import Event, EventParticipation, EventStatus, EventType, ParticipationStatus
from apps.geography.models import City
from apps.users.models import Role, User


class Command(BaseCommand):
    help = 'Создаёт стартовые роли, города, пользователей и тестовые мероприятия.'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seeding demo data...'))

        roles = {
            'admin': ('Администратор', 'Полный доступ к системе'),
            'coordinator': ('Координатор', 'Федеральный координатор'),
            'city_coordinator': ('Городской координатор', 'Координатор одного города'),
            'volunteer': ('Волонтёр', 'Обычный волонтёр'),
        }
        role_objects = {}
        for code, payload in roles.items():
            role_objects[code], _ = Role.objects.get_or_create(
                code=code,
                defaults={'title': payload[0], 'description': payload[1]},
            )

        city_titles = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск']
        city_objects = {}
        for title in city_titles:
            city_objects[title], _ = City.objects.get_or_create(title=title)

        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'role': role_objects['admin'],
                'city': city_objects['Москва'],
                'first_name': 'Системный',
                'last_name': 'Администратор',
                'email': 'admin@example.com',
                'contact': '@admin',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            },
        )
        if created or not admin.check_password('admin12345'):
            admin.set_password('admin12345')
            admin.save(update_fields=['password'])

        coordinator, created = User.objects.get_or_create(
            username='coordinator',
            defaults={
                'role': role_objects['coordinator'],
                'city': city_objects['Москва'],
                'first_name': 'Главный',
                'last_name': 'Координатор',
                'email': 'coordinator@example.com',
                'contact': '@hq_coord',
                'is_staff': True,
                'is_active': True,
            },
        )
        if created or not coordinator.check_password('coord12345'):
            coordinator.set_password('coord12345')
            coordinator.save(update_fields=['password'])

        # Добавляем 5 дополнительных координаторов
        extra_coordinators = []
        for i in range(1, 6):
            username = f'coordinator{i}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role_objects['coordinator'],
                    'city': city_objects['Москва'],
                    'first_name': 'Координатор',
                    'last_name': str(i),
                    'email': f'{username}@example.com',
                    'contact': f'@coord{i}',
                    'is_staff': True,
                    'is_active': True,
                },
            )
            if created or not user.check_password('coord12345'):
                user.set_password('coord12345')
                user.save(update_fields=['password'])
            extra_coordinators.append(user)

        city_coordinators = []
        for index, (city_title, city) in enumerate(city_objects.items(), start=1):
            username = f'citycoord{index}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role_objects['city_coordinator'],
                    'city': city,
                    'first_name': 'Коорд',
                    'last_name': city_title,
                    'email': f'{username}@example.com',
                    'contact': f'@{username}',
                    'is_staff': True,
                    'is_active': True,
                },
            )
            if created or not user.check_password('city12345'):
                user.set_password('city12345')
                user.save(update_fields=['password'])
            city_coordinators.append(user)

        volunteer_names = [
            ('Иван', 'Петров'), ('Анна', 'Соколова'), ('Мария', 'Иванова'), ('Дмитрий', 'Кузнецов'),
            ('Елена', 'Морозова'), ('Алексей', 'Смирнов'), ('Ольга', 'Попова'), ('Никита', 'Орлов'),
            ('София', 'Васильева'), ('Павел', 'Федоров'), ('Алина', 'Новикова'), ('Максим', 'Зайцев'),
            ('Дарья', 'Лебедева'), ('Роман', 'Сергеев'), ('Юлия', 'Крылова'),
        ]
        volunteers = []
        for index, (first_name, last_name) in enumerate(volunteer_names, start=1):
            city = list(city_objects.values())[(index - 1) % len(city_objects)]
            username = f'volunteer{index}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role_objects['volunteer'],
                    'city': city,
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': f'{username}@example.com',
                    'contact': f'+7999000{index:03d}',
                    'is_active': True,
                },
            )
            if created or not user.check_password('vol123456'):
                user.set_password('vol123456')
                user.save(update_fields=['password'])
            volunteers.append(user)

        event_types_data = {
            'lecture': ('Лекция', 'Просветительская лекция'),
            'workshop': ('Мастер-класс', 'Практическое занятие'),
            'meeting': ('Встреча', 'Организационная встреча'),
        }
        event_type_objects = {}
        for code, payload in event_types_data.items():
            event_type_objects[code], _ = EventType.objects.get_or_create(
                code=code,
                defaults={'title': payload[0], 'description': payload[1]},
            )

        now = timezone.now()
        statuses = [EventStatus.PLANNED, EventStatus.PLANNED, EventStatus.COMPLETED, EventStatus.COMPLETED, EventStatus.CANCELLED]
        created_events = []
        for city_index, city in enumerate(city_objects.values(), start=1):
            city_coordinator = city_coordinators[city_index - 1]
            for event_index in range(1, 5):
                event_type = list(event_type_objects.values())[(event_index - 1) % len(event_type_objects)]
                start = now + timedelta(days=(city_index * 2 + event_index - 6), hours=event_index)
                end = start + timedelta(hours=2)
                status_value = statuses[(city_index + event_index - 2) % len(statuses)]
                event, _ = Event.objects.get_or_create(
                    title=f'{event_type.title} #{city_index}-{event_index}',
                    city=city,
                    defaults={
                        'event_type': event_type,
                        'description': f'{event_type.title} для города {city.title}',
                        'address': f'{city.title}, Центральная улица, д. {event_index}',
                        'date_start': start,
                        'date_end': end,
                        'status': status_value,
                        'volunteers_count_min': 2,
                        'volunteers_count_max': 5,
                        'created_by': city_coordinator,
                    },
                )
                created_events.append(event)

        city_to_volunteers = {}
        for volunteer in volunteers:
            city_to_volunteers.setdefault(volunteer.city_id, []).append(volunteer)

        rng = random.Random(42)
        status_pool_active = [ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED, ParticipationStatus.DECLINED]
        status_pool_completed = [ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT, ParticipationStatus.ATTENDED]

        for event in created_events:
            available = city_to_volunteers.get(event.city_id, [])[:]
            rng.shuffle(available)
            for volunteer in available[: rng.randint(2, min(5, len(available)) or 1)]:
                if event.status == EventStatus.COMPLETED:
                    participation_status = rng.choice(status_pool_completed)
                elif event.status == EventStatus.CANCELLED:
                    participation_status = ParticipationStatus.CANCELLED
                else:
                    participation_status = rng.choice(status_pool_active)

                participation, _ = EventParticipation.objects.get_or_create(
                    event=event,
                    user=volunteer,
                    defaults={
                        'status': participation_status,
                        'comment': 'Создано seed-командой',
                    },
                )
                if participation_status in {ParticipationStatus.ACCEPTED, ParticipationStatus.ATTENDED} and not participation.accepted_at:
                    participation.accepted_at = event.date_start - timedelta(days=1)
                if participation_status != ParticipationStatus.PENDING and not participation.responded_at:
                    participation.responded_at = event.date_start - timedelta(days=1)
                participation.save()

        self.stdout.write(self.style.SUCCESS('Demo data created/updated.'))
        self.stdout.write('Users:')
        self.stdout.write('  admin / admin12345')
        self.stdout.write('  coordinator / coord12345')
        self.stdout.write('  citycoord1 / city12345')
        self.stdout.write('  volunteer1 / vol123456')
