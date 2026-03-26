# Volunteer HQ — Project Documentation

## Overview

**Volunteer HQ** is a web platform for managing volunteer lecturers. Volunteers conduct lectures and workshops; regular users attend them. The platform supports scheduling, participation tracking, ratings, complaints, and real-time chat. The application has no geographic dependency — location data (cities, addresses) is not collected or used.

**Stack:** Django 4 + DRF backend, React + Vite frontend, SQLite database, JWT authentication.

---

## Architecture

```
volunteer_hq/
├── manage.py
├── db.sqlite3
├── requirements.txt
├── docs.md                    ← this file
├── config/                    ← Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── users/                 ← Users, roles, auth, chat, complaints
│   ├── events/                ← Events, participations, ratings, materials
│   ├── dashboard/             ← Admin analytics views
│   └── geography/             ← Legacy app (kept for migration history only)
└── frontend/                  ← React SPA
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── pages/
        ├── components/
        ├── context/
        └── services/
```

---

## Backend

### `config/settings.py`

Django settings file. Key configurations:
- `INSTALLED_APPS`: includes all four apps plus DRF, corsheaders, simplejwt, django_filters.
- `AUTH_USER_MODEL = 'users.User'`
- `REST_FRAMEWORK`: uses JWT authentication (JWTAuthentication), PageNumberPagination (page_size=20), DjangoFilterBackend.
- `SIMPLE_JWT`: access token lifetime 7 days, refresh 30 days, custom token serializer class.
- `CORS_ALLOW_ALL_ORIGINS = True` (development only).

---

### `config/urls.py`

Root URL configuration. Registers all DRF router endpoints under `/api/v1/`:

| Prefix | ViewSet | Description |
|--------|---------|-------------|
| `users` | `UserViewSet` | CRUD for users, stats, chat-search, events |
| `events` | `EventViewSet` | CRUD for events, participants, assign-volunteers, rate-volunteer |
| `event-types` | `EventTypeViewSet` | Read-only list of event types |
| `tags` | `TagViewSet` | Read-only list of tags |
| `participations` | `ParticipationViewSet` | Create/update participations |
| `my/participations` | `MyParticipationViewSet` | Current user's participations |
| `my/ratings` | `MyRatingViewSet` | Current user's lecture ratings |
| `volunteer-applications` | `VolunteerApplicationViewSet` | Volunteer upgrade requests |
| `complaints` | `ComplaintViewSet` | File and manage complaints |
| `chats` | `ChatRoomViewSet` | Chat rooms |
| `messages` | `MessageViewSet` | Messages within chat rooms |
| `lecture-materials` | `LectureMaterialViewSet` | Downloadable materials per event |

Custom non-router endpoints:
- `api/v1/auth/register/` — `RegisterView`
- `api/v1/auth/token/` — `CustomTokenObtainPairView` (JWT login)
- `api/v1/auth/token/refresh/` — `TokenRefreshView`
- `api/v1/auth/me/` — `MeView` (profile read/update)
- `api/v1/dashboard/summary/` — `DashboardSummaryView`
- `api/v1/dashboard/activity/` — `DashboardActivityView`
- `api/v1/dashboard/podium/` — `DashboardPodiumView`
- `api/v1/dashboard/calendar/` — `DashboardCalendarView`
- `api/v1/dashboard/problems/` — `DashboardProblemsView`
- `api/v1/dashboard/rating-leaderboard/` — `VolunteerRatingLeaderboardView`

---

## App: `apps/users`

### `apps/users/models.py`

#### `Role`
User role definition.
- `code` (CharField): unique identifier — `superuser`, `admin`, `coordinator`, `volunteer`, `user`
- `title` (CharField): human-readable name
- `level` (IntegerField): hierarchy level (higher = more privileged)

#### `User`
Custom user model extending `AbstractUser`.
- `role` (FK → Role): user's role
- `contact` (CharField): phone or Telegram handle
- `birth_date` (DateField, optional)
- `gender` (CharField): `M` or `F`
- `photo_url` (CharField): profile photo URL
- `has_permit` (BooleanField): whether volunteer has permission to hold lectures (avg_rating ≥ 7.0 required, granted by admin)
- `avg_rating` (FloatField): cached average rating across all lectures

Methods:
- `full_name` (property): `first_name + last_name`

Indexes: `role`, `is_active`

#### `VolunteerApplication`
Application from a regular user to become a volunteer.
- `user` (FK → User)
- `photo_url`, `specialization`, `experience`, `about` (CharField/TextField)
- `status`: `pending` / `approved` / `rejected`
- `created_at`, `reviewed_at`

#### `ChatRoom`
One-on-one chat between two users.
- `participants` (M2M → User)
- `created_at`
- Computed property: `last_message` (most recent Message)

#### `Message`
Individual message within a ChatRoom.
- `room` (FK → ChatRoom)
- `sender` (FK → User)
- `content` (TextField)
- `created_at`
- `is_read` (BooleanField)

#### `Complaint`
Complaint filed by a user about a volunteer-lecturer.
- `reporter` (FK → User, related_name `filed_complaints`)
- `volunteer` (FK → User, related_name `received_complaints`)
- `event` (FK → Event, optional): the lecture the complaint concerns
- `text` (TextField): complaint body
- `status`: `pending` / `accepted` / `rejected`
- `created_at`

---

### `apps/users/serializers.py`

| Serializer | Purpose |
|-----------|---------|
| `RoleSerializer` | Read-only role (id, code, title, level) |
| `UserShortSerializer` | Minimal user info (id, username, full_name, role) |
| `UserListSerializer` | List view with role, avg_rating, has_permit, is_active |
| `UserCreateUpdateSerializer` | Create/update with password hashing |
| `UserStatsSerializer` | Plain serializer for stats endpoint response |
| `MeSerializer` | Full profile for /auth/me/ GET |
| `MeUpdateSerializer` | Partial update fields for /auth/me/ PATCH |
| `CustomTokenObtainPairSerializer` | Adds role, has_permit to JWT payload |
| `VolunteerApplicationSerializer` | Volunteer application CRUD |
| `ComplaintSerializer` | Complaint with reporter/volunteer/event info |
| `ChatRoomSerializer` | Chat room with participants and last_message |
| `MessageSerializer` | Message with sender info |

Helper function `with_user_stats(queryset)`: annotates a User queryset with `attended_events`, `accepted_events`, `events_total`, `lectures_count`, `workshops_count`, `attendance_rate`, `activity_score`.

---

### `apps/users/views.py`

#### `RegisterView` (APIView)
`POST /api/v1/auth/register/`  
Creates a new user with role `user`. Returns JWT tokens.

#### `MeView` (APIView)
`GET /api/v1/auth/me/` — returns current user profile (MeSerializer).  
`PATCH /api/v1/auth/me/` — updates profile fields (MeUpdateSerializer).

#### `UserViewSet` (ModelViewSet)
Endpoint: `/api/v1/users/`  
- List/Retrieve/Update/Destroy users
- Filter: `role`, `is_active`
- Search: `username`, `first_name`, `last_name`, `email`
- Ordering: `username`, `first_name`, `avg_rating`

Extra actions:
- `GET /users/{id}/stats/` — detailed volunteer stats
- `GET /users/{id}/events/` — events for a specific user (uses `with_event_stats`)
- `GET /users/chat_search/?q=` — search users for starting a chat
- `POST /users/{id}/grant_permit/` — grant lecture permit (admin+)
- `POST /users/{id}/revoke_permit/` — revoke lecture permit (admin+)

#### `VolunteerApplicationViewSet` (ModelViewSet)
Endpoint: `/api/v1/volunteer-applications/`  
- Current user's applications. `approve` and `reject` actions for coordinators.

