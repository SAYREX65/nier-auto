import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products — каталог с фильтрами, поиском, сортировкой
router.get('/', (req: Request, res: Response) => {
  const {
    make, model, year, part_type, brand,
    search, sort = 'created_at', order = 'DESC',
    page = '1', limit = '12', min_price, max_price
  } = req.query as Record<string, string>;

  const conditions: string[] = ['p.stock > 0'];
  const params: any[]        = [];

  if (make)      { conditions.push('p.car_make = ?');   params.push(make); }
  if (model)     { conditions.push('p.car_model = ?');  params.push(model); }
  if (year)      { conditions.push('p.year = ?');       params.push(Number(year)); }
  if (part_type) { conditions.push('p.part_type = ?');  params.push(part_type); }
  if (brand)     { conditions.push('p.brand = ?');      params.push(brand); }
  if (min_price) { conditions.push('p.price >= ?');     params.push(Number(min_price)); }
  if (max_price) { conditions.push('p.price <= ?');     params.push(Number(max_price)); }

  // Поиск по названию, бренду И OEM-коду
  if (search) {
    conditions.push(`(
      p.name     LIKE ? OR
      p.brand    LIKE ? OR
      p.oem_code LIKE ? OR
      p.description LIKE ?
    )`);
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Безопасная сортировка
  const allowedSort  = ['price', 'created_at', 'name', 'year'];
  const allowedOrder = ['ASC', 'DESC'];
  const safeSort  = allowedSort.includes(sort)   ? sort  : 'created_at';
  const safeOrder = allowedOrder.includes(order.toUpperCase())
    ? order.toUpperCase() : 'DESC';

  // Пагинация
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(48, Math.max(1, Number(limit)));
  const offset   = (pageNum - 1) * limitNum;

  const total = (db.prepare(`
    SELECT COUNT(*) as c
    FROM products p
    JOIN users u ON u.id = p.seller_id
    ${where}
  `).get(...params) as any).c;

  const products = db.prepare(`
    SELECT
      p.*,
      u.name as seller_name,
      COALESCE(AVG(r.rating), 0) as seller_rating
    FROM products p
    JOIN users u ON u.id = p.seller_id
    LEFT JOIN reviews r ON r.seller_id = p.seller_id
    ${where}
    GROUP BY p.id
   ORDER BY p.is_promoted DESC, p.${safeSort} ${safeOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  return res.json({
    products,
    pagination: {
      total,
      page:  pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    }
  });
});

// GET /api/products/meta/filters — данные для фильтров
router.get('/meta/filters', (_, res) => {
  const makes  = db.prepare(`SELECT DISTINCT car_make  as car_make  FROM products WHERE stock > 0 ORDER BY car_make`).all();
  const models = db.prepare(`SELECT DISTINCT car_make, car_model    FROM products WHERE stock > 0 ORDER BY car_model`).all();
  const years  = db.prepare(`SELECT DISTINCT year                   FROM products WHERE stock > 0 ORDER BY year DESC`).all();
  const types  = db.prepare(`SELECT DISTINCT part_type as part_type FROM products WHERE stock > 0 ORDER BY part_type`).all();
  const brands = db.prepare(`SELECT DISTINCT brand     as brand     FROM products WHERE stock > 0 ORDER BY brand`).all();

  return res.json({ makes, models, years, types, brands });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT
      p.*,
      u.name as seller_name,
      COALESCE(AVG(r.rating), 0) as seller_rating
    FROM products p
    JOIN users u ON u.id = p.seller_id
    LEFT JOIN reviews r ON r.seller_id = p.seller_id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  return res.json(product);
});

// POST /api/products — добавить товар (продавец)
router.post('/', requireAuth, requireRole('seller', 'admin'),
  (req: AuthRequest, res: Response) => {
    const {
      name, brand, oem_code, car_make, car_model,
      year, part_type, price, stock, image_url, description
    } = req.body;

    if (!name || !brand || !car_make || !car_model || !year || !part_type || !price) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO products
        (id, seller_id, name, brand, oem_code, car_make, car_model,
         year, part_type, price, stock, image_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user!.id, name, brand, oem_code || null,
      car_make, car_model, Number(year), part_type,
      Number(price), Number(stock) || 0,
      image_url || null, description || null
    );

    return res.status(201).json({ id, message: 'Товар добавлен' });
  }
);

// PUT /api/products/:id — обновить товар
router.put('/:id', requireAuth, requireRole('seller', 'admin'),
  (req: AuthRequest, res: Response) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    if (product.seller_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const {
      name, brand, oem_code, car_make, car_model,
      year, part_type, price, stock, image_url, description
    } = req.body;

    db.prepare(`
      UPDATE products SET
        name = ?, brand = ?, oem_code = ?, car_make = ?, car_model = ?,
        year = ?, part_type = ?, price = ?, stock = ?,
        image_url = ?, description = ?
      WHERE id = ?
    `).run(
      name, brand, oem_code || null, car_make, car_model,
      Number(year), part_type, Number(price), Number(stock),
      image_url || null, description || null,
      req.params.id
    );

    return res.json({ message: 'Товар обновлён' });
  }
);

// DELETE /api/products/:id — удалить товар
router.delete('/:id', requireAuth, requireRole('seller', 'admin'),
  (req: AuthRequest, res: Response) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    if (product.seller_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Товар удалён' });
  }
);

export default router;