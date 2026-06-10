import db from './database';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return { hash: hash.toString('hex'), salt };
}

export async function runMigrations() {
  // Пользователи — с password_hash и salt (как в auth.ts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt          TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'buyer'
                    CHECK(role IN ('buyer','seller','admin')),
      session_token TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Товары
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      seller_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      brand       TEXT NOT NULL,
      oem_code    TEXT,
      car_make    TEXT NOT NULL,
      car_model   TEXT NOT NULL,
      year        INTEGER NOT NULL,
      part_type   TEXT NOT NULL,
      price       REAL NOT NULL CHECK(price > 0),
      stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      image_url   TEXT,
      description TEXT,
      is_promoted INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Заказы
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id             TEXT PRIMARY KEY,
      buyer_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_amount   REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'processing'
                     CHECK(status IN ('processing','shipped','delivered','cancelled')),
      payment_method TEXT NOT NULL DEFAULT 'card',
      address        TEXT NOT NULL,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Позиции заказа
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id           TEXT PRIMARY KEY,
      order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   TEXT REFERENCES products(id) ON DELETE SET NULL,
      quantity     INTEGER NOT NULL CHECK(quantity > 0),
      price_at_buy REAL NOT NULL
    );
  `);

  // Отзывы
  db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    seller_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment     TEXT,
    image_url   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(seller_id, reviewer_id)
  );
`);

  // Индексы
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_seller   ON products(seller_id);
    CREATE INDEX IF NOT EXISTS idx_products_type     ON products(part_type);
    CREATE INDEX IF NOT EXISTS idx_products_make     ON products(car_make);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer      ON orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_seller    ON reviews(seller_id);
  `);

  console.log('✅ Миграции выполнены');
  await seedData();

  // Чаты
  db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  order_id   TEXT REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

  // Сообщения
  db.exec(`
 CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  chat_id    TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

   db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
  CREATE INDEX IF NOT EXISTS idx_chats_buyer   ON chats(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_chats_seller  ON chats(seller_id);
`);

  // Миграция — добавляем is_read если колонки ещё нет
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // колонка уже существует — игнорируем
  }

  // Миграция — пересоздаём chats без UNIQUE constraint
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS chats_new (
        id         TEXT PRIMARY KEY,
        order_id   TEXT REFERENCES orders(id) ON DELETE CASCADE,
        buyer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO chats_new SELECT * FROM chats;
      DROP TABLE chats;
      ALTER TABLE chats_new RENAME TO chats;
    `);
  } catch {
    // уже мигрировано
  }
}

async function seedData() {
  const exists = db.prepare('SELECT 1 FROM users LIMIT 1').get();
  if (exists) return;

  console.log('🌱 Заполнение базы данных...');

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, salt, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const adminId = uuidv4();
  const seller1Id = uuidv4();
  const seller2Id = uuidv4();
  const buyer1Id = uuidv4();
  const buyer2Id = uuidv4();

  // Хешируем пароли тем же методом что auth.ts
  const adminHash = await hashPassword('admin123');
  const seller1Hash = await hashPassword('seller123');
  const seller2Hash = await hashPassword('seller123');
  const buyer1Hash = await hashPassword('buyer123');
  const buyer2Hash = await hashPassword('buyer123');

  insertUser.run(adminId, 'Администратор', 'admin@nier.auto', adminHash.hash, adminHash.salt, 'admin');
  insertUser.run(seller1Id, 'АвтоЗапчасти+', 'seller1@nier.auto', seller1Hash.hash, seller1Hash.salt, 'seller');
  insertUser.run(seller2Id, 'ДеталиПро', 'seller2@nier.auto', seller2Hash.hash, seller2Hash.salt, 'seller');
  insertUser.run(buyer1Id, 'Иван Петров', 'buyer1@nier.auto', buyer1Hash.hash, buyer1Hash.salt, 'buyer');
  insertUser.run(buyer2Id, 'Мария Сидорова', 'buyer2@nier.auto', buyer2Hash.hash, buyer2Hash.salt, 'buyer');

  // Товары
  const insertProduct = db.prepare(`
    INSERT INTO products
      (id, seller_id, name, brand, oem_code, car_make, car_model,
       year, part_type, price, stock, description, is_promoted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(uuidv4(), seller1Id, 'Тормозной диск передний', 'Bosch', '0 986 479 R84', 'Toyota', 'Camry', 2020, 'Тормозная система', 3200, 5, 'Вентилируемый тормозной диск', 1);
  insertProduct.run(uuidv4(), seller1Id, 'Колодки тормозные', 'TRW', 'GDB3468', 'Toyota', 'Camry', 2020, 'Тормозная система', 1850, 12, 'Комплект из 4 колодок', 1);
  insertProduct.run(uuidv4(), seller1Id, 'Амортизатор передний', 'KYB', '334839', 'BMW', '3 Series', 2019, 'Подвеска', 5400, 3, 'Газомасляный амортизатор', 1);
  insertProduct.run(uuidv4(), seller1Id, 'Фильтр масляный', 'Mann', 'W 712/75', 'Volkswagen', 'Golf', 2018, 'Фильтры', 320, 30, 'Оригинальный масляный фильтр', 0);
  insertProduct.run(uuidv4(), seller1Id, 'Свечи зажигания (к-т)', 'NGK', 'BKR6EK', 'Hyundai', 'Solaris', 2021, 'Двигатель', 1200, 20, 'Комплект 4 шт.', 0);
  insertProduct.run(uuidv4(), seller1Id, 'Ремень ГРМ', 'Gates', 'T43218', 'Kia', 'Rio', 2020, 'Двигатель', 2100, 8, 'С натяжителем в комплекте', 0);
  insertProduct.run(uuidv4(), seller2Id, 'Рулевая тяга', 'Lemförder', '37341 01', 'Audi', 'A4', 2019, 'Рулевое управление', 3800, 4, 'Левая рулевая тяга', 1);
  insertProduct.run(uuidv4(), seller2Id, 'Шаровая опора', 'Moog', 'TO-BJ-10717', 'Toyota', 'RAV4', 2021, 'Подвеска', 2900, 6, 'Нижняя шаровая опора', 1);
  insertProduct.run(uuidv4(), seller2Id, 'Термостат', 'Wahler', '4571.87D', 'Ford', 'Focus', 2018, 'Охлаждение', 1650, 10, 'С корпусом в сборе', 0);
  insertProduct.run(uuidv4(), seller2Id, 'Помпа водяная', 'Hepu', 'P096', 'Volkswagen', 'Passat', 2019, 'Охлаждение', 4200, 2, 'Насос охлаждающей жидкости', 0);
  insertProduct.run(uuidv4(), seller2Id, 'ШРУС наружный', 'GSP', '861009', 'Nissan', 'Qashqai', 2020, 'Трансмиссия', 6500, 3, 'В сборе с пыльником', 0);
  insertProduct.run(uuidv4(), seller2Id, 'Аккумулятор 60Ah', 'Varta', 'C22', 'Toyota', 'Corolla', 2019, 'Электрика', 7200, 5, 'Пусковой ток 540A', 0);
  insertProduct.run(uuidv4(), seller1Id, 'Воздушный фильтр', 'Mann', 'C 35 154/1', 'BMW', 'X5', 2020, 'Фильтры', 850, 15, 'Бумажный воздушный фильтр', 0);
  insertProduct.run(uuidv4(), seller2Id, 'Стойка стабилизатора', 'Febi', '32198', 'Mercedes', 'C-Class', 2018, 'Подвеска', 1200, 8, 'Передняя стойка', 0);
  insertProduct.run(uuidv4(), seller1Id, 'Суппорт тормозной', 'ATE', '24.3581-8802.5', 'Skoda', 'Octavia', 2021, 'Тормозная система', 8900, 2, 'Передний левый суппорт', 0);

  // Отзывы
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, seller_id, reviewer_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReview.run(uuidv4(), seller1Id, buyer1Id, 5, 'Отличный продавец! Быстрая доставка.');
  insertReview.run(uuidv4(), seller1Id, buyer2Id, 4, 'Хорошее качество запчастей, рекомендую.');
  insertReview.run(uuidv4(), seller2Id, buyer1Id, 5, 'Очень доволен покупкой, продавец на связи.');

  console.log('✅ Тестовые данные добавлены');
  console.log('   admin@nier.auto    / admin123');
  console.log('   seller1@nier.auto  / seller123');
  console.log('   buyer1@nier.auto   / buyer123');
}