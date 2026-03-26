"""
seed_rich — генерирует реалистичные данные за ~6 месяцев работы платформы:
    • ~400 обычных пользователей
    • ~40 волонтёров-лекторов
    • 150 мероприятий (прошедшие, запланированные, отменённые)
    • тысячи участий
    • отзывы с оценками (положительные и отрицательные)
"""
import random
from datetime import timedelta, date

from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.events.models import (
    Event, EventParticipation, EventStatus, EventTag, EventType,
    LectureMaterial, LectureRating, MaterialType, ParticipationStatus, Tag, TagType,
)
from apps.geography.models import City
from apps.users.models import Role, User


# ─────────────────────────── Имена ───────────────────────────

FIRST_NAMES_M = [
    'Александр', 'Дмитрий', 'Иван', 'Михаил', 'Андрей', 'Алексей', 'Кирилл',
    'Никита', 'Артём', 'Роман', 'Павел', 'Денис', 'Максим', 'Сергей', 'Олег',
    'Виктор', 'Илья', 'Владимир', 'Егор', 'Тимур', 'Руслан', 'Глеб', 'Лев',
    'Матвей', 'Даниил', 'Арсений', 'Евгений', 'Георгий', 'Константин', 'Антон',
]
FIRST_NAMES_F = [
    'Анастасия', 'Мария', 'Аня', 'Екатерина', 'Ольга', 'Наталья', 'Юлия',
    'Татьяна', 'Елена', 'Дарья', 'Валерия', 'Алина', 'Вика', 'Ксения', 'Полина',
    'Светлана', 'Алёна', 'Кристина', 'Нина', 'Вера', 'Надежда', 'Оксана',
    'Диана', 'Регина', 'Карина', 'Людмила', 'Тамара', 'Галина', 'Зоя', 'Лариса',
]
LAST_NAMES_M = [
    'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов',
    'Новиков', 'Морозов', 'Петров', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев',
    'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв',
    'Фёдоров', 'Михайлов', 'Беляев', 'Тарасов', 'Белов', 'Комаров', 'Орлов',
    'Киселёв', 'Макаров', 'Андреев', 'Ковалёв', 'Ильин', 'Гусев', 'Титов',
    'Кудрявцев', 'Кузьмин', 'Никифоров', 'Щербаков', 'Сорокин', 'Базаров',
]
LAST_NAMES_F = [f[:-1] + 'а' if f.endswith('ов') or f.endswith('ев') else f + 'а'
                for f in LAST_NAMES_M]

# ─────────────────────────── Темы лекций ───────────────────────────

LECTURE_TITLES = [
    'Введение в Python для начинающих',
    'Основы финансовой грамотности: как не разориться',
    'Английский для IT-специалистов',
    'Кибербезопасность в повседневной жизни',
    'Машинное обучение: первые шаги',
    'Как читать финансовую отчётность компании',
    'Грамматика английского: времена глагола',
    'Создание сайтов на HTML и CSS',
    'Инвестиции для начинающих: куда вложить деньги',
    'Docker и контейнеризация — практический курс',
    'Маркетинг в социальных сетях',
    'JavaScript: асинхронность и промисы',
    'Психология общения и переговоров',
    'Алгоритмы и структуры данных',
    'Фотография для новичков',
    'Основы UX/UI дизайна',
    'Blockchain и криптовалюты: мифы и реальность',
    'Разговорный английский: практика с носителями',
    'Введение в Data Science',
    'Личный бренд в интернете',
    'SQL для аналитиков данных',
    'Тайм-менеджмент и продуктивность',
    'Основы React.js',
    'Медицинская грамотность: когда идти к врачу',
    'Публичные выступления без страха',
    'Основы бухгалтерского учёта',
    'Git и командная работа над кодом',
    'Экология и устойчивое развитие',
    'Нейронные сети своими руками',
    'Правовая грамотность для обычных людей',
    'Тестирование ПО: с чего начать',
    'Бизнес на маркетплейсах',
    'Основы Linux для разработчиков',
    'Ораторское мастерство',
    'Финансовое планирование семьи',
    'Vue.js vs React: что выбрать',
    'Карьера в IT с нуля',
    'Полезные привычки и нейронаука',
    'Дизайн логотипов в Figma',
    'Налоги для физических лиц',
    'Kubernetes в production',
    'Эффективное резюме и собеседование',
    'Основы 3D-моделирования',
    'Как работает интернет',
    'Стресс и выгорание: как справиться',
    'NoSQL базы данных',
    'Игровая индустрия: как попасть',
    'Soft skills для технарей',
    'API и REST-архитектура',
    'Ведение личного бюджета в Excel',
]

# ─────────────────────────── Отзывы ───────────────────────────

COMMENTS_POSITIVE = [
    'Отличная лекция, всё разложено по полочкам! Обязательно приду ещё раз.',
    'Лектор великолепно знает тему, объясняет простым языком. Рекомендую всем!',
    'Очень полезно и практично. Сразу же применил знания на работе.',
    'Спасибо за такой интересный материал! Жду продолжения.',
    'Наконец-то нашёл объяснение, которое мне понятно. Браво!',
    'Прекрасно структурированная лекция, ничего лишнего.',
    'Отличный темп — успевал и слушать, и записывать.',
    'Лучшая лекция из тех, что я посещал. 10 из 10.',
    'Живые примеры из практики — это то, чего так не хватает в классических курсах.',
    'Буду рекомендовать друзьям! Очень доступно и по делу.',
    'После этой лекции наконец-то разобрался в теме. Огромное спасибо!',
    'Ведущий очень харизматичный, слушать одно удовольствие.',
    'Именно то, что я искал. Буду ждать новых лекций от этого лектора.',
    'Хорошая подача, много практических советов. Доволен!',
    'Было интересно от начала до конца, не заметил, как пролетело время.',
    'Материал актуальный и хорошо структурированный.',
    'Много полезной информации. Спасибо за ваш труд!',
    'Прекрасная лекция! Узнал много нового и интересного.',
    'Лектор отвечал на все вопросы — это очень ценно.',
    'Отзывчивый ведущий, понятное объяснение. Спасибо!',
]

COMMENTS_NEUTRAL = [
    'В целом неплохо, но хотелось бы больше практических заданий.',
    'Тема интересная, но темп местами слишком быстрый.',
    'Половина лекции была очень полезной, другая половина — менее.',
    'Материал понятный, но ничего принципиально нового для меня.',
    'Нормально. Ждал большего, но всё же полезно.',
    'Неплохая лекция, местами затянуто.',
    'Хорошая база, можно было добавить больше примеров.',
    'Средне. Некоторые моменты очень понравились, другие — нет.',
    'Информации много, но систематизация хромает.',
    'Было интересно, но слишком много теории.',
]

COMMENTS_NEGATIVE = [
    'Лекция не соответствовала описанию. Ожидал совсем другого.',
    'Связь периодически прерывалась, пропустил важные части.',
    'Лектор явно не готовился. Много пустого времени.',
    'Слишком много воды, мало конкретики.',
    'Звук был ужасным, почти ничего не слышал.',
    'Сложно назвать это лекцией — просто чтение текста со слайдов.',
    'Материал устарел. Нужно обновить.',
    'Лектор не умеет отвечать на вопросы. Очень разочарован.',
    'Организация хромает: начали с опозданием на 20 минут.',
    'Было скучно. Тему знаю лучше самого лектора.',
    'Ссылка не работала первые 15 минут. Потерял время.',
    'Уровень не соответствовал заявленному. Для новичков — слишком сложно.',
]

# Распределение оценок (реалистичное — больше высоких, шкала 1-10)
RATING_WEIGHTS = {10: 20, 9: 25, 8: 20, 7: 12, 6: 8, 5: 6, 4: 4, 3: 3, 2: 1, 1: 1}
RATING_POOL = [r for r, w in RATING_WEIGHTS.items() for _ in range(w)]

DESCRIPTIONS = [
    'На этой встрече мы разберём ключевые концепции и ответим на ваши вопросы в прямом эфире.',
    'Практический разбор темы с живыми примерами и кейсами из реальных проектов.',
    'Подходит для начинающих. После лекции вы будете уверенно ориентироваться в теме.',
    'Лекция рассчитана на тех, кто хочет систематизировать свои знания.',
    'Разберём популярные ошибки и научимся их избегать.',
    'Конкретика и практика — никакой воды. Только то, что работает.',
    'Открытый диалог: половина времени — ваши вопросы и ответы лектора.',
    'Исчерпывающий обзор темы с актуальными данными за этот год.',
]


class Command(BaseCommand):
    help = 'Генерирует реалистичные данные за несколько месяцев (тысячи пользователей, отзывы).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Запускаем base seed...'))
        call_command('seed_demo', verbosity=0)
        self.stdout.write(self.style.WARNING('Генерируем rich-данные...'))
        self._run()

    @transaction.atomic
    def _run(self):
        rng = random.Random(1337)

        roles = {r.code: r for r in Role.objects.all()}
        cities = list(City.objects.all())
        event_types = list(EventType.objects.all())
        tags = list(Tag.objects.all())

        now = timezone.now()

        # ── 1. Дополнительные волонтёры ──────────────────────────────
        self.stdout.write('  Создаём волонтёров...')
        extra_volunteers = self._bulk_users(
            rng, roles['volunteer'], cities, 'vol_extra',
            count=40, password='vol123456',
        )

        # ── 2. Обычные пользователи-слушатели ────────────────────────
        self.stdout.write('  Создаём слушателей (~400)...')
        listeners = self._bulk_users(
            rng, roles['user'], cities, 'listener',
            count=400, password='user12345',
        )

        all_volunteers = list(User.objects.filter(role__code='volunteer'))
        all_listeners = list(User.objects.filter(role__code='user'))

        admin_user = User.objects.filter(role__code__in=['admin', 'superuser']).first()

        # ── 3. Мероприятия ────────────────────────────────────────────
        self.stdout.write('  Создаём мероприятия...')
        events_data = []

        # 100 завершённых (от 6 до 1 месяца назад)
        for i in range(100):
            days_ago = rng.randint(30, 180)
            start = now - timedelta(days=days_ago, hours=rng.randint(0, 6))
            end = start + timedelta(hours=rng.randint(1, 3))
            volunteer = rng.choice(all_volunteers)
            city = rng.choice(cities)
            event_type = rng.choice(event_types)
            events_data.append(dict(
                event_type=event_type,
                title=rng.choice(LECTURE_TITLES) + (f' (выпуск {i // 10 + 1})' if i % 10 == 0 else ''),
                description=rng.choice(DESCRIPTIONS),
                address=f'https://meet.google.com/demo-{i:04d}',
                city=city,
                date_start=start,
                date_end=end,
                status=EventStatus.COMPLETED,
                volunteers_count_min=1,
                volunteers_count_max=rng.randint(30, 60),
                created_by=volunteer,
            ))

        # 35 запланированных (следующие 2 месяца)
        for i in range(35):
            days_ahead = rng.randint(1, 60)
            start = now + timedelta(days=days_ahead, hours=rng.randint(9, 20))
            end = start + timedelta(hours=rng.randint(1, 3))
            volunteer = rng.choice(all_volunteers)
            city = rng.choice(cities)
            event_type = rng.choice(event_types)
            events_data.append(dict(
                event_type=event_type,
                title=rng.choice(LECTURE_TITLES),
                description=rng.choice(DESCRIPTIONS),
                address=f'https://zoom.us/demo-upcoming-{i:04d}',
                city=city,
                date_start=start,
                date_end=end,
                status=EventStatus.PLANNED,
                volunteers_count_min=1,
                volunteers_count_max=rng.randint(20, 50),
                created_by=volunteer,
            ))

        # 15 отменённых
        for i in range(15):
            days_ago = rng.randint(10, 120)
            start = now - timedelta(days=days_ago)
            end = start + timedelta(hours=2)
            volunteer = rng.choice(all_volunteers)
            city = rng.choice(cities)
            event_type = rng.choice(event_types)
            events_data.append(dict(
                event_type=event_type,
                title=rng.choice(LECTURE_TITLES),
                description=rng.choice(DESCRIPTIONS),
                address=f'https://meet.example.com/cancelled-{i:04d}',
                city=city,
                date_start=start,
                date_end=end,
                status=EventStatus.CANCELLED,
                volunteers_count_min=1,
                volunteers_count_max=rng.randint(10, 30),
                created_by=volunteer,
            ))

        created_events = []
        for ed in events_data:
            e = Event(**ed)
            e.save()
            created_events.append(e)

        # Привязываем теги к мероприятиям
        if tags:
            subject_tags = [t for t in tags if t.tag_type == TagType.SUBJECT]
            other_tags = [t for t in tags if t.tag_type != TagType.SUBJECT]
            event_tags_bulk = []
            for event in created_events:
                chosen = rng.sample(subject_tags, min(rng.randint(1, 3), len(subject_tags)))
                if other_tags:
                    chosen += rng.sample(other_tags, min(rng.randint(0, 2), len(other_tags)))
                for tag in chosen:
                    event_tags_bulk.append(EventTag(event=event, tag=tag))
            EventTag.objects.bulk_create(event_tags_bulk, ignore_conflicts=True)

        # ── 4. Участия ────────────────────────────────────────────────
        self.stdout.write('  Создаём участия...')
        participations_to_create = []
        seen_ep = set()

        completed_events = [e for e in created_events if e.status == EventStatus.COMPLETED]
        planned_events = [e for e in created_events if e.status == EventStatus.PLANNED]
        cancelled_events = [e for e in created_events if e.status == EventStatus.CANCELLED]

        for event in completed_events:
            # 15–50 слушателей на завершённое мероприятие
            participants = rng.sample(all_listeners, min(rng.randint(15, 50), len(all_listeners)))
            for user in participants:
                key = (event.id, user.id)
                if key in seen_ep:
                    continue
                seen_ep.add(key)
                status_val = rng.choices(
                    [ParticipationStatus.ATTENDED, ParticipationStatus.ABSENT],
                    weights=[80, 20],
                )[0]
                participations_to_create.append(EventParticipation(
                    event=event, user=user,
                    status=status_val,
                    accepted_at=event.date_start - timedelta(days=rng.randint(1, 7)),
                    responded_at=event.date_end + timedelta(hours=1),
                    comment='',
                ))

        for event in planned_events:
            participants = rng.sample(all_listeners, min(rng.randint(5, 25), len(all_listeners)))
            for user in participants:
                key = (event.id, user.id)
                if key in seen_ep:
                    continue
                seen_ep.add(key)
                status_val = rng.choices(
                    [ParticipationStatus.PENDING, ParticipationStatus.ACCEPTED],
                    weights=[40, 60],
                )[0]
                participations_to_create.append(EventParticipation(
                    event=event, user=user,
                    status=status_val,
                    accepted_at=now - timedelta(days=rng.randint(1, 5)) if status_val == ParticipationStatus.ACCEPTED else None,
                    comment='',
                ))

        for event in cancelled_events:
            participants = rng.sample(all_listeners, min(rng.randint(3, 10), len(all_listeners)))
            for user in participants:
                key = (event.id, user.id)
                if key in seen_ep:
                    continue
                seen_ep.add(key)
                participations_to_create.append(EventParticipation(
                    event=event, user=user,
                    status=ParticipationStatus.CANCELLED,
                    comment='',
                ))

        EventParticipation.objects.bulk_create(participations_to_create, batch_size=500, ignore_conflicts=True)
        self.stdout.write(f'    {len(participations_to_create)} участий создано')

        # ── 5. Рейтинги и отзывы ─────────────────────────────────────
        self.stdout.write('  Создаём оценки и отзывы...')
        attended_participations = EventParticipation.objects.filter(
            event__in=completed_events,
            status=ParticipationStatus.ATTENDED,
        ).select_related('user', 'event')

        ratings_to_create = []
        seen_rating = set()
        for p in attended_participations:
            # ~70% оставляют отзыв
            if rng.random() > 0.70:
                continue
            key = (p.event_id, p.user_id)
            if key in seen_rating:
                continue
            seen_rating.add(key)

            rating_val = rng.choice(RATING_POOL)
            if rating_val >= 4:
                comment = rng.choices(
                    COMMENTS_POSITIVE + [''],
                    weights=[3] * len(COMMENTS_POSITIVE) + [2],
                )[0]
            elif rating_val == 3:
                comment = rng.choices(
                    COMMENTS_NEUTRAL + [''],
                    weights=[3] * len(COMMENTS_NEUTRAL) + [3],
                )[0]
            else:
                comment = rng.choices(
                    COMMENTS_NEGATIVE + [''],
                    weights=[3] * len(COMMENTS_NEGATIVE) + [1],
                )[0]

            ratings_to_create.append(LectureRating(
                event=p.event,
                user=p.user,
                rating=rating_val,
                comment=comment,
            ))

        LectureRating.objects.bulk_create(ratings_to_create, batch_size=500, ignore_conflicts=True)
        self.stdout.write(f'    {len(ratings_to_create)} оценок создано')

        # ── 6. Обновляем avg_rating волонтёров ───────────────────────
        self.stdout.write('  Пересчитываем avg_rating лекторов...')
        from django.db.models import Avg
        for volunteer in all_volunteers:
            per_lecture = (
                LectureRating.objects
                .filter(event__created_by=volunteer)
                .values('event')
                .annotate(lecture_avg=Avg('rating'))
            )
            if per_lecture:
                volunteer.avg_rating = round(
                    sum(row['lecture_avg'] for row in per_lecture) / len(per_lecture), 2
                )
            else:
                volunteer.avg_rating = 0.0
            volunteer.save(update_fields=['avg_rating'])

        self.stdout.write(self.style.SUCCESS(
            f'\nГотово!\n'
            f'  Волонтёры: {len(all_volunteers)}\n'
            f'  Слушатели: {len(all_listeners)}\n'
            f'  Мероприятий: {len(created_events)} '
            f'(завершённых={len(completed_events)}, запланированных={len(planned_events)}, отменённых={len(cancelled_events)})\n'
            f'  Участий: {len(participations_to_create)}\n'
            f'  Оценок: {len(ratings_to_create)}\n'
        ))

    # ─────────────────────────── helpers ─────────────────────────────

    def _bulk_users(self, rng, role, cities, prefix, count, password):
        """Создаёт count новых пользователей через bulk_create, пропуская уже существующих."""
        existing = set(User.objects.filter(username__startswith=prefix).values_list('username', flat=True))
        hashed_pw = make_password(password)

        male_pool = list(zip(FIRST_NAMES_M * 20, LAST_NAMES_M * 20))
        female_pool = list(zip(FIRST_NAMES_F * 20, LAST_NAMES_F * 20))
        rng.shuffle(male_pool)
        rng.shuffle(female_pool)
        name_pool = (male_pool + female_pool) * 10
        rng.shuffle(name_pool)

        to_create = []
        for i in range(1, count + 1):
            username = f'{prefix}{i}'
            if username in existing:
                continue
            first_name, last_name = name_pool[i % len(name_pool)]
            city = cities[(i - 1) % len(cities)]
            to_create.append(User(
                username=username,
                password=hashed_pw,
                role=role,
                city=city,
                first_name=first_name,
                last_name=last_name,
                email=f'{username}@example.com',
                contact=f'+79{rng.randint(100000000, 999999999)}',
                is_active=True,
            ))

        created = User.objects.bulk_create(to_create, batch_size=200, ignore_conflicts=True)
        self.stdout.write(f'    Создано {len(created)} ({prefix}*)')
        return list(User.objects.filter(username__startswith=prefix))
