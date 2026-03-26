#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── цвета ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── очистка при выходе ─────────────────────────────────────────────
cleanup() {
  echo ""
  info "Остановка серверов..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  info "Готово."
}
trap cleanup EXIT INT TERM

# ── 1. Python venv ─────────────────────────────────────────────────
VENV="$ROOT/.venv"
if [ ! -d "$VENV" ]; then
  info "Создание виртуального окружения..."
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"

# ── 2. Python зависимости ──────────────────────────────────────────
info "Установка Python-зависимостей..."
pip install -q -r "$ROOT/requirements.txt"

# ── 3. Миграции ────────────────────────────────────────────────────
info "Применение миграций..."
cd "$ROOT"
python manage.py migrate --run-syncdb

# ── 4. Демо-данные (только если БД пустая) ─────────────────────────
USER_COUNT=$(python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from apps.users.models import User
print(User.objects.count())
")
if [ "$USER_COUNT" -eq 0 ]; then
  info "Заполнение демо-данными..."
  python manage.py seed_demo
else
  info "В БД уже есть пользователи ($USER_COUNT), seed пропущен."
fi

# ── 5. Бэкенд ─────────────────────────────────────────────────────
info "Запуск Django на http://localhost:8000 ..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# ── 6. Node зависимости ───────────────────────────────────────────
FRONTEND="$ROOT/frontend"
if [ ! -d "$FRONTEND/node_modules" ]; then
  info "Установка npm-зависимостей..."
  cd "$FRONTEND"
  npm install
fi

# ── 7. Фронтенд ───────────────────────────────────────────────────
info "Запуск Vite на http://localhost:5173 ..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

# ── 8. Ожидание ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backend:  http://localhost:8000${NC}"
echo -e "${GREEN}  Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}  Ctrl+C — остановить всё${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
wait