#### `ComplaintViewSet` (ModelViewSet)
Endpoint: `/api/v1/complaints/`  
- Regular users see their own filed complaints.
- Coordinators+ see all complaints.
- `POST /complaints/{id}/accept/` — accept a complaint (coordinator+)
- `POST /complaints/{id}/reject/` — reject a complaint (coordinator+)

#### `ChatRoomViewSet` (ModelViewSet)
Endpoint: `/api/v1/chats/`  
- Lists rooms where current user is a participant.
- `POST` creates/gets a direct chat with target user.

#### `MessageViewSet` (ModelViewSet)
Endpoint: `/api/v1/messages/`  
- Filter by `room`.
- `POST /messages/mark_read/` — mark messages in a room as read.

---

### `apps/users/permissions.py`

Custom DRF permission classes:

| Class | Description |
|-------|-------------|
| `IsAdminOrAbove` | role.level ≥ admin level |
| `IsCoordinatorOrAbove` | role.level ≥ coordinator level |
| `IsSelf` | object is the current user |
| `IsOwnerOrAdmin` | object owner or admin |

---

### `apps/users/admin.py`

Registers `User`, `Role`, `VolunteerApplication`, `ChatRoom`, `Message`, `Complaint` with the Django admin site.

---

### `apps/users/management/commands/seed_demo.py`

Management command: `python manage.py seed_demo`

Creates minimal demo data for development:
- Roles (synchronized via `_sync_roles`)
- 1 superuser (`admin` / `admin12345`)
- 1 admin (`manager` / `manager123`)
- 1 coordinator (`coord1` / `coord123456`)
- 15 volunteers (`volunteer1`–`volunteer15` / `vol123456`)
- 10 visitors (`user1`–`user10` / `user12345`)
- 20 test events (mix of planned/completed/cancelled)
- Random participations for volunteers on events
- EventTypes and Tags (lecture, workshop, online/offline)

---

### `apps/users/management/commands/seed_rich.py`

Management command: `python manage.py seed_rich`

Generates realistic data for a 6-month history:
- Runs `seed_demo` first
- Creates 40 extra volunteers + 400 listeners via `_bulk_users()`
- 100 completed events, 35 planned, 15 cancelled
- Thousands of participations (15–50 attendees per completed event)
- LectureRating entries (~70% of attendees leave a rating)
- Recalculates `avg_rating` for all volunteers

---

## App: `apps/events`

### `apps/events/models.py`

#### `EventType`
- `code` (CharField, unique): e.g. `lecture`, `workshop`
- `title` (CharField): display name

#### `Tag` / `TagType`
- `TagType` choices: `subject`, `format`, `level`
- `Tag`: `tag_type`, `title` (unique together)

#### `Event`
Main event model.
- `event_type` (FK → EventType)
- `title`, `description` (CharField/TextField)
- `date_start`, `date_end` (DateTimeField)
- `status`: `planned` / `ongoing` / `completed` / `cancelled`
- `volunteers_count_min`, `volunteers_count_max` (IntegerField)
- `created_by` (FK → User): the volunteer-lecturer who created it
- `tags` (M2M → Tag via EventTag)

Indexes: `status`, `date_start`, `created_by`

#### `EventStatus` / `ParticipationStatus`
TextChoices enums used across event and participation models.

#### `EventParticipation`
Tracks a user's participation in an event.
- `event` (FK → Event)
- `user` (FK → User)
- `status`: `pending` / `accepted` / `declined` / `attended` / `absent` / `cancelled`
- `comment` (text)
- `accepted_at`, `responded_at` (DateTimeField, optional)

Unique constraint: `(event, user)`

#### `LectureRating`
Rating given by an attendee to a lecture.
- `event` (FK → Event)
- `user` (FK → User, the rater)
- `rating` (IntegerField, 1–10)
- `comment` (TextField, optional)
- `created_at`, `updated_at`

Unique constraint: `(event, user)` — one rating per user per event.

