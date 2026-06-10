import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/orders — все заказы покупателя (история + активные)
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const orders = (db.prepare(`
    SELECT
      o.*,
      json_group_array(json_object(
  'product_id',  oi.product_id,
  'seller_id',   p.seller_id,
  'name',        p.name,
  'brand',       p.brand,
  'oem_code',    p.oem_code,
  'image_url',   p.image_url,
  'quantity',    oi.quantity,
  'price',       oi.price_at_buy
)) as items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
    WHERE o.buyer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.user!.id) as any[]).map((o: any) => ({
    ...o,
    items: JSON.parse(o.items),
  }));

  return res.json(orders);
});

// GET /api/orders/active — только активные заказы покупателя
router.get('/active', requireAuth, (req: AuthRequest, res: Response) => {
  const orders = (db.prepare(`
    SELECT
      o.*,
      json_group_array(json_object(
        'product_id', oi.product_id,
        'seller_id',   p.seller_id,
        'name',       p.name,
        'brand',      p.brand,
        'image_url',  p.image_url,
        'quantity',   oi.quantity,
        'price',      oi.price_at_buy
      )) as items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.buyer_id = ?
      AND o.status IN ('processing', 'shipped')
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.user!.id) as any[]).map((o: any) => ({
    ...o,
    items: JSON.parse(o.items),
  }));

  return res.json(orders);
});

// GET /api/orders/seller — заказы продавца
router.get('/seller', requireAuth, requireRole('seller', 'admin'),
  (req: AuthRequest, res: Response) => {
    const orders = (db.prepare(`
      SELECT
        o.*,
        u.name  as buyer_name,
        u.email as buyer_email,
        json_group_array(json_object(
          'product_id', oi.product_id,
          'seller_id',   p.seller_id,
          'name',       p.name,
          'brand',      p.brand,
          'quantity',   oi.quantity,
          'price',      oi.price_at_buy
        )) as items
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.seller_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(req.user!.id) as any[]).map((o: any) => ({
      ...o,
      items: JSON.parse(o.items),
    }));

    return res.json(orders);
  }
);

// POST /api/orders — создать заказ (списываем stock)
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { items, address, payment_method = 'card' } = req.body;

  if (!items?.length) return res.status(400).json({ error: 'Корзина пуста' });
  if (!address) return res.status(400).json({ error: 'Укажите адрес доставки' });

  // Проверяем наличие и считаем сумму
  let total = 0;
  const checkedItems: any[] = [];

  for (const item of items) {
    const product = db.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).get(item.product_id) as any;

    if (!product) {
      return res.status(400).json({ error: `Товар не найден: ${item.product_id}` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({
        error: `Недостаточно товара "${product.name}". В наличии: ${product.stock}`
      });
    }

    total += product.price * item.quantity;
    checkedItems.push({ product, quantity: item.quantity });
  }

  // Создаём заказ в транзакции
  const createOrder = db.transaction(() => {
    const orderId = uuidv4();

    db.prepare(`
      INSERT INTO orders (id, buyer_id, total_amount, status, payment_method, address)
      VALUES (?, ?, ?, 'processing', ?, ?)
    `).run(orderId, req.user!.id, total, payment_method, address);

    for (const { product, quantity } of checkedItems) {
      // Добавляем позицию заказа
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, price_at_buy)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), orderId, product.id, quantity, product.price);

      // Списываем остаток
      db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `).run(quantity, product.id);
    }

    return orderId;
  });

  const orderId = createOrder();
  return res.status(201).json({ id: orderId, message: 'Заказ создан' });
});

// PUT /api/orders/:id/status — изменить статус
router.put('/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
  const order = db.prepare(
    'SELECT * FROM orders WHERE id = ?'
  ).get(req.params.id) as any;

  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  const { status } = req.body;
  const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  // Покупатель может только отменить свой заказ в течение 10 минут
  if (req.user!.role === 'buyer') {
    if (order.buyer_id !== req.user!.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    if (status !== 'cancelled' && status !== 'shipped') {
      return res.status(403).json({ error: 'Покупатель может только отменить заказ' });
    }

    if (status === 'cancelled') {
      const createdAt = new Date(order.created_at.replace(' ', 'T') + 'Z').getTime();
      const diffMin = (Date.now() - createdAt) / 1000 / 60;

      if (diffMin > 10) {
        return res.status(403).json({
          error: 'Время для отмены заказа истекло (10 минут)'
        });
      }
    }
  }

  // Продавец и админ могут менять статус без ограничений
  if (req.user!.role === 'seller') {
    const isSeller = db.prepare(`
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? AND p.seller_id = ?
  `).get(req.params.id, req.user!.id);

    console.log('seller check:', req.user!.id, req.params.id, isSeller);

    if (!isSeller) return res.status(403).json({ error: 'Нет доступа' });
  }

  // Если отменяем — возвращаем товары в наличие
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const restoreStock = db.transaction(() => {
      const items = db.prepare(
        'SELECT * FROM order_items WHERE order_id = ?'
      ).all(req.params.id) as any[];

      for (const item of items) {
        db.prepare(`
          UPDATE products SET stock = stock + ? WHERE id = ?
        `).run(item.quantity, item.product_id);
      }

      db.prepare(
        'UPDATE orders SET status = ? WHERE id = ?'
      ).run(status, req.params.id);
    });

    restoreStock();
    return res.json({ message: 'Заказ отменён, товары возвращены в наличие' });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?')
    .run(status, req.params.id);

  return res.json({ message: 'Статус обновлён' });
});

// DELETE /api/orders/:id — покупатель отменяет в течение 10 минут
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const order = db.prepare(
    'SELECT * FROM orders WHERE id = ? AND buyer_id = ?'
  ).get(req.params.id, req.user!.id) as any;

  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  const diffMin = (Date.now() - new Date(order.created_at).getTime()) / 60000;

  if (diffMin > 10) {
    return res.status(403).json({ error: 'Время для отмены истекло (10 минут)' });
  }

  // Возвращаем stock
  const cancel = db.transaction(() => {
    const items = db.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).all(req.params.id) as any[];

    for (const item of items) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .run(item.quantity, item.product_id);
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?')
      .run('cancelled', req.params.id);
  });

  cancel();
  return res.json({ message: 'Заказ отменён' });
});

export default router;