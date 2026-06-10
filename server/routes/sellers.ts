import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/sellers — список всех продавцов
router.get('/', (_: Request, res: Response) => {
  const sellers = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.created_at,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT r.id)       as review_count,
      COUNT(DISTINCT p.id)       as product_count
    FROM users u
    LEFT JOIN reviews  r ON r.seller_id = u.id
    LEFT JOIN products p ON p.seller_id = u.id
    WHERE u.role = 'seller'
    GROUP BY u.id
    ORDER BY avg_rating DESC
  `).all();

  return res.json(sellers);
});

// GET /api/sellers/:id — профиль продавца
router.get('/:id', (req: Request, res: Response) => {
  const seller = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      COUNT(DISTINCT p.id)         as product_count,
      COUNT(DISTINCT r.id)         as review_count,
      COALESCE(AVG(r.rating), 0)   as avg_rating,
      COALESCE(SUM(oi.quantity), 0) as total_sales
    FROM users u
    LEFT JOIN products   p  ON p.seller_id  = u.id
    LEFT JOIN reviews    r  ON r.seller_id  = u.id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE u.id = ? AND u.role = 'seller'
    GROUP BY u.id
  `).get(req.params.id) as any;

  if (!seller) return res.status(404).json({ error: 'Продавец не найден' });

  const reviews = db.prepare(`
    SELECT
      r.id,
      r.rating,
      r.comment,
      r.image_url,
      r.created_at,
      u.name as reviewer_name,
      u.id   as reviewer_id
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.seller_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.id);

  const products = db.prepare(`
    SELECT * FROM products
    WHERE seller_id = ? AND stock > 0
    ORDER BY is_promoted DESC, created_at DESC
  `).all(req.params.id);

  return res.json({ seller, reviews, products });
});

// POST /api/sellers/:id/reviews — оставить отзыв
router.post('/:id/reviews', requireAuth, (req: AuthRequest, res: Response) => {
  const { rating, comment, image_url } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Оценка от 1 до 5' });
  }

  const seller = db.prepare(
    'SELECT * FROM users WHERE id = ? AND role = ?'
  ).get(req.params.id, 'seller') as any;

  if (!seller) {
    return res.status(404).json({ error: 'Продавец не найден' });
  }

  if (req.user!.id === req.params.id) {
    return res.status(400).json({ error: 'Нельзя оставить отзыв себе' });
  }

  const existing = db.prepare(
    'SELECT id FROM reviews WHERE seller_id = ? AND reviewer_id = ?'
  ).get(req.params.id, req.user!.id);

  if (existing) {
    // Обновляем существующий отзыв
    db.prepare(`
      UPDATE reviews
      SET rating = ?, comment = ?, image_url = ?
      WHERE seller_id = ? AND reviewer_id = ?
    `).run(
      rating,
      comment    || null,
      image_url  || null,
      req.params.id,
      req.user!.id
    );

    return res.json({ message: 'Отзыв обновлён' });
  }

  // Создаём новый отзыв
  db.prepare(`
    INSERT INTO reviews (id, seller_id, reviewer_id, rating, comment, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    req.params.id,
    req.user!.id,
    rating,
    comment   || null,
    image_url || null
  );

  return res.status(201).json({ message: 'Отзыв добавлен' });
});

export default router;