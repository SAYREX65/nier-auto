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

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id           TEXT PRIMARY KEY,
      order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   TEXT REFERENCES products(id) ON DELETE SET NULL,
      quantity     INTEGER NOT NULL CHECK(quantity > 0),
      price_at_buy REAL NOT NULL
    );
  `);

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

  db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  order_id   TEXT REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

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

  try {
    db.exec(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // колонка уже существует
  }

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
    // таблица уже обновлена
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

  const adminId   = uuidv4();
  const seller1Id = uuidv4();
  const seller2Id = uuidv4();
  const seller3Id = uuidv4();
  const buyer1Id  = uuidv4();
  const buyer2Id  = uuidv4();

  const adminHash   = await hashPassword('admin123');
  const seller1Hash = await hashPassword('seller123');
  const seller2Hash = await hashPassword('seller123');
  const seller3Hash = await hashPassword('seller123');
  const buyer1Hash  = await hashPassword('buyer123');
  const buyer2Hash  = await hashPassword('buyer123');

  insertUser.run(adminId,   'Администратор',   'admin@nier.auto',   adminHash.hash,   adminHash.salt,   'admin');
  insertUser.run(seller1Id, 'АвтоЗапчасти+',  'seller1@nier.auto', seller1Hash.hash, seller1Hash.salt, 'seller');
  insertUser.run(seller2Id, 'ДеталиПро',       'seller2@nier.auto', seller2Hash.hash, seller2Hash.salt, 'seller');
  insertUser.run(seller3Id, 'МоторМаркет',     'seller3@nier.auto', seller3Hash.hash, seller3Hash.salt, 'seller');
  insertUser.run(buyer1Id,  'Иван Петров',      'buyer1@nier.auto',  buyer1Hash.hash,  buyer1Hash.salt,  'buyer');
  insertUser.run(buyer2Id,  'Мария Сидорова',   'buyer2@nier.auto',  buyer2Hash.hash,  buyer2Hash.salt,  'buyer');

  const insertProduct = db.prepare(`
    INSERT INTO products
      (id, seller_id, name, brand, oem_code, car_make, car_model,
       year, part_type, price, stock, description, image_url, is_promoted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // ── Тормозная система ──
  insertProduct.run(uuidv4(), seller1Id, 'Тормозной диск передний', 'Bosch', '0 986 479 R84', 'Toyota', 'Camry', 2020, 'Тормозная система', 3200, 5,
    'Вентилируемый тормозной диск для надёжного торможения. Диаметр 296 мм.',
    '/images/brake_disk_front.jpg', 1);

  insertProduct.run(uuidv4(), seller1Id, 'Колодки тормозные передние', 'TRW', 'GDB3468', 'Toyota', 'Camry', 2020, 'Тормозная система', 1850, 12,
    'Комплект из 4 тормозных колодок. Низкий уровень шума, длительный ресурс.',
    '/images/brake_pads.jpg', 1);

  insertProduct.run(uuidv4(), seller1Id, 'Суппорт тормозной передний левый', 'ATE', '24.3581-8802.5', 'Skoda', 'Octavia', 2021, 'Тормозная система', 8900, 2,
    'Суппорт в сборе с поршнем. Оригинальное качество.',
    '/images/brake_caliper.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Тормозной шланг задний', 'Cofle', '17.6887', 'Volkswagen', 'Golf', 2019, 'Тормозная система', 680, 18,
    'Армированный тормозной шланг задней оси. Длина 280 мм.',
    '/images/brake_hose.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Диск тормозной задний', 'Brembo', '08.A536.11', 'BMW', '5 Series', 2020, 'Тормозная система', 4100, 4,
    'Перфорированный диск Brembo. Улучшенный отвод тепла.',
    '/images/brake_disk_rear.jpg', 0);

  // ── Подвеска ──
  insertProduct.run(uuidv4(), seller1Id, 'Амортизатор передний', 'KYB', '334839', 'BMW', '3 Series', 2019, 'Подвеска', 5400, 3,
    'Газомасляный амортизатор. Плавный ход, отличная управляемость.',
    '/images/shock_absorber_front.jpg', 1);

  insertProduct.run(uuidv4(), seller2Id, 'Шаровая опора нижняя', 'Moog', 'TO-BJ-10717', 'Toyota', 'RAV4', 2021, 'Подвеска', 2900, 6,
    'Нижняя шаровая опора. Усиленная конструкция для длительной эксплуатации.',
    '/images/ball_joint.jpg', 1);

  insertProduct.run(uuidv4(), seller1Id, 'Стойка стабилизатора передняя', 'Febi', '32198', 'Mercedes', 'C-Class', 2018, 'Подвеска', 1200, 8,
    'Передняя стойка стабилизатора. Снижает крен в поворотах.',
    '/images/stabilizer_link.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Пружина подвески передняя', 'Eibach', 'E20-20-004-01-22', 'Audi', 'A4', 2020, 'Подвеска', 3600, 4,
    'Пружина передней подвески. Пара (2 шт). Заводское качество.',
    '/images/coil_spring.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Рычаг подвески нижний', 'Lemförder', '35855 01', 'Volkswagen', 'Passat', 2019, 'Подвеска', 5800, 3,
    'Нижний рычаг передней подвески в сборе с шаровой.',
    '/images/control_arm.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Амортизатор задний', 'Sachs', '315 019', 'Honda', 'CR-V', 2021, 'Подвеска', 4200, 5,
    'Задний газомасляный амортизатор. Оригинальный размер.',
    '/images/shock_absorber_rear.jpg', 0);

  // ── Рулевое управление ──
  insertProduct.run(uuidv4(), seller2Id, 'Рулевая тяга левая', 'Lemförder', '37341 01', 'Audi', 'A4', 2019, 'Рулевое управление', 3800, 4,
    'Левая рулевая тяга. Точная управляемость, оригинальное качество.',
    '/images/tie_rod.jpg', 1);

  insertProduct.run(uuidv4(), seller1Id, 'Наконечник рулевой тяги', 'TRW', 'JTE1231', 'Hyundai', 'Tucson', 2020, 'Рулевое управление', 1450, 10,
    'Наконечник рулевой тяги. Усиленный шарнир.',
    '/images/tie_rod_end.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Рейка рулевая', 'JTEKT', '45510-42190', 'Toyota', 'Corolla', 2021, 'Рулевое управление', 18500, 1,
    'Рулевая рейка в сборе. Восстановленная, с гарантией.',
    '/images/steering_rack.jpg', 0);

  // ── Двигатель ──
  insertProduct.run(uuidv4(), seller1Id, 'Свечи зажигания (к-т 4 шт)', 'NGK', 'BKR6EK', 'Hyundai', 'Solaris', 2021, 'Двигатель', 1200, 20,
    'Комплект 4 шт. Иридиевые электроды, увеличенный ресурс 60 000 км.',
    '/images/spark_plugs.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Ремень ГРМ с натяжителем', 'Gates', 'T43218', 'Kia', 'Rio', 2020, 'Двигатель', 2100, 8,
    'Комплект ГРМ: ремень + натяжитель + ролик. Ресурс 90 000 км.',
    '/images/timing_belt.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Прокладка головки блока', 'Elring', '458.490', 'Ford', 'Focus', 2019, 'Двигатель', 3200, 6,
    'Прокладка ГБЦ. Многослойная сталь. Оригинальный размер.',
    '/images/head_gasket.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Цепь ГРМ', 'Iwis', '59156', 'BMW', '1 Series', 2020, 'Двигатель', 4800, 3,
    'Цепь привода ГРМ. Усиленная конструкция.',
    '/images/timing_chain.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Катушка зажигания', 'Bosch', '0 221 604 115', 'Volkswagen', 'Polo', 2021, 'Двигатель', 2600, 9,
    'Катушка зажигания. Стабильное искрообразование.',
    '/images/ignition_coil.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Маслосъёмные колпачки (к-т)', 'Corteco', '49468537', 'Nissan', 'Qashqai', 2019, 'Двигатель', 890, 15,
    'Комплект маслосъёмных колпачков для двигателя MR20DE.',
    '/images/valve_seals.jpg', 0);

  // ── Фильтры ──
  insertProduct.run(uuidv4(), seller1Id, 'Фильтр масляный', 'Mann', 'W 712/75', 'Volkswagen', 'Golf', 2018, 'Фильтры', 320, 30,
    'Оригинальный масляный фильтр. Тонкость очистки 20 мкм.',
    '/images/oil_filter.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Воздушный фильтр', 'Mann', 'C 35 154/1', 'BMW', 'X5', 2020, 'Фильтры', 850, 15,
    'Бумажный воздушный фильтр. Эффективность фильтрации 99,5%.',
    '/images/air_filter.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Фильтр топливный', 'Bosch', '0 450 906 508', 'Mercedes', 'E-Class', 2019, 'Фильтры', 1100, 12,
    'Топливный фильтр тонкой очистки. Ресурс 30 000 км.',
    '/images/fuel_filter.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Фильтр салонный угольный', 'Filtron', 'K 1175A', 'Toyota', 'Camry', 2021, 'Фильтры', 650, 25,
    'Угольный фильтр салона. Поглощает запахи и вредные газы.',
    '/images/cabin_filter.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Фильтр АКПП', 'Febi', '38745', 'BMW', '5 Series', 2020, 'Фильтры', 1850, 7,
    'Фильтр-сетка масляного поддона АКПП.',
    '/images/transmission_filter.jpg', 0);

  // ── Охлаждение ──
  insertProduct.run(uuidv4(), seller2Id, 'Термостат в сборе', 'Wahler', '4571.87D', 'Ford', 'Focus', 2018, 'Охлаждение', 1650, 10,
    'Термостат с корпусом в сборе. Температура открытия 87°C.',
    '/images/thermostat.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Помпа водяная', 'Hepu', 'P096', 'Volkswagen', 'Passat', 2019, 'Охлаждение', 4200, 2,
    'Насос охлаждающей жидкости. Импеллер из нержавеющей стали.',
    '/images/water_pump.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Радиатор охлаждения', 'Nissens', '60764', 'Honda', 'Accord', 2019, 'Охлаждение', 8900, 2,
    'Алюминиевый радиатор системы охлаждения. Оригинальный размер.',
    '/images/radiator.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Расширительный бачок', 'Febi', '45286', 'BMW', '3 Series', 2019, 'Охлаждение', 2100, 6,
    'Бачок охлаждающей жидкости с крышкой.',
    '/images/coolant_tank.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Шланг радиатора верхний', 'Gates', '05-3093', 'Toyota', 'RAV4', 2020, 'Охлаждение', 780, 14,
    'Верхний патрубок радиатора. Армированная резина.',
    '/images/radiator_hose.jpg', 0);

  // ── Трансмиссия ──
  insertProduct.run(uuidv4(), seller2Id, 'ШРУС наружный в сборе', 'GSP', '861009', 'Nissan', 'Qashqai', 2020, 'Трансмиссия', 6500, 3,
    'ШРУС наружный с пыльником в сборе. Полная замена.',
    '/images/cv_joint.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Пыльник ШРУСа наружный', 'SKF', 'VKJP 01350', 'Kia', 'Sportage', 2021, 'Трансмиссия', 850, 16,
    'Пыльник наружного ШРУСа. Полиуретан. С хомутами.',
    '/images/cv_boot.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Масло АКПП ATF', 'ZF', 'S671090312', 'BMW', '5 Series', 2020, 'Трансмиссия', 2800, 10,
    'Жидкость для АКПП ZF 8HP. Канистра 1 л.',
    '/images/atf_oil.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Сцепление (к-т)', 'Luk', '621 3028 09', 'Volkswagen', 'Golf', 2019, 'Трансмиссия', 12500, 2,
    'Комплект сцепления: диск + корзина + выжимной подшипник.',
    '/images/clutch_kit.jpg', 0);

  // ── Электрика ──
  insertProduct.run(uuidv4(), seller2Id, 'Аккумулятор 60Ah 540A', 'Varta', 'C22', 'Toyota', 'Corolla', 2019, 'Электрика', 7200, 5,
    'Пусковой ток 540A. Необслуживаемый. Гарантия 2 года.',
    '/images/battery.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Генератор', 'Bosch', '0 124 525 526', 'Ford', 'Focus', 2019, 'Электрика', 14800, 2,
    'Восстановленный генератор. Ток отдачи 150A. Гарантия 12 мес.',
    '/images/alternator.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Стартер', 'Valeo', '438277', 'Hyundai', 'Tucson', 2020, 'Электрика', 9800, 3,
    'Восстановленный стартер. Мощность 1.4 кВт.',
    '/images/starter.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Датчик кислорода (лямбда)', 'Bosch', '0 258 006 027', 'Toyota', 'Camry', 2020, 'Электрика', 3600, 8,
    'Датчик кислорода универсальный. 4 провода.',
    '/images/o2_sensor.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Датчик ABS передний', 'Bosch', '0 265 007 750', 'BMW', 'X3', 2021, 'Электрика', 2400, 7,
    'Датчик скорости вращения колеса ABS. Левый/правый.',
    '/images/abs_sensor.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Лампа фары H7 (к-т)', 'Philips', '12972XV+S2', 'Audi', 'A6', 2020, 'Электрика', 1850, 20,
    'Комплект ламп H7 Philips X-tremeVision+. +130% больше света.',
    '/images/headlight_bulb.jpg', 0);

  // ── Кузов ──
  insertProduct.run(uuidv4(), seller3Id, 'Бампер передний', 'TYG', 'VV04003BA', 'Volkswagen', 'Polo', 2020, 'Кузовные детали', 8500, 2,
    'Передний бампер. Под покраску. Отверстия под парктроники.',
    '/images/front_bumper.jpg', 0);

  insertProduct.run(uuidv4(), seller2Id, 'Капот', 'TYG', 'HY10126BB', 'Hyundai', 'Solaris', 2021, 'Кузовные детали', 12000, 1,
    'Капот стальной. Под покраску. Оригинальный размер.',
    '/images/hood.jpg', 0);

  insertProduct.run(uuidv4(), seller1Id, 'Зеркало боковое левое', 'Prasco', 'TY3407153', 'Toyota', 'Corolla', 2020, 'Кузовные детали', 5600, 3,
    'Зеркало левое с электроприводом, обогревом, грунтованное.',
    '/images/side_mirror.jpg', 0);

  insertProduct.run(uuidv4(), seller3Id, 'Порог правый', 'NovLine', 'NT-001', 'Kia', 'Rio', 2019, 'Кузовные детали', 3200, 4,
    'Порог кузова правый. Стальной. Под варку.',
    '/images/door_sill.jpg', 0);

  // ── Отзывы ──
  const insertReview = db.prepare(`
    INSERT INTO reviews (id, seller_id, reviewer_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertReview.run(uuidv4(), seller1Id, buyer1Id, 5, 'Отличный продавец! Быстрая доставка, запчасть подошла с первого раза.');
  insertReview.run(uuidv4(), seller1Id, buyer2Id, 4, 'Хорошее качество запчастей, рекомендую. Упаковка надёжная.');
  insertReview.run(uuidv4(), seller2Id, buyer1Id, 5, 'Очень доволен покупкой, продавец на связи, отвечает быстро.');
  insertReview.run(uuidv4(), seller3Id, buyer2Id, 5, 'МоторМаркет — проверенный продавец. Заказываю не первый раз.');

  console.log('✅ Тестовые данные добавлены (50+ товаров)');
  console.log('   admin@nier.auto    / admin123');
  console.log('   seller1@nier.auto  / seller123');
  console.log('   buyer1@nier.auto   / buyer123');
}
