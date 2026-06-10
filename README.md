# Nier:auto — Маркетплейс автозапчастей

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

Полноценный маркетплейс автозапчастей с поддержкой ролей пользователей,
AI-подбором деталей, чатом между покупателями и продавцами, системой заказов
и административной панелью.

---

## 📋 Содержание

- [Технологии](#технологии)
- [Архитектура](#архитектура)
- [Структура проекта](#структура-проекта)
- [Роли пользователей](#роли-пользователей)
- [Функционал](#функционал)
- [API](#api)
- [База данных](#база-данных)
- [Установка и запуск](#установка-и-запуск)
- [Деплой](#деплой)
- [Переменные окружения](#переменные-окружения)

---

## 🛠 Технологии

### Backend
| Технология | Версия | Назначение |
|---|---|---|
| Node.js | ≥ 18 | Среда выполнения |
| Express | 4.x | HTTP-сервер |
| TypeScript | 5.x | Типизация |
| SQLite3 | 5.x | База данных |
| JWT | 9.x | Аутентификация |
| bcrypt | 5.x | Хеширование паролей |
| Multer | 1.x | Загрузка файлов |
| YandexAi SDK | 4.x | AI-подбор запчастей |

### Frontend
| Технология | Версия | Назначение |
|---|---|---|
| React | 18.x | UI-фреймворк |
| TypeScript | 5.x | Типизация |
| Vite | 5.x | Сборщик |
| React Router | 6.x | Маршрутизация |
| Axios | 1.x | HTTP-клиент |
| CSS Modules | — | Стилизация |

---

## 🏗 Архитектура
Клиент (React + Vite)
↕ HTTP / REST API
Сервер (Express + TypeScript)
↕
SQLite3 (база данных)
↕
Yandex API (AI-подбор)


- **Монорепозиторий** — клиент и сервер в одном репозитории
- **REST API** — все взаимодействия через `/api/*`
- **JWT** — токен хранится в `localStorage`, передаётся в заголовке `Authorization: Bearer <token>`
- **Статика** — в продакшене сервер раздаёт собранный фронтенд из `client/dist`
- **Миграции** — при старте сервера автоматически выполняются SQL-миграции

---

## 📁 Структура проекта

```text
nier-auto/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Footer.tsx
│   │   │   ├── Footer.css
│   │   │   ├── Header.tsx
│   │   │   ├── Header.css
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductCard.css
│   │   │   ├── ReviewCard.tsx
│   │   │   ├── ReviewCard.css
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ReviewForm.css
│   │   ├── contexts/
│   │   │   └── CartContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useCart.ts
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminDashboard.css
│   │   │   ├── AIDiagnosePage.tsx
│   │   │   ├── AIDiagnosePage.css
│   │   │   ├── CartPage.tsx
│   │   │   ├── CartPage.css
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── CatalogPage.css
│   │   │   ├── ChatsPage.tsx
│   │   │   ├── ChatsPage.css
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── CheckoutPage.css
│   │   │   ├── ComparePage.tsx
│   │   │   ├── ComparePage.css
│   │   │   ├── HomePage.tsx
│   │   │   ├── HomePage.css
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrdersPage.css
│   │   │   ├── ProductPage.tsx
│   │   │   ├── ProductPage.css
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ProfilePage.css
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── SellerDashboard.tsx
│   │   │   ├── SellerDashboard.css
│   │   │   ├── SellerPage.tsx
│   │   │   └── SellerPage.css
│   │   ├── styles/
│   │   ├── types/
│   │   ├── api.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   └── index.html
│
├── server/
│   ├── db/
│   │   ├── database.ts
│   │   ├── migrations.ts
│   │   └── nier_auto.db
│   ├── middleware/
│   ├── routes/
│   │   ├── admin.ts
│   │   ├── ai.ts
│   │   ├── auth.ts
│   │   ├── chats.ts
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   └── sellers.ts
│   ├── types/
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── node_modules/
├── .env
├── .gitignore
├── .node-version
├── package.json
└── README.md
...
```


## 👥 Роли пользователей

### 🛒 Покупатель (`buyer`)
- Регистрация и вход
- Просмотр каталога и карточек товаров
- Поиск и фильтрация товаров
- Добавление в корзину
- Оформление заказов
- Просмотр истории заказов
- Чат с продавцами
- AI-подбор запчастей
- Сравнение товаров
- Редактирование профиля

### 🏪 Продавец (`seller`)
- Всё что может покупатель
- Создание и редактирование товаров
- Загрузка изображений товаров
- Управление остатками товаров
- Просмотр входящих заказов
- Обновление статусов заказов
- Продвижение товаров (ТОП)
- Чат с покупателями
- Просмотр своего публичного профиля

### 🔑 Администратор (`admin`)
- Всё что может продавец
- Управление всеми пользователями
- Смена ролей пользователей
- Блокировка пользователей
- Просмотр всех заказов
- Управление всеми товарами
- Полный доступ ко всем чатам
- Статистика платформы

---

## ⚙️ Функционал

### 🏠 Главная страница
- Баннер с призывом к действию
- Секция с топ-товарами (is_promoted = 1)
- Секция с последними товарами
- Быстрый поиск
- Навигация по категориям

### 📦 Каталог товаров
- Пагинация товаров
- Фильтрация по:
  - Марке автомобиля
  - Модели автомобиля
  - Году выпуска
  - Типу запчасти
  - Бренду запчасти
  - Продавцу
- Сортировка по цене, названию, дате
- Поиск по названию и OEM-коду
- Отображение наличия товара

### 🔍 Страница товара
- Фото товара
- Полная информация:
  - Название, бренд, OEM-код
  - Совместимость (марка, модель, год)
  - Тип запчасти
  - Наличие на складе
  - Описание
- Выбор количества
- Кнопка добавления в корзину
- Информация о продавце с рейтингом
- Кнопка написать продавцу
- Кнопка сравнить товар
- Хлебные крошки

### 🛒 Корзина
- Список добавленных товаров
- Изменение количества каждого товара
- Удаление товара из корзины
- Очистка всей корзины
- Итоговая сумма с разбивкой
- Переход к оформлению заказа
- Сохранение в `localStorage`

### 📝 Оформление заказа
- Форма с данными доставки:
  - ФИО получателя
  - Адрес доставки
  - Телефон
  - Комментарий к заказу
- Выбор способа оплаты
- Итоговая сумма заказа
- Подтверждение заказа

### 📋 Мои заказы (покупатель)
- История всех заказов
- Статусы заказов:
  - `pending` — Ожидает обработки
  - `processing` — В обработке
  - `shipped` — Отправлен
  - `delivered` — Доставлен
  - `cancelled` — Отменён
- Детали каждого заказа
- Список товаров в заказе

### 🏪 Кабинет продавца
- **Товары:**
  - Список всех своих товаров
  - Добавление нового товара:
    - Название, бренд, OEM-код
    - Марка, модель, год авто
    - Тип запчасти
    - Цена и остаток
    - Описание
    - Загрузка фото
    - Продвижение (ТОП)
  - Редактирование товара
  - Удаление товара
- **Заказы:**
  - Список входящих заказов
  - Смена статуса заказа
  - Детали заказа с адресом доставки

### 👤 Профиль пользователя
- Просмотр данных аккаунта
- Редактирование имени
- Смена пароля
- Загрузка аватара (хранится в `localStorage`)
- Отображение роли

### 💬 Чаты
- Список всех чатов
- Создание чата с продавцом
- Обмен сообщениями в реальном времени (polling каждые 3 сек)
- Счётчик непрочитанных сообщений в шапке (polling каждые 5 сек)
- Отображение времени сообщений

### 🤖 AI-подбор запчастей
- Чат-интерфейс с AI-ассистентом
- Подбор запчастей по описанию проблемы
- История диалога в рамках сессии
- Интеграция с YandexAi
- Контекст: ассистент знает о каталоге запчастей

### ⚖️ Сравнение товаров
- Добавление товаров для сравнения
- Сравнительная таблица характеристик:
  - Цена
  - Бренд
  - OEM-код
  - Совместимость
  - Наличие
- Удаление товара из сравнения
- Сохранение в `localStorage`

### 🔑 Административная панель
- **Пользователи:**
  - Список всех пользователей
  - Смена роли (buyer / seller / admin)
  - Блокировка аккаунта
- **Товары:**
  - Список всех товаров платформы
  - Удаление любого товара
  - Управление продвижением
- **Заказы:**
  - Все заказы платформы
  - Смена статуса любого заказа
- **Статистика:**
  - Количество пользователей
  - Количество товаров
  - Количество заказов
  - Общая выручка

---

## 🔌 API

### Аутентификация `/api/auth`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/api/auth/register` | Все | Регистрация |
| POST | `/api/auth/login` | Все | Вход |
| GET | `/api/auth/me` | Авторизован | Данные текущего пользователя |
| PUT | `/api/auth/profile` | Авторизован | Обновление профиля |
| PUT | `/api/auth/password` | Авторизован | Смена пароля |

### Товары `/api/products`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/products` | Все | Список товаров с фильтрами |
| GET | `/api/products/:id` | Все | Один товар |
| POST | `/api/products` | Продавец | Создать товар |
| PUT | `/api/products/:id` | Продавец | Обновить товар |
| DELETE | `/api/products/:id` | Продавец/Админ | Удалить товар |
| POST | `/api/products/:id/image` | Продавец | Загрузить фото |

**Query параметры GET `/api/products`:**

search        — поиск по названию/OEM
car_make      — марка авто
car_model     — модель авто
year          — год выпуска
part_type     — тип запчасти
brand         — бренд запчасти
seller_id     — ID продавца
sort          — поле сортировки (price, name, created_at)
order         — направление (asc, desc)
page          — страница (default: 1)
limit         — товаров на странице (default: 20)




### Заказы `/api/orders`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/orders` | Авторизован | Мои заказы |
| GET | `/api/orders/:id` | Авторизован | Один заказ |
| POST | `/api/orders` | Покупатель | Создать заказ |
| PUT | `/api/orders/:id/status` | Продавец/Админ | Сменить статус |
| GET | `/api/orders/seller` | Продавец | Заказы продавца |

### Продавцы `/api/sellers`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/sellers/:id` | Все | Профиль продавца |
| GET | `/api/sellers/:id/products` | Все | Товары продавца |

### Администрирование `/api/admin`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/admin/users` | Админ | Все пользователи |
| PUT | `/api/admin/users/:id/role` | Админ | Сменить роль |
| PUT | `/api/admin/users/:id/block` | Админ | Заблокировать |
| GET | `/api/admin/orders` | Админ | Все заказы |
| GET | `/api/admin/stats` | Админ | Статистика |
| DELETE | `/api/admin/products/:id` | Админ | Удалить товар |

### AI `/api/ai`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/api/ai/chat` | Авторизован | Отправить сообщение AI |

### Чаты `/api/chats`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/chats` | Авторизован | Список чатов |
| POST | `/api/chats` | Авторизован | Создать чат |
| GET | `/api/chats/:id/messages` | Авторизован | Сообщения чата |
| POST | `/api/chats/:id/messages` | Авторизован | Отправить сообщение |
| GET | `/api/chats/unread` | Авторизован | Кол-во непрочитанных |

---

## 🗄 База данных

### Таблица `users`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
name        TEXT NOT NULL
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL                  -- bcrypt hash
role        TEXT DEFAULT 'buyer'           -- buyer | seller | admin
is_blocked  INTEGER DEFAULT 0
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP

Таблица products

sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
seller_id     INTEGER REFERENCES users(id)
name          TEXT NOT NULL
brand         TEXT
oem_code      TEXT
car_make      TEXT
car_model     TEXT
year          INTEGER
part_type     TEXT
price         REAL NOT NULL
stock         INTEGER DEFAULT 0
description   TEXT
image_url     TEXT
is_promoted   INTEGER DEFAULT 0
created_at    DATETIME DEFAULT CURRENT_TIMESTAMP

Таблица orders

sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
buyer_id        INTEGER REFERENCES users(id)
seller_id       INTEGER REFERENCES users(id)
total_amount    REAL NOT NULL
status          TEXT DEFAULT 'pending'
shipping_name   TEXT
shipping_addr   TEXT
shipping_phone  TEXT
comment         TEXT
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP

Таблица order_items

sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
order_id    INTEGER REFERENCES orders(id)
product_id  INTEGER REFERENCES products(id)
name        TEXT
price       REAL
quantity    INTEGER

Таблица chats

sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
buyer_id    INTEGER REFERENCES users(id)
seller_id   INTEGER REFERENCES users(id)
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP

Таблица messages

sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
chat_id     INTEGER REFERENCES chats(id)
sender_id   INTEGER REFERENCES users(id)
text        TEXT NOT NULL
is_read     INTEGER DEFAULT 0
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP


🚀 Установка и запуск

Требования


Node.js ≥ 18

npm ≥ 9


1. Клонировать репозиторий

bash
git clone https://github.com/your-username/nier-auto.git
cd nier-auto

2. Установить зависимости

bash
# Корневые зависимости
npm install

# Зависимости сервера
cd server && npm install && cd ..

# Зависимости клиента
cd client && npm install && cd ..

3. Создать .env

bash
cp .env.example .env

Заполнить переменные (см. раздел ниже).


4. Запуск в режиме разработки

bash
# Сервер (порт 3001)
cd server && npm run dev

# Клиент (порт 3000) — в другом терминале
cd client && npm run dev

5. Сборка для продакшена

bash
# Собрать клиент
cd client && npm run build

# Запустить сервер (раздаёт и API и фронтенд)
cd server && npm run build && npm start


🌐 Деплой (Render.com)

Настройка сервиса


Type: Web Service

Build Command:
bash
cd client && npm install && npm run build && cd ../server && npm install && npm run build


Start Command:
bash
node server/dist/index.js


Environment: Node


Переменные окружения на Render

text
NODE_ENV=production
JWT_SECRET=your_secret_key
YANDEX_API_KEY=your_api_key
PORT=3001


🔐 Переменные окружения

Создай файл .env в корне проекта:


env
# Сервер
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_very_secret_key_here

# YandexAi (для AI-подбора)
YandexAi_API_KEY=sk-...

# База данных (путь до файла SQLite)
DB_PATH=./database.db


📱 Адаптивность

Сайт полностью адаптирован под мобильные устройства:


Брейкпоинт	Описание
> 900px	Десктоп — полная навигация в шапке
≤ 900px	Планшет/мобила — бургер меню
≤ 600px	Мобила — скрыты второстепенные элементы
≤ 480px	Маленькие экраны — адаптация карточек товаров


🔒 Безопасность


Пароли хешируются через bcrypt (10 rounds)

Авторизация через JWT токены (срок: 7 дней)

Проверка роли на каждом защищённом роуте

Загрузка файлов — только изображения, лимит 10MB

CORS настроен на конкретные домены



📄 Лицензия

MIT © 2026 Nier:auto

