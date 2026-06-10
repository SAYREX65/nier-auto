# README.md

```markdown
# Nier:auto — Платформа для покупки и продажи автозапчастей

Дипломный проект. Fullstack веб-приложение на React + TypeScript + Express + SQLite.

---

## 🛠 Технологический стек

### Клиент
- React 18 + TypeScript
- React Router v6
- Axios
- Vite

### Сервер
- Node.js + Express
- TypeScript
- better-sqlite3 (SQLite)
- JWT авторизация
- bcryptjs

---

## 📁 Структура проекта

```
nier-auto/
├── client/                  # React приложение
│   ├── src/
│   │   ├── api/             # Axios клиент
│   │   ├── components/      # Общие компоненты (Header, Footer, ProductCard)
│   │   ├── hooks/           # useAuth, useCart
│   │   ├── pages/           # Все страницы
│   │   ├── styles/          # Глобальные стили
│   │   └── types/           # TypeScript типы
│   ├── index.html
│   └── vite.config.ts
│
├── server/                  # Express сервер
│   ├── db/                  # База данных и миграции
│   ├── middleware/          # JWT middleware
│   ├── routes/              # API маршруты
│   └── types/               # TypeScript типы
│
├── .env                     # Переменные окружения
└── package.json
```

---

## ⚙️ Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/your-repo/nier-auto.git
cd nier-auto
```

### 2. Установить все зависимости

```bash
npm run install:all
```

Или вручную:

```bash
# Корневые зависимости
npm install

# Зависимости клиента
cd client
npm install

# Зависимости сервера
cd ../server
npm install
```

### 3. Настроить переменные окружения

Создай файл `.env` в корне папки `server/`:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=nier_auto_super_secret_key_2024
DB_PATH=./server/db/nier_auto.db
USE_AI_MOCK=true
```

### 4. Запустить проект

#### Способ 1 — оба сервера одной командой (из корня):
```bash
npm run dev
```

#### Способ 2 — раздельно:

**Терминал 1 — сервер:**
```bash
cd server
npx ts-node-dev --respawn --transpile-only index.ts
```

**Терминал 2 — клиент:**
```bash
cd client
npm run dev
```

### 5. Открыть в браузере

```
http://localhost:3000
```

---

## 👤 Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@nier.auto | admin123 |
| Продавец 1 | seller1@nier.auto | seller123 |
| Продавец 2 | seller2@nier.auto | seller123 |
| Покупатель 1 | buyer1@nier.auto | buyer123 |
| Покупатель 2 | buyer2@nier.auto | buyer123 |

---

## 🖼 Как добавить изображения товаров

Есть **3 способа** добавить изображение к товару:

---

### Способ 1 — Ссылка на внешнее изображение (самый простой)

При добавлении товара в поле **"Ссылка на изображение"** вставь прямую ссылку:

```
https://example.com/image.jpg
```

Примеры бесплатных источников изображений:

| Сервис | Пример ссылки |
|--------|--------------|
| Unsplash | `https://images.unsplash.com/photo-xxx` |
| Imgur | `https://i.imgur.com/xxxxx.jpg` |
| Google Images | Нажми на фото → Открыть изображение → скопируй URL |

---

### Способ 2 — Локальные изображения через папку public

1. Создай папку `client/public/images/`
2. Положи туда изображение, например `brake-disc.jpg`
3. В поле изображения товара укажи:

```
/images/brake-disc.jpg
```

**Структура папки:**
```
client/
└── public/
    └── images/
        ├── brake-disc.jpg
        ├── filter.jpg
        ├── shock-absorber.jpg
        └── ...
```

---

### Способ 3 — Через папку uploads на сервере

1. Создай папку `server/uploads/`
2. Положи туда изображение, например `part1.jpg`
3. В поле изображения укажи:

```
/uploads/part1.jpg
```

**Структура папки:**
```
server/
└── uploads/
    ├── part1.jpg
    ├── part2.jpg
    └── ...
```

> Сервер уже настроен отдавать файлы из папки `/uploads` —
> это прописано в `server/index.ts`

---

### Рекомендации по изображениям

| Параметр | Рекомендация |
|----------|-------------|
| Формат | JPG, PNG, WebP |
| Размер | до 2 МБ |
| Соотношение сторон | 1:1 (квадрат) или 4:3 |
| Разрешение | от 400×400px |

---

## 🗄 База данных

База данных создаётся **автоматически** при первом запуске сервера.

Файл базы данных: `server/db/nier_auto.db`

### Если нужно сбросить базу данных:

```bash
# Windows
cd server/db
del nier_auto.db

# Mac / Linux
cd server/db
rm nier_auto.db
```

После этого перезапусти сервер — база создастся заново с тестовыми данными.

---

## 📄 API Маршруты

### Авторизация
| Метод | Маршрут | Описание |
|-------|---------|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| PUT | /api/auth/change-password | Смена пароля |

### Товары
| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | /api/products | Список товаров с фильтрами |
| GET | /api/products/:id | Один товар |
| POST | /api/products | Добавить товар (продавец) |
| PUT | /api/products/:id | Обновить товар (продавец) |
| DELETE | /api/products/:id | Удалить товар (продавец) |

### Заказы
| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | /api/orders | Мои заказы (покупатель) |
| GET | /api/orders/seller | Заказы продавца |
| POST | /api/orders | Создать заказ |
| PUT | /api/orders/:id/status | Изменить статус |

### Продавцы
| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | /api/sellers | Список продавцов |
| GET | /api/sellers/:id | Профиль продавца |
| POST | /api/sellers/:id/reviews | Оставить отзыв |

### Администратор
| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | /api/admin/stats | Статистика |
| GET | /api/admin/users | Все пользователи |
| PUT | /api/admin/users/:id/role | Изменить роль |
| DELETE | /api/admin/users/:id | Удалить пользователя |
| DELETE | /api/admin/products/:id | Удалить товар |
| PUT | /api/admin/products/:id/promote | Продвижение товара |

### AI
| Метод | Маршрут | Описание |
|-------|---------|----------|
| POST | /api/ai/diagnose | AI подбор запчастей |

---

## 🔐 Роли пользователей

| Роль | Возможности |
|------|------------|
| **buyer** | Просмотр каталога, покупка, заказы, отзывы продавцам |
| **seller** | Всё что buyer + управление своими товарами и заказами |
| **admin** | Полный доступ ко всему включая панель администратора |

---

## 📦 Сборка для продакшена

```bash
# Собрать клиент
npm run build:client

# Запустить сервер в продакшене
cd server
npm run build
npm start
```

---

## 🐛 Частые проблемы

### Порт занят
```bash
# Windows — найти и завершить процесс на порту 3001
netstat -ano | findstr :3001
taskkill /PID <номер> /F
```

### База данных не создаётся
Убедись что папка `server/db/` существует:
```bash
mkdir server/db
```

### Ошибка CORS
Убедись что клиент запущен на порту `3000`,
а сервер на порту `3001`.

### Модули не найдены
```bash
cd server && npm install
cd ../client && npm install
```

---

## 👨‍💻 Автор

Дипломный проект, 2024
```