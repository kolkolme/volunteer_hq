#!/usr/bin/env bash
# start.sh - полный setup + запуск Volunteer HQ с абсолютного нуля
# Использование: chmod +x start.sh && ./start.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
step()  { echo -e "${CYAN}${BOLD}[STEP]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

cleanup() {
  echo ""
  info "Остановка серверов..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  info "Готово."
}
trap cleanup EXIT INT TERM

# === БЛОК 1: УСТАНОВКА СИСТЕМНОГО ПО ===

detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then OS="macos"
  elif command -v apt-get &>/dev/null; then OS="debian"
  elif command -v pacman  &>/dev/null; then OS="arch"
  elif command -v dnf     &>/dev/null; then OS="fedora"
  elif command -v yum     &>/dev/null; then OS="rhel"
  else OS="unknown"
  fi
  info "Обнаружена ОС: $OS"
}

install_python() {
  step "Установка Python 3..."
  case "$OS" in
    macos)
      command -v brew &>/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      brew install python@3.12
      ;;
    debian)
      sudo apt-get update -qq
      sudo apt-get install -y python3 python3-pip python3-venv python3-full
      ;;
    arch)    sudo pacman -Sy --noconfirm python python-pip ;;
    fedora)  sudo dnf install -y python3 python3-pip ;;
    rhel)    sudo yum install -y python3 python3-pip ;;
    *)       error "Установите Python 3.10+ вручную." ;;
  esac
}

install_node() {
  step "Установка Node.js и npm..."
  case "$OS" in
    macos)
      brew install node
      ;;
    debian)
      sudo apt-get install -y curl ca-certificates
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    arch)    sudo pacman -Sy --noconfirm nodejs npm ;;
    fedora)  sudo dnf install -y nodejs npm ;;
    rhel)    sudo yum install -y nodejs npm ;;
    *)       error "Установите Node.js 18+ вручную: https://nodejs.org" ;;
  esac
}

detect_os

# --- Python ---
step "Проверка Python..."
if ! command -v python3 &>/dev/null; then
  warn "Python 3 не найден — устанавливаем..."
  install_python
else
  PY_VER=$(python3 -c "import sys; print(sys.version_info.major*10+sys.version_info.minor)")
  if [ "$PY_VER" -lt 38 ]; then
    warn "Python слишком старый — устанавливаем новый..."
    install_python
  else
    info "Python: $(python3 --version)"
  fi
fi

# --- python3-venv (Debian/Ubuntu требует отдельного пакета) ---
step "Проверка python3-venv..."
if [ "$OS" = "debian" ]; then
  PY_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
  PY_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
  VENV_PKG="python${PY_MAJOR}.${PY_MINOR}-venv"
  info "Установка $VENV_PKG и python3-venv..."
  sudo apt-get install -y "$VENV_PKG" python3-venv 2>/dev/null \
    || sudo apt-get install -y python3-venv || true
fi

# --- pip ---
step "Проверка pip..."
if ! python3 -m pip --version &>/dev/null; then
  warn "pip не найден — устанавливаем..."
  case "$OS" in
    debian)  sudo apt-get install -y python3-pip ;;
    arch)    sudo pacman -Sy --noconfirm python-pip ;;
    fedora)  sudo dnf install -y python3-pip ;;
    rhel)    sudo yum install -y python3-pip ;;
    *)       curl -sS https://bootstrap.pypa.io/get-pip.py | python3 ;;
  esac
else
  info "pip: $(python3 -m pip --version | cut -d' ' -f1-2)"
fi

# --- Node.js ---
step "Проверка Node.js..."
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
  warn "Node.js/npm не найдены — устанавливаем..."
  install_node
else
  info "Node.js: $(node --version)  npm: $(npm --version)"
fi

# === БЛОК 2: ВИРТУАЛЬНОЕ ОКРУЖЕНИЕ ===

step "Создание виртуального окружения Python..."
VENV="$ROOT/.venv"

# Удаляем битое окружение (если есть папка, но нет activate)
if [ -d "$VENV" ] && [ ! -f "$VENV/bin/activate" ]; then
  warn "Битое .venv — пересоздаём..."
  rm -rf "$VENV"
fi

if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
  if [ ! -f "$VENV/bin/activate" ]; then
    error "venv создан, но bin/activate не найден. Установите python3-venv:\n  sudo apt-get install python3-venv"
  fi
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

# === БЛОК 3: БАЗА ДАННЫХ ===

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

# === БЛОК 4: ФРОНТЕНД ===

FRONTEND="$ROOT/frontend"
cd "$FRONTEND"

step "Установка npm-зависимостей..."
if [ ! -d "node_modules" ]; then
  npm install
  info "npm-зависимости установлены"
else
  info "node_modules уже есть, пропускаем npm install"
fi

# === БЛОК 5: ЗАПУСК ===

step "Запуск Django на http://localhost:8000 ..."
cd "$ROOT"
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!
sleep 2
kill -0 "$BACKEND_PID" 2>/dev/null || error "Django не запустился."

step "Запуск Vite на http://localhost:5173 ..."
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!
sleep 2
kill -0 "$FRONTEND_PID" 2>/dev/null || error "Vite не запустился."

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       Volunteer HQ запущен!              ║${NC}"
echo -e "${GREEN}${BOLD}║                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Backend:   http://localhost:8000        ║${NC}"
echo -e "${GREEN}${BOLD}║  Frontend:  http://localhost:5173        ║${NC}"
echo -e "${GREEN}${BOLD}║  Admin:     http://localhost:8000/admin/ ║${NC}"
echo -e "${GREEN}${BOLD}║  Логин: admin / admin12345               ║${NC}"
echo -e "${GREEN}${BOLD}║                                          ║${NC}"
echo -e "${GREEN}${BOLD}║  Ctrl+C — остановить всё                 ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

wait