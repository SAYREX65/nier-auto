import { Router, Response } from 'express';
import db from '../db/database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Все маршруты только для admin
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats — статистика
router.get('/stats', (_, res) => {
  const totalUsers    = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
  const totalProducts = (db.prepare("SELECT COUNT(*) as c FROM products").get() as any).c;
  const totalOrders   = (db.prepare("SELECT COUNT(*) as c FROM orders").get() as any).c;
  const totalRevenue  = (db.prepare(
    "SELECT COALESCE(SUM(total_amount),0) as c FROM orders WHERE status != 'cancelled'"
  ).get() as any).c;

  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, p.brand, SUM(oi.quantity) as sold,
      SUM(oi.quantity * oi.price_at_buy) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    GROUP BY p.id
    ORDER BY sold DESC
    LIMIT 5
  `).all();

  const topSellers = db.prepare(`
    SELECT u.name, u.email,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT oi.order_id) as sales
    FROM users u
    LEFT JOIN products p ON p.seller_id = u.id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN reviews r ON r.seller_id = u.id
    WHERE u.role = 'seller'
    GROUP BY u.id
    ORDER BY sales DESC
    LIMIT 5
  `).all();

  const recentOrders = db.prepare(`
    SELECT o.*, u.name as buyer_name
    FROM orders o
    JOIN users u ON u.id = o.buyer_id
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all();

  return res.json({
    totalUsers, totalProducts, totalOrders, totalRevenue,
    ordersByStatus, topProducts, topSellers, recentOrders
  });
});

// GET /api/admin/users
router.get('/users', (_, res) => {
  const users = db.prepare(`
    SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC
  `).all();
  return res.json(users);
});

// PUT /api/admin/users/:id/role — сменить роль
router.put('/users/:id/role', (req, res) => {
  const { role } = req.body;
  const valid = ['buyer', 'seller', 'admin'];
  if (!valid.includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  return res.json({ message: 'Роль обновлена' });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Пользователь удалён' });
});

// GET /api/admin/orders
router.get('/orders', (_, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as buyer_name, u.email as buyer_email
    FROM orders o
    JOIN users u ON u.id = o.buyer_id
    ORDER BY o.created_at DESC
  `).all();
  return res.json(orders);
});

// PUT /api/admin/products/:id/promote — продвижение товара
router.put('/products/:id/promote', (req, res) => {
  const { is_promoted } = req.body;
  db.prepare('UPDATE products SET is_promoted = ? WHERE id = ?')
    .run(is_promoted ? 1 : 0, req.params.id);
  return res.json({ message: 'Статус продвижения обновлён' });
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Товар удалён' });
});

export default router;