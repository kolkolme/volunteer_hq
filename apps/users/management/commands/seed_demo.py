from datetime import timedelta
import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.events.models import Event, EventParticipation, EventStatus, EventType, LectureRating, ParticipationStatus, Tag, TagType
from apps.users.models import Complaint, ComplaintStatus, Role, User, VolunteerApplication, VolunteerApplicationStatus


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

        # ── Superuser ───────────────────────────────────────────────────
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

        # ── Admin ───────────────────────────────────────────────────────
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

        # ── Coordinator ─────────────────────────────────────────────────
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

        # ── Volunteers ──────────────────────────────────────────────────
        volunteer_names = [
            ('Иван', 'Петров'), ('Анна', 'Соколова'), ('Мария', 'Иванова'),
            ('Дмитрий', 'Кузнецов'), ('Елена', 'Морозова'), ('Алексей', 'Смирнов'),
            ('Ольга', 'Попова'), ('Никита', 'Орлов'), ('София', 'Васильева'),
            ('Павел', 'Федоров'), ('Алина', 'Новикова'), ('Максим', 'Зайцев'),
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

        # ── Visitors (regular users) ────────────────────────────────────
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

        # ── Event types ─────────────────────────────────────────────────
        event_types_data = {
            'lecture':  ('Лекция',       'Просветительская лекция'),
            'workshop': ('Мастер-класс', 'Практическое занятие'),
            'meeting':  ('Встреча',      'Организационная встреча'),
            'seminar':  ('Семинар',      'Научно-практический семинар'),
        }
        event_type_objects = {}
        for code, (title, desc) in event_types_data.items():
            event_type_objects[code], _ = EventType.objects.get_or_create(
                code=code, defaults={'title': title, 'description': desc},
            )

        # ── Tags ────────────────────────────────────────────────────────
        tags_data = [
            (TagType.SUBJECT,     'english',      'Английский язык'),
            (TagType.SUBJECT,     'it',           'Информационные технологии'),
            (TagType.SUBJECT,     'finance',      'Финансы'),
            (TagType.SUBJECT,     'ecology',      'Экология'),
            (TagType.SUBJECT,     'health',       'Здоровье'),
            (TagType.SUBJECT,     'psychology',   'Психология'),
            (TagType.SUBJECT,     'science',      'Наука'),
            (TagType.EXPERIENCE,  'beginner',     'Для начинающих'),
            (TagType.EXPERIENCE,  'intermediate', 'Средний уровень'),
            (TagType.EXPERIENCE,  'expert',       'Для экспертов'),
            (TagType.DURATION,    '30min',        '30 минут'),
            (TagType.DURATION,    '1h',           '1 час'),
            (TagType.DURATION,    '2h',           '2 часа'),
            (TagType.TIME_SLOT,   'morning',      'Утро'),
            (TagType.TIME_SLOT,   'afternoon',    'День'),
            (TagType.TIME_SLOT,   'evening',      'Вечер'),
        ]
        tag_objects = {}
        for tag_type, code, title in tags_data:
            t, _ = Tag.objects.get_or_create(code=code, defaults={'title': title, 'tag_type': tag_type})
            tag_objects[code] = t

        # ── Events ──────────────────────────────────────────────────────
        lecture_titles = [
            ('lecture',  'Введение в финансовую грамотность',               'finance'),
            ('lecture',  'Основы кибербезопасности для школьников',          'it'),
            ('lecture',  'Английский язык: разговорный клуб',                'english'),
            ('lecture',  'Экология и устойчивое развитие',                   'ecology'),
            ('lecture',  'Психология общения и уверенность в себе',          'psychology'),
            ('workshop', 'Мастер-класс по программированию на Python',       'it'),
            ('workshop', 'Финансовое планирование: создаём бюджет',          'finance'),
            ('workshop', 'Публичные выступления и ораторское мастерство',    'psychology'),
            ('lecture',  'Здоровый образ жизни: советы врача',               'health'),
            ('seminar',  'Карьера в IT: как начать путь в технологиях',      'it'),
            ('lecture',  'История России: ключевые события XX века',         'science'),
            ('workshop', 'Мастер-класс по первой медицинской помощи',        'health'),
            ('lecture',  'Инвестиции для начинающих: акции и облигации',     'finance'),
            ('seminar',  'Экологические проблемы современного города',       'ecology'),
            ('lecture',  'Английский для путешественников',                  'english'),
            ('workshop', 'Создание резюме и подготовка к собеседованию',     'psychology'),
            ('lecture',  'Основы машинного обучения без программирования',   'it'),
            ('seminar',  'Волонтёрское движение: опыт и перспективы',        'science'),
            ('lecture',  'Профилактика выгорания: психологический практикум','psychology'),
            ('meeting',  'Организационная встреча волонтёров',               'beginner'),
            ('lecture',  'Цифровая безопасность в социальных сетях',         'it'),
            ('workshop', 'Управление временем: метод GTD',                   'psychology'),
            ('lecture',  'Правовая грамотность для молодёжи',                'science'),
            ('seminar',  'Стартапы и предпринимательство с нуля',            'finance'),
            ('lecture',  'Осознанное потребление и экологичный быт',         'ecology'),
            ('workshop', 'Дизайн-мышление для решения задач',                'it'),
            ('lecture',  'Нейронауки: как работает мозг',                    'science'),
            ('seminar',  'Здоровое питание: мифы и реальность',              'health'),
            ('lecture',  'English Pronunciation Workshop',                    'english'),
            ('meeting',  'Подведение итогов семестра',                       'beginner'),
        ]

        now = timezone.now()
        rng = random.Random(42)
        created_events = []

        for i, (etype_code, title, tag_code) in enumerate(lecture_titles):
            etype = event_type_objects.get(etype_code, event_type_objects['lecture'])
            days_offset = i - 20
            hour = 9 + (i * 2) % 9
            start = now + timedelta(days=days_offset, hours=hour)
            end = start + timedelta(hours=2)

            if days_offset < -3:
                status = EventStatus.COMPLETED
            elif days_offset < 0:
                status = rng.choice([EventStatus.COMPLETED, EventStatus.CANCELLED])
            elif days_offset == 0:
                status = EventStatus.ONGOING
            else:
                status = EventStatus.PLANNED

            event, _ = Event.objects.get_or_create(
                title=title,
                defaults={
                    'event_type': etype,
                    'description': f'Открытое мероприятие для всех желающих. Тема: «{title}». Приходите и приводите друзей!',
                    'date_start': start,
                    'date_end': end,
                    'status': status,
                    'volunteers_count_min': 1,
                    'volunteers_count_max': rng.randint(2, 5),
                    'created_by': admin_user,
                },
            )
            created_events.append((event, tag_code))

        # ── Participations ──────────────────────────────────────────────
        all_participations = []
        for event, tag_code in created_events:
            shuffled = volunteers[:]
            rng.shuffle(shuffled)
            count = rng.randint(2, min(event.volunteers_count_max, len(shuffled)))
            for volunteer in shuffled[:count]:
                if event.status == EventStatus.COMPLETED:
                    p_status = rng.choices(
                        [ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT],
                        weights=[4, 1],
                    )[0]
                elif event.status == EventStatus.CANCELLED:
                    p_status = ParticipationStatus.CANCELLED
                elif event.status == EventStatus.ONGOING:
                    p_status = ParticipationStatus.ACCEPTED
                else:
                    p_status = rng.choices(
                        [ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED, ParticipationStatus.DECLINED],
                        weights=[3, 4, 1],
                    )[0]

                part, _ = EventParticipation.objects.get_or_create(
                    event=event,
                    user=volunteer,
                    defaults={'status': p_status, 'comment': 'Создано seed-командой'},
                )
                if p_status in {ParticipationStatus.ACCEPTED, ParticipationStatus.ATTENDED}:
                    if not part.accepted_at:
                        part.accepted_at = event.date_start - timedelta(days=1)
                if p_status != ParticipationStatus.PENDING:
                    if not part.responded_at:
                        part.responded_at = event.date_start - timedelta(days=1)
                part.save()
                all_participations.append(part)

        # ── Ratings / Reviews ───────────────────────────────────────────
        rating_comments = [
            'Отличная лекция, очень доступно объяснено!',
            'Лектор прекрасно владеет материалом, рекомендую.',
            'Было интересно, но хотелось бы больше практики.',
            'Очень полезно, многое узнал нового.',
            'Прекрасная подача материала, живо и понятно.',
            'Немного затянуто, но содержательно.',
            'Отличный спикер, задавал много вопросов аудитории.',
            'Хорошая лекция, приду ещё раз.',
            'Материал актуальный, лектор энергичный.',
            'Всё понравилось, спасибо организаторам!',
            'Было немного скучновато, ожидал больше интерактива.',
            'Очень компетентный лектор, чётко и по существу.',
            'Узнал то, чего давно хотел узнать. Спасибо!',
            'Хорошо структурированная лекция.',
            'Лектор отвечал на все вопросы, молодец!',
        ]

        for event, tag_code in created_events:
            if event.status not in {EventStatus.COMPLETED, EventStatus.CANCELLED}:
                continue
            # Visitors rate completed events
            shuffled_visitors = visitors[:]
            rng.shuffle(shuffled_visitors)
            for visitor in shuffled_visitors[:rng.randint(3, min(8, len(shuffled_visitors)))]:
                rating_val = rng.choices(
                    [6, 7, 8, 9, 10],
                    weights=[1, 2, 4, 5, 3],
                )[0] if event.status == EventStatus.COMPLETED else rng.randint(1, 5)
                LectureRating.objects.get_or_create(
                    event=event,
                    user=visitor,
                    defaults={
                        'rating': rating_val,
                        'comment': rng.choice(rating_comments),
                    },
                )

        # ── Recalculate volunteer avg_rating ───────────────────────────
        for volunteer in volunteers:
            participated_events = EventParticipation.objects.filter(
                user=volunteer,
                status=ParticipationStatus.ATTENDED,
            ).values_list('event_id', flat=True)
            ratings = LectureRating.objects.filter(event_id__in=participated_events)
            if ratings.exists():
                avg = sum(r.rating for r in ratings) / ratings.count()
                volunteer.avg_rating = round(avg, 2)
                volunteer.has_permit = avg >= 7.0
            else:
                volunteer.avg_rating = round(rng.uniform(5.5, 9.5), 2)
                volunteer.has_permit = volunteer.avg_rating >= 7.0
            volunteer.save(update_fields=['avg_rating', 'has_permit'])

        # ── Volunteer Applications ──────────────────────────────────────
        app_specializations = [
            'Математика и физика', 'Английский язык', 'Программирование',
            'Биология и химия', 'История и обществознание', 'Психология',
            'Финансовая грамотность', 'Экология', 'Медицина и здоровье',
        ]
        app_experiences = [
            'Провёл более 20 лекций в школах города. Имею опыт работы с аудиторией разного возраста.',
            'Кандидат наук, работаю педагогом 5 лет. Готов делиться знаниями.',
            'Преподаю в университете, хочу расширить охват аудитории через волонтёрство.',
            'Прошёл специализированные курсы, есть сертификаты. Хочу помогать людям учиться.',
            'Работаю в IT-сфере, умею объяснять сложные вещи простым языком.',
            'Freelance-консультант, готов проводить практические мастер-классы.',
        ]
        app_statuses = [
            VolunteerApplicationStatus.PENDING,
            VolunteerApplicationStatus.PENDING,
            VolunteerApplicationStatus.APPROVED,
            VolunteerApplicationStatus.APPROVED,
            VolunteerApplicationStatus.REJECTED,
        ]
        for i, visitor in enumerate(visitors):
            VolunteerApplication.objects.get_or_create(
                user=visitor,
                defaults={
                    'specialization': rng.choice(app_specializations),
                    'experience': rng.choice(app_experiences),
                    'about': f'Хочу внести вклад в образование и помочь людям получить новые знания. '
                             f'Готов участвовать в мероприятиях на регулярной основе.',
                    'status': app_statuses[i % len(app_statuses)],
                    'reviewed_by': admin_user if app_statuses[i % len(app_statuses)] != VolunteerApplicationStatus.PENDING else None,
                },
            )

        # ── Complaints ──────────────────────────────────────────────────
        complaint_texts = [
            'Лектор опоздал на 20 минут и не предупредил организаторов.',
            'Материал был не подготовлен, лекция прошла хаотично.',
            'Волонтёр общался грубо с участниками мероприятия.',
            'Лектор не ответил ни на один вопрос из аудитории.',
            'Презентация была взята из интернета без изменений, без собственного контента.',
            'Волонтёр не пришёл на мероприятие и не предупредил заранее.',
            'Лекция была прочитана слишком быстро, аудитория не успевала воспринимать.',
            'Несоответствие заявленной темы реальному содержанию лекции.',
        ]
        complaint_statuses = [
            ComplaintStatus.PENDING,
            ComplaintStatus.PENDING,
            ComplaintStatus.PENDING,
            ComplaintStatus.ACCEPTED,
            ComplaintStatus.ACCEPTED,
            ComplaintStatus.REJECTED,
        ]
        completed_events = [e for e, _ in created_events if e.status == EventStatus.COMPLETED]
        for i, visitor in enumerate(visitors[:8]):
            target_volunteer = volunteers[i % len(volunteers)]
            event_for_complaint = completed_events[i % len(completed_events)] if completed_events else None
            Complaint.objects.get_or_create(
                reporter=visitor,
                volunteer=target_volunteer,
                event=event_for_complaint,
                defaults={
                    'text': complaint_texts[i % len(complaint_texts)],
                    'status': complaint_statuses[i % len(complaint_statuses)],
                },
            )

        self.stdout.write(self.style.SUCCESS('Demo data created/updated successfully!'))
        self.stdout.write('')
        self.stdout.write('Accounts:')
        self.stdout.write('  admin      / admin12345    (superuser)')
        self.stdout.write('  manager    / manager123    (admin)')
        self.stdout.write('  coord1     / coord123456   (coordinator)')
        self.stdout.write('  volunteer1 / vol123456     (volunteer)')
        self.stdout.write('  user1      / user12345     (user/visitor)')
        self.stdout.write('')
        self.stdout.write(f'Events:    {len(created_events)}')
        self.stdout.write(f'Ratings:   {LectureRating.objects.count()}')
        self.stdout.write(f'Complaints:{Complaint.objects.count()}')
        self.stdout.write(f'Applications:{VolunteerApplication.objects.count()}')
