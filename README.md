# Volunteer HQ Backend

Готовый backend-каркас на Django 5 + DRF + JWT для штаба волонтёров.

## Стек

- Django 5.x
- Django REST Framework
- SimpleJWT
- django-filter
- django-cors-headers
- SQLite по умолчанию

## Что внутри

- кастомный пользователь с ролью и городом
- справочники: роли, города, типы мероприятий
- мероприятия
- участие волонтёров в мероприятиях
- личные эндпоинты пользователя и волонтёра
- dashboard-эндпоинты для штаба
- JWT-авторизация
- Django admin

## Быстрый старт

```bash
python -m venv .venv
# Activate the virtual environment:
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (cmd):
.venv\Scripts\activate
# On Unix/Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

## Основные URL

- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`
- `POST /api/v1/auth/logout/`
- `GET /api/v1/auth/me/`
- `GET /api/v1/users/`
- `GET /api/v1/events/`
- `GET /api/v1/participations/`
- `GET /api/v1/dashboard/summary/`
- `GET /api/v1/dashboard/activity/`
- `GET /api/v1/dashboard/podium/`
- `GET /api/v1/dashboard/calendar/`
- `GET /api/v1/dashboard/cities/`
- `GET /api/v1/dashboard/problems/`

## Роли

Рекомендуемые системные роли:

- `superuser`
- `admin`
- `volunteer`
- `user`

Команда `python manage.py seed_demo` создаёт их автоматически и синхронизирует старые demo-данные со схемой ролей.

## Примечания

1. В `settings.py` сейчас стоит SQLite и тестовый `SECRET_KEY`.
2. Для production вынеси секреты в переменные окружения.
3. Для фронта на React обычно достаточно хранить `access` и `refresh` токены и обновлять access через refresh.
4. Для больших объёмов данных позже можно вынести dashboard-агрегации в отдельный service layer.


## SQLite и демо-данные

Проект по умолчанию настроен на SQLite (`db.sqlite3`).

### Быстрый старт

```bash
python -m venv .venv
# Activate the virtual environment:
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (cmd):
.venv\Scripts\activate
# On Unix/Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### Тестовые пользователи

- `admin / admin12345` - superuser
- `manager / manager123` - admin
- `admin1 / admin12345` - admin
- `volunteer1 / vol123456` - volunteer
- `user1 / user12345` - user

### Важные улучшения API

- мягкое удаление пользователей через `is_active = false`
- `PATCH /api/v1/auth/me/` для редактирования собственного профиля
- защита от повторного назначения пользователя на одно мероприятие
- корректные переходы статусов для участия и мероприятий
- `my/participations/*` теперь валидируют состояние события и принимают `comment`
- `seed_demo` синхронизирует старые роли `coordinator` и `city_coordinator` в новую схему ролей
