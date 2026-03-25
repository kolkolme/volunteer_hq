# 🚀 Запуск фронтенда Volunteer HQ

## Проблема: экран входа исчезает

Обычно это происходит потому, что:
1. Node.js не установлен
2. npm зависимости не установлены
3. На странице входа остались старые токены в localStorage

## ✅ Решение

### 1️⃣ Установите Node.js

**Скачайте и установите Node.js LTS:**
- Перейдите на https://nodejs.org
- Скачайте версию **LTS** (рекомендуется)
- Запустите установщик и всё установится

**Проверьте установку:**
```powershell
node --version
npm --version
```

Если видите версии — отлично! Если нет — перезагрузитесь или переустановите.

### 2️⃣ Установите зависимости

```powershell
cd c:\Users\itrot\Desktop\volunteer_hq\frontend
npm install
```

### 3️⃣ Запустите фронтенд

```powershell
npm run dev
```

Вы увидите что-то типа:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### 4️⃣ Откройте в браузере

- Перейдите на **http://localhost:5173**
- Откройте DevTools (F12) → **Console**
- Введите логин: `admin`
- Введите пароль: `admin12345`

### 5️⃣ Проверьте логи в Console

В DevTools → Console вы должны увидеть:
```
Login page mount
AuthProvider init, token exists: false
Logging in...
Login successful, tokens: ...
Fetching user...
User fetched: {username: "admin", ...}
```

---

## 🔧 Если всё ещё не работает

### A) Экран входа мигает/пропадает
- Откройте Console (F12)
- Посмотрите красные ошибки
- Проверьте, запущен ли Django сервер на порту 8000
  ```powershell
  python manage.py runserver
  ```

### B) "Failed to fetch user" в логах
- Бэкенд не подключен к фронтенду
- Убедитесь, что https://localhost:8000/api/v1/auth/me/ отвечает
- Попробуйте очистить кэш: откройте Developer Tools → Application → Clear Site Data

### C) "Token invalid" в Console
- Нажмите кнопку "Очистить кэш и перезагрузить" на странице входа
- Или откройте Console и запустите:
  ```javascript
  localStorage.clear()
  location.reload()
  ```

---

## 📋 Структура

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          ← Страница входа
│   │   ├── Dashboard.jsx       ← Главная панель
│   ├── components/
│   │   ├── ui/
│   │   │   ├── GlassCard.jsx   ← iOS glass стиль
│   │   │   ├── IosButton.jsx
│   │   │   ├── GlassInput.jsx
│   ├── context/
│   │   └── AuthContext.jsx     ← Управление авторизацией
│   ├── services/
│   │   └── api.js              ← API запросы
```

---

## 🐛 Диагностика

Все логи выводятся в Console браузера (F12), ищите:
- ✅ "User fetched" = успешный вход
- ❌ "Failed to fetch user" = проблема с API
- ⏳ "ProtectedRoute render" = перенаправление между страницами

---

## 💡 Тестовые учётные записи

```
Админ:       admin / admin12345
Координатор: coordinator / coord12345
Волонтер:    volunteer1 / vol123456
```

---

Если всё ещё не работает, проверьте:
1. Node.js установлен ✓
2. Вы в папке `frontend` ✓
3. Django сервер запущен на 8000 ✓
4. Console открыта для логов ✓

**Good luck! 🚀**