#### `LectureMaterial`
Downloadable material attached to an event.
- `event` (FK → Event)
- `material_type` (CharField): `pdf`, `video`, `link`, `other`
- `title`, `url` (CharField)
- `uploaded_by` (FK → User)

---

### `apps/events/serializers.py`

| Serializer | Purpose |
|-----------|---------|
| `EventTypeSerializer` | Read-only event type |
| `TagSerializer` | Read-only tag with tag_type |
| `EventListSerializer` | Full event info including created_by, tags, participation counts |
| `EventCreateUpdateSerializer` | Create/update events (volunteers can only set their own as creator) |
| `ParticipationSerializer` | EventParticipation with event and user details |
| `MyParticipationSerializer` | Same but from current user's perspective |
| `LectureRatingSerializer` | Rating create/update with event validation |
| `LectureMaterialSerializer` | Material CRUD |

Helper function `with_event_stats(queryset)`: annotates queryset with `total_participants`, `accepted_count`, `attended_count`, `absent_count`, `pending_count`, `rating_count`, `avg_rating_value`.

---

### `apps/events/views.py`

#### `EventViewSet` (ModelViewSet)
Endpoint: `/api/v1/events/`
- Filter: `event_type`, `status`
- Search: `title`, `description`
- Ordering: `date_start`, `date_end`, `title`

Extra actions:
- `GET /events/{id}/participants/` — list participants with status
- `POST /events/{id}/assign_volunteers/` — auto-assign active volunteers to event (admin+)
- `POST /events/{id}/rate_volunteer/` — rate the volunteer-lecturer (attendees only, time-locked: 15 min after event starts, expires 7 days after)

#### `EventTypeViewSet`
`/api/v1/event-types/` — read-only list.

#### `TagViewSet`
`/api/v1/tags/` — read-only, filter by `tag_type`.

#### `ParticipationViewSet`
`/api/v1/participations/` — create participations. Actions: `accept`, `decline`, `mark_attended`, `mark_absent`.

#### `MyParticipationViewSet`
`/api/v1/my/participations/` — current user's participation history.

#### `MyRatingViewSet`
`/api/v1/my/ratings/` — current user's ratings. List, create, update, delete.

#### `VolunteerApplicationViewSet`
`/api/v1/volunteer-applications/` — current user's applications.

#### `LectureMaterialViewSet`
`/api/v1/lecture-materials/` — materials for events. Filter by `event`.

---

### `apps/events/admin.py`

Registers `Event`, `EventParticipation`, `LectureRating`, `EventType`, `Tag`, `LectureMaterial` with Django admin.

---

## App: `apps/dashboard`

### `apps/dashboard/serializers.py`

| Serializer | Purpose |
|-----------|---------|
| `DashboardSummarySerializer` | volunteers, events, attendance, staffing dicts |
| `DashboardActivitySerializer` | Per-user activity: attended_events, completed_events, activity_score |
| `DashboardCalendarSerializer` | today, this_week, planned, completed, cancelled counts |

---

### `apps/dashboard/views.py`

All views require `IsAuthenticated` + `IsAdminOrAbove` unless noted.

#### `DashboardBaseView`
Base class for all dashboard views.

#### `DashboardSummaryView`
`GET /api/v1/dashboard/summary/`  
Returns aggregate stats: volunteer counts (total/active/inactive), event counts by status, attendance rate, staffing issues.

#### `DashboardActivityView`
`GET /api/v1/dashboard/activity/?limit=10`  
Returns top volunteers ranked by attended events and activity score.

#### `DashboardPodiumView`
`GET /api/v1/dashboard/podium/`  
Returns top 3 volunteers (first/second/third) with scores.

#### `DashboardCalendarView`
`GET /api/v1/dashboard/calendar/`  
Returns event counts: today, this week, planned total, completed total, cancelled total.

#### `DashboardProblemsView`
`GET /api/v1/dashboard/problems/`  
Returns: understaffed events (< min volunteers), count of pending participants, count of low-attendance completed events.

