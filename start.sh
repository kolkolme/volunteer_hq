#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# start.sh — полный setup + запуск Volunteer HQ с абсолютного нуля
# Использование: chmod +x start.sh && ./start.sh
# Поддерживаемые ОС: Ubuntu/Debian, Arch, Fedora/RHEL, macOS
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

# ── цвета ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()  { echo -e "${CYAN}${BOLD}[STEP]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── очистка при выходе ────────────────────────────────────────────
cleanup() {
  echo ""
  info "Остановка серверов..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  info "Готово."
}
trap cleanup EXIT INT TERM

# ══════════════════════════════════════════════════════════════════
# БЛОК 1: УСТАНОВКА СИСТЕМНЫХ ПАКЕТОВ
# ══════════════════════════════════════════════════════════════════

# ── определение пакетного менеджера ──────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  elif command -v apt-get &>/dev/null; then
    OS="debian"
  elif command -v pacman &>/dev/null; then
    OS="arch"
  elif command -v dnf &>/dev/null; then
    OS="fedora"
  elif command -v yum &>/dev/null; then
    OS="rhel"
  else
    OS="unknown"
  fi
  info "Обнаружена ОС: $OS"
}

# ── установка Python 3 ────────────────────────────────────────────
install_python() {
  step "Установка Python 3..."
  case "$OS" in
    macos)
      command -v brew &>/dev/null || {
        info "Установка Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      }
      brew install python@3.12
      ;;
    debian)
      sudo apt-get update -qq
      sudo apt-get install -y python3 python3-pip python3-venv
      ;;
    arch)
      sudo pacman -Sy --noconfirm python python-pip
      ;;
    fedora)
      sudo dnf install -y python3 python3-pip
      ;;
    rhel)
      sudo yum install -y python3 python3-pip
      ;;
    *)
      error "Не удалось определить ОС. Установите Python 3.10+ вручную."
      ;;
  esac
}

# ── установка Node.js и npm ───────────────────────────────────────
install_node() {
  step "Установка Node.js и npm..."
  case "$OS" in
    macos)
      brew install node
      ;;
    debian)
      # Node.js 20 LTS через NodeSource
      sudo apt-get install -y curl ca-certificates
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    arch)
      sudo pacman -Sy --noconfirm nodejs npm
      ;;
    fedora)
      sudo dnf install -y nodejs npm
      ;;
    rhel)
      sudo yum install -y nodejs npm
      ;;
    *)
      error "Установите Node.js 18+ вручную: https://nodejs.org"
      ;;
  esac
}

# ── проверка и установка Python ───────────────────────────────────
detect_os

step "Проверка Python..."
if ! command -v python3 &>/dev/null; then
  warn "Python 3 не найден — устанавливаем..."
  install_python
else
  PY_VER=$(python3 -c "import sys; print(sys.version_info.major*10+sys.version_info.minor)")
  if [ "$PY_VER" -lt 38 ]; then
    warn "Python $(python3 --version) слишком старый — устанавливаем новый..."
    install_python
  else
    info "Python уже установлен: $(python3 --version)"
  fi
fi

# ── проверка pip ──────────────────────────────────────────────────
step "Проверка pip..."
if ! python3 -m pip --version &>/dev/null; then
  warn "pip не найден — устанавливаем..."
  case "$OS" in
    macos)   brew install python@3.12 ;;
    debian)  sudo apt-get install -y python3-pip ;;
    arch)    sudo pacman -Sy --noconfirm python-pip ;;
    fedora)  sudo dnf install -y python3-pip ;;
    rhel)    sudo yum install -y python3-pip ;;
    *)       curl -sS https://bootstrap.pypa.io/get-pip.py | python3 ;;
  esac
else
  info "pip уже установлен: $(python3 -m pip --version | cut -d' ' -f1-2)"
fi

# ── проверка Node.js и npm ────────────────────────────────────────
step "Проверка Node.js..."
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
  warn "Node.js/npm не найдены — устанавливаем..."
  install_node
else
  info "Node.js уже установлен: $(node --version)  npm: $(npm --version)"
fi

# ══════════════════════════════════════════════════════════════════
# БЛОК 2: ВИРТУАЛЬНОЕ ОКРУЖЕНИЕ И ЗАВИСИМОСТИ
# ══════════════════════════════════════════════════════════════════

step "Создание виртуального окружения Python..."
VENV="$ROOT/.venv"
if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
  info ".venv создан"
else
  info ".venv уже существует"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"
python -m pip install -q --upgrade pip setuptools wheel
info "pip обновлён: $(pip --version | cut -d' ' -f1-2)"

step "Установка Python-зависимостей..."
pip install -q -r "$ROOT/requirements.txt"
info "Python-зависимости установлены"

# ══════════════════════════════════════════════════════════════════
# БЛОК 3: БАЗА ДАННЫХ
# ══════════════════════════════════════════════════════════════════

cd "$ROOT"

step "Создание миграций..."
python manage.py makemigrations --no-input

step "Применение миграций..."
python manage.py migrate --no-input

step "Проверка демо-данных..."
USER_COUNT=$(python - <<'PYEOF'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.users.models import User
print(User.objects.count())
PYEOF
)
if [ "${USER_COUNT:-0}" -eq 0 ]; then
  info "БД пустая — заполняем демо-данными..."
  python manage.py seed_demo
else
  info "В БД уже ${USER_COUNT} пользователей, seed пропущен."
fi

# ══════════════════════════════════════════════════════════════════
# БЛОК 4: ФРОНТЕНД
# ══════════════════════════════════════════════════════════════════

FRONTEND="$ROOT/frontend"
cd "$FRONTEND"

step "Установка npm-зависимостей..."
if [ ! -d "node_modules" ]; then
  npm install
  info "npm-зависимости установлены"
else
  info "node_modules уже есть, пропускаем npm install"
fi

# ══════════════════════════════════════════════════════════════════
# БЛОК 5: ЗАПУСК
# ══════════════════════════════════════════════════════════════════

step "Запуск Django на http://localhost:8000 ..."
cd "$ROOT"
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
sleep 2
kill -0 "$BACKEND_PID" 2>/dev/null || error "Django не запустился. Проверьте вывод выше."

step "Запуск Vite на http://localhost:5173 ..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!
sleep 2
kill -0 "$FRONTEND_PID" 2>/dev/null || error "Vite не запустился. Проверьте вывод выше."

# ── финальный баннер ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       Volunteer HQ запущен!              ║${NC}"
echo -e "${GREEN}${BOLD}║                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Backend:   http://localhost:8000        ║${NC}"
echo -e "${GREEN}${BOLD}║  Frontend:  http://localhost:5173        ║${NC}"
echo -e "${GREEN}${BOLD}║  Admin:     http://localhost:8000/admin/ ║${NC}"
echo -e "${GREEN}${BOLD}║                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Логин: admin   Пароль: admin12345       ║${NC}"
echo -e "${GREEN}${BOLD}║                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Ctrl+C — остановить всё                 ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

wait


ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

# ── цвета ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── очистка при выходе ─────────────────────────────────────────────
cleanup() {
  echo ""
  info "Остановка серверов..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  info "Готово."
}
trap cleanup EXIT INT TERM

# ── 0. Проверка системных зависимостей ────────────────────────────
step "Проверка системных зависимостей..."
command -v python3 >/dev/null 2>&1 || error "python3 не найден. Установите Python 3.10+"
command -v node    >/dev/null 2>&1 || error "node не найден. Установите Node.js 18+"
command -v npm     >/dev/null 2>&1 || error "npm не найден."

PY_VER=$(python3 -c "import sys; print(sys.version_info.major*10+sys.version_info.minor)")
[ "$PY_VER" -ge 38 ] || error "Нужен Python 3.8+. Текущий: $(python3 --version)"

info "Python: $(python3 --version)  Node: $(node --version)  npm: $(npm --version)"

# ── 1. Виртуальное окружение ──────────────────────────────────────
step "Настройка виртуального окружения..."
VENV="$ROOT/.venv"
if [ ! -d "$VENV" ]; then
  info "Создание .venv..."
  python3 -m venv "$VENV"
fi
# shellcheck source=/dev/null
source "$VENV/bin/activate"
python -m pip install -q --upgrade pip

# ── 2. Python-зависимости ─────────────────────────────────────────
step "Установка Python-зависимостей..."
pip install -q -r "$ROOT/requirements.txt"

# ── 3. Makemigrations + migrate ───────────────────────────────────
step "Создание и применение миграций..."
cd "$ROOT"
python manage.py makemigrations --no-input
python manage.py migrate --no-input

# ── 4. Демо-данные (только если БД пустая) ────────────────────────
step "Проверка демо-данных..."
USER_COUNT=$(python - <<'PYEOF'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.users.models import User
print(User.objects.count())
PYEOF
)
if [ "${USER_COUNT:-0}" -eq 0 ]; then
  info "БД пустая — заполняем демо-данными..."
  python manage.py seed_demo
else
  info "В БД уже ${USER_COUNT} пользователей, seed пропущен."
fi

# ── 5. Django backend ─────────────────────────────────────────────
step "Запуск Django на http://localhost:8000 ..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
# Ждём пока бэкенд поднимется
sleep 2
kill -0 "$BACKEND_PID" 2>/dev/null || error "Django не запустился. Проверьте вывод выше."

# ── 6. npm install ────────────────────────────────────────────────
FRONTEND="$ROOT/frontend"
step "Настройка фронтенда..."
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  info "Установка npm-зависимостей (это займёт минуту)..."
  npm install
else
  info "node_modules уже есть, пропускаем npm install."
fi

# ── 7. Vite frontend ──────────────────────────────────────────────
step "Запуск Vite на http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
sleep 2
kill -0 "$FRONTEND_PID" 2>/dev/null || error "Vite не запустился. Проверьте вывод выше."

# ── 8. Готово ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Volunteer HQ запущен!              ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Backend:   http://localhost:8000        ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:5173        ║${NC}"
echo -e "${GREEN}║  Admin:     http://localhost:8000/admin/ ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Ctrl+C — остановить всё                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

wait
