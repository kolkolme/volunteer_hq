from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.events.models import Event, EventParticipation, EventStatus, EventType, ParticipationStatus, Tag, TagType
from apps.users.models import Role, User


class Command(BaseCommand):
    help = 'Создаёт стартовые роли, города, пользователей и тестовые мероприятия.'

    def _sync_roles(self):
        superuser_role, _ = Role.objects.get_or_create(
            code='superuser',
            defaults={
                'title': 'Суперпользователь',
                'description': 'Полный доступ ко всей системе',
            },
        )
        admin_role, _ = Role.objects.get_or_create(
            code='admin',
            defaults={
                'title': 'Администратор',
                'description': 'Управление мероприятиями и волонтёрами',
            },
        )
        coordinator_role, _ = Role.objects.get_or_create(
            code='coordinator',
            defaults={
                'title': 'Координатор',
                'description': 'Финансовый и организационный координатор',
            },
        )
        volunteer_role, _ = Role.objects.get_or_create(
            code='volunteer',
            defaults={
                'title': 'Волонтёр (лектор)',
                'description': 'Проводит лекции и мероприятия',
            },
        )
        user_role, _ = Role.objects.get_or_create(
            code='user',
            defaults={
                'title': 'Пользователь',
                'description': 'Посетитель лекций',
            },
        )

        admin_role.title = 'Администратор'
        admin_role.description = 'Управление мероприятиями и волонтёрами'
        admin_role.save(update_fields=['title', 'description'])

        coordinator_role.title = 'Координатор'
        coordinator_role.description = 'Финансовый и организационный координатор'
        coordinator_role.save(update_fields=['title', 'description'])

        volunteer_role.title = 'Волонтёр (лектор)'
        volunteer_role.description = 'Проводит лекции и мероприятия'
        volunteer_role.save(update_fields=['title', 'description'])

        legacy_roles = Role.objects.filter(code__in=['city_coordinator'])
        if legacy_roles.exists():
            User.objects.filter(role__code__in=['city_coordinator']).update(role=admin_role)
            legacy_roles.delete()

        User.objects.filter(is_superuser=True).update(role=superuser_role)
        User.objects.filter(role__code='admin', is_superuser=False).update(role=admin_role)

        return {
            'superuser': superuser_role,
            'admin': admin_role,
            'coordinator': coordinator_role,
            'volunteer': volunteer_role,
            'user': user_role,
        }

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Seeding demo data...'))

        role_objects = self._sync_roles()

        # Суперпользователь
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'role': role_objects['superuser'],
                'first_name': 'Системный',
                'last_name': 'Администратор',
                'email': 'admin@example.com',
                'contact': '@admin',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            },
        )
        admin.role = role_objects['superuser']
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_active = True
        admin.save(update_fields=['role', 'is_staff', 'is_superuser', 'is_active'])
        if created or not admin.check_password('admin12345'):
            admin.set_password('admin12345')
            admin.save(update_fields=['password'])

        # Администратор
        admin_user, created = User.objects.get_or_create(
            username='manager',
            defaults={
                'role': role_objects['admin'],
                'first_name': 'Главный',
                'last_name': 'Менеджер',
                'email': 'manager@example.com',
                'contact': '@manager',
                'is_staff': True,
                'is_active': True,
            },
        )
        admin_user.role = role_objects['admin']
        admin_user.is_staff = True
        admin_user.is_active = True
        admin_user.save(update_fields=['role', 'is_staff', 'is_active'])
        if created or not admin_user.check_password('manager123'):
            admin_user.set_password('manager123')
            admin_user.save(update_fields=['password'])

        # Координатор-демо
        coord_user, created = User.objects.get_or_create(
            username='coord1',
            defaults={
                'role': role_objects['coordinator'],
                'first_name': 'Координатор',
                'last_name': 'Демо',
                'email': 'coord1@example.com',
                'contact': '@coord1',
                'has_permit': True,
                'avg_rating': 8.5,
                'is_active': True,
            },
        )
        coord_user.role = role_objects['coordinator']
        coord_user.has_permit = True
        coord_user.is_active = True
        coord_user.save(update_fields=['role', 'has_permit', 'is_active'])
        if created or not coord_user.check_password('coord123456'):
            coord_user.set_password('coord123456')
            coord_user.save(update_fields=['password'])

        volunteer_names = [
            ('Иван', 'Петров'), ('Анна', 'Соколова'), ('Мария', 'Иванова'), ('Дмитрий', 'Кузнецов'),
            ('Елена', 'Морозова'), ('Алексей', 'Смирнов'), ('Ольга', 'Попова'), ('Никита', 'Орлов'),
            ('София', 'Васильева'), ('Павел', 'Федоров'), ('Алина', 'Новикова'), ('Максим', 'Зайцев'),
            ('Дарья', 'Лебедева'), ('Роман', 'Сергеев'), ('Юлия', 'Крылова'),
        ]
        volunteers = []
        for index, (first_name, last_name) in enumerate(volunteer_names, start=1):
            username = f'volunteer{index}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role_objects['volunteer'],
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': f'{username}@example.com',
                    'contact': f'+7999000{index:03d}',
                    'is_active': True,
                },
            )
            user.role = role_objects['volunteer']
            user.is_active = True
            user.save(update_fields=['role', 'is_active'])
            if created or not user.check_password('vol123456'):
                user.set_password('vol123456')
                user.save(update_fields=['password'])
            volunteers.append(user)

        # Обычные пользователи (посетители лекций)
        visitor_names = [
            ('Артём', 'Козлов'), ('Екатерина', 'Белова'), ('Виктор', 'Громов'),
            ('Наталья', 'Степанова'), ('Сергей', 'Маслов'), ('Татьяна', 'Ефимова'),
            ('Андрей', 'Тихонов'), ('Марина', 'Данилова'), ('Кирилл', 'Жуков'),
            ('Валерия', 'Комарова'),
        ]
        visitors = []
        for index, (first_name, last_name) in enumerate(visitor_names, start=1):
            username = f'user{index}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'role': role_objects['user'],
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': f'{username}@example.com',
                    'contact': f'+7999100{index:03d}',
                    'is_active': True,
                },
            )
            user.role = role_objects['user']
            user.is_active = True
            user.save(update_fields=['role', 'is_active'])
            if created or not user.check_password('user12345'):
                user.set_password('user12345')
                user.save(update_fields=['password'])
            visitors.append(user)

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
        for event_index in range(1, 21):
            event_type = list(event_type_objects.values())[(event_index - 1) % len(event_type_objects)]
            start = now + timedelta(days=(event_index - 10), hours=((event_index * 3) % 8 + 9))
            end = start + timedelta(hours=2)
            status_value = statuses[(event_index - 1) % len(statuses)]
            event, _ = Event.objects.get_or_create(
                title=f'{event_type.title} #{event_index}',
                defaults={
                    'event_type': event_type,
                    'description': f'Тестовое {event_type.title.lower()} #{event_index}',
                    'date_start': start,
                    'date_end': end,
                    'status': status_value,
                    'volunteers_count_min': 2,
                    'volunteers_count_max': 5,
                    'created_by': admin_user,
                },
            )
            created_events.append(event)

        rng = random.Random(42)
        status_pool_active = [ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED, ParticipationStatus.DECLINED]
        status_pool_completed = [ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT, ParticipationStatus.ATTENDED]

        for event in created_events:
            shuffled = volunteers[:]
            rng.shuffle(shuffled)
            for volunteer in shuffled[:rng.randint(2, min(5, len(shuffled)))]:
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

        # Demo tags
        tags_data = [
            (TagType.SUBJECT, 'english', 'Английский язык'),
            (TagType.SUBJECT, 'it', 'Информационные технологии'),
            (TagType.SUBJECT, 'finance', 'Финансы'),
            (TagType.SUBJECT, 'ecology', 'Экология'),
            (TagType.EXPERIENCE, 'beginner', 'Для начинающих'),
            (TagType.EXPERIENCE, 'intermediate', 'Средний уровень'),
            (TagType.EXPERIENCE, 'expert', 'Для экспертов'),
            (TagType.DURATION, '30min', '30 минут'),
            (TagType.DURATION, '1h', '1 час'),
            (TagType.DURATION, '2h', '2 часа'),
            (TagType.TIME_SLOT, 'morning', 'Утро'),
            (TagType.TIME_SLOT, 'afternoon', 'День'),
            (TagType.TIME_SLOT, 'evening', 'Вечер'),
        ]
        for tag_type, code, title in tags_data:
            Tag.objects.get_or_create(code=code, defaults={'title': title, 'tag_type': tag_type})

        self.stdout.write(self.style.SUCCESS('Demo data created/updated.'))
        self.stdout.write('Users:')
        self.stdout.write('  admin / admin12345      (superuser)')
        self.stdout.write('  manager / manager123    (admin)')
        self.stdout.write('  coord1 / coord123456    (coordinator, has_permit)')
        self.stdout.write('  volunteer1 / vol123456  (volunteer)')
        self.stdout.write('  user1 / user12345       (user/visitor)')