#### `VolunteerRatingLeaderboardView`
`GET /api/v1/dashboard/rating-leaderboard/`  
Available to all authenticated users. Returns top-10 volunteers by avg_rating with lecture count and total stars.

---

## App: `apps/geography` (Legacy)

This app contains `City` and `Region` models. It is kept in `INSTALLED_APPS` only to preserve migration history integrity. The app is not exposed via any API endpoint and no other app references it. Geographic data is not used anywhere in the application.

---

## Frontend

### `frontend/src/main.jsx`

Entry point. Wraps the app in `AuthProvider` and `BrowserRouter`.

---

### `frontend/src/App.jsx`

Root component defining all routes:

| Path | Component | Access |
|------|-----------|--------|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/dashboard` | `Dashboard` | Authenticated |
| `/admin` | `AdminDashboard` | admin+ |
| `/coordinator` | `CoordinatorDashboard` | coordinator+ |
| `/profile` | `Profile` | Authenticated |
| `/admin/assign` | `EventAssignment` | admin+ |

---

### `frontend/src/context/AuthContext.jsx`

`AuthContext` and `AuthProvider`. Manages:
- `user` state (decoded from JWT + fetched from `/api/v1/auth/me/`)
- `login(tokens)` — stores tokens, fetches user profile
- `logout()` — clears tokens and user state
- `refreshUser()` — re-fetches `/api/v1/auth/me/`
- `isAuthenticated` — boolean

---

### `frontend/src/services/api.js`

Axios instance configured with:
- `baseURL` pointing to Django dev server
- Request interceptor: attaches `Authorization: Bearer <access_token>`
- Response interceptor: on 401, attempts token refresh; on failure, calls `logout()`

Exported helpers:
- `grantPermit(userId)`, `revokePermit(userId)` — permit management
- `getLeaderboard()` — fetches rating leaderboard
- `getChats()`, `createChat(targetId)`, `getMessages(roomId)`, `sendMessage(roomId, content)`, `markMessagesRead(roomId)`, `searchChatUsers(q)` — chat operations

---

### `frontend/src/pages/Login.jsx`

Login form. Calls `/api/v1/auth/token/`, stores tokens via `AuthContext.login()`, redirects by role.

---

### `frontend/src/pages/Register.jsx`

Registration form. Calls `/api/v1/auth/register/`, then auto-logs in.

---

### `frontend/src/pages/Dashboard.jsx`

Role-aware router component. Redirects to the appropriate dashboard based on `user.role.code`:
- `admin` / `superuser` → `/admin`
- `coordinator` → `/coordinator`
- `volunteer` / `user` → `UserDashboard` (rendered inline)

---

### `frontend/src/pages/UserDashboard.jsx`

Main page for volunteers and regular users. Tabs:
1. **Profile** — edit name, email, contact; display username; tag preferences
2. **Lectures** (upcoming) — browse and apply to planned events; filter by tags and search
3. **History** (past) — attended/absent events with star ratings (1–10) and comments
4. **Volunteer application** — form to apply for volunteer status
5. **Chats** — embedded ChatWidget

State:
- `events` — upcoming planned events
- `pastEvents` — user's attended/absent participations
- `ratings` — map of eventId → rating object
- `availableTags` — for tag filtering
- `profileForm` — profile edit form state
- `volunteerApplication` — current application

---

### `frontend/src/pages/AdminDashboard.jsx`

Admin analytics dashboard. Tabs:
1. **Overview** — summary stats cards, event creation form, bar chart (activity by type), podium of top 3 volunteers, calendar summary, problems/alerts
2. **Permits** — `PermitManagement` component: list volunteers, grant/revoke lecture permits
3. **Rating** — `RatingLeaderboard` component

Fetches from: `dashboard/summary`, `dashboard/activity`, `dashboard/podium`, `dashboard/calendar`, `dashboard/problems`.

---

### `frontend/src/pages/CoordinatorDashboard.jsx`

Coordinator page. Tabs:
1. **Overview** — key metrics
2. **Events** (`EventsTab`) — list + create events
3. **Volunteers** — list of volunteers
4. **Complaints** (`ComplaintsTab`) — pending complaints with accept/reject actions
5. **Chats** — embedded ChatWidget

---

### `frontend/src/pages/EventAssignment.jsx`

Admin-only page for assigning volunteers to events. Fetches planned events, shows current participants, calls `POST /events/{id}/assign_volunteers/`.

---

### `frontend/src/pages/Profile.jsx`

Simple profile view showing current user info.

---

### `frontend/src/components/Layout.jsx`

App shell with navigation sidebar. Shows nav items based on user role. Includes `ThemeToggle` and user info.

---

### `frontend/src/components/ProtectedRoute.jsx`

Wraps routes that require authentication. Redirects to `/login` if not authenticated.

---

### `frontend/src/components/EventCreationForm.jsx`

Multi-step event creation wizard (2 steps).
- Step 1: title, event type, description
- Step 2: date range, volunteer min/max, status
- On success: calls `onEventCreated(event)` callback and resets form

---

### `frontend/src/components/RatingLeaderboard.jsx`

Displays top-10 volunteers by avg_rating in a table. Shows rank (with medal emoji for top 3), full name, avg_rating, lecture count, total stars. For volunteer users, also shows their own rating banner.

---

### `frontend/src/components/ChatWidget.jsx`

Full-featured chat UI embedded in user and coordinator dashboards.
- Sidebar: room list + new chat search
- Chat area: message history with polling every 4s, send form
- Props: `user` (current auth user), `color` (accent color), `height`

---

### `frontend/src/components/ui/`

#### `GlassCard.jsx`
Styled card container with glass-morphism effect.

#### `GlassInput.jsx`
Styled input with glass-morphism styling.

#### `IosButton.jsx`
iOS-style button with gradient and animation.

#### `ThemeToggle.jsx`
Theme/palette switcher. Supports light/dark themes and multiple color palettes. Persists selection in `localStorage`.

---

## API Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

JWT payload includes: `user_id`, `username`, `role` (role code), `has_permit`.

Token endpoints:
- `POST /api/v1/auth/token/` — login
- `POST /api/v1/auth/token/refresh/` — refresh access token

---

## User Roles

| Code | Level | Description |
|------|-------|-------------|
| `superuser` | 5 | Full access, Django superuser |
| `admin` | 4 | Platform admin, can manage all data |
| `coordinator` | 3 | Can manage events, accept/reject complaints and applications |
| `volunteer` | 2 | Volunteer-lecturer, conducts events, can be rated |
| `user` | 1 | Regular attendee, can apply to lectures and leave ratings |

---

## Rating System

- Attendees rate volunteer-lecturers on a 1–10 star scale after attending a lecture.
- Rating window: opens 15 minutes after `date_start`, closes 7 days after `date_start`.
- One rating per user per event.
- Per-volunteer `avg_rating` = average of per-lecture averages (each lecture's average counted equally).
- Volunteers with `avg_rating ≥ 7.0` are eligible to receive a lecture permit (`has_permit`).

---

## Complaint System

- Any authenticated user can file a complaint against a volunteer for a specific event.
- `POST /api/v1/complaints/` with `{ volunteer, event, text }`.
- Complaints have status: `pending` → `accepted` or `rejected`.
- Coordinators and admins can accept/reject via `POST /complaints/{id}/accept/` and `POST /complaints/{id}/reject/`.
- Complaints are shown in the Coordinator dashboard's "Complaints" tab.

---

## Environment Setup

```powershell
# Backend
cd c:\Users\itrot\Desktop\volunteer_hq
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py seed_demo
.venv\Scripts\python.exe manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

### Seed commands

```powershell
# Minimal demo data (~20 events, ~25 users)
.venv\Scripts\python.exe manage.py seed_demo

# Full realistic dataset (~150 events, ~450 users, thousands of ratings)
.venv\Scripts\python.exe manage.py seed_rich
```
