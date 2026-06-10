import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/chats — создать чат (с заказом или без)
router.post('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { order_id, seller_id } = req.body;

  if (!seller_id) {
    return res.status(400).json({ error: 'seller_id обязателен' });
  }

  // Если передан order_id — проверяем что заказ существует
  if (order_id) {
    const order = db.prepare(
      'SELECT * FROM orders WHERE id = ? AND buyer_id = ?'
    ).get(order_id, req.user!.id) as any;
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  }

  // Ищем существующий чат
  let chat = order_id
    ? db.prepare(`
        SELECT * FROM chats
        WHERE order_id = ? AND buyer_id = ? AND seller_id = ?
      `).get(order_id, req.user!.id, seller_id) as any
    : db.prepare(`
        SELECT * FROM chats
        WHERE order_id IS NULL AND buyer_id = ? AND seller_id = ?
      `).get(req.user!.id, seller_id) as any;

  if (!chat) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO chats (id, order_id, buyer_id, seller_id)
      VALUES (?, ?, ?, ?)
    `).run(id, order_id ?? null, req.user!.id, seller_id);
    chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  }

  return res.json(chat);
});

// GET /api/chats — все чаты пользователя с кол-вом непрочитанных
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const chats = db.prepare(`
    SELECT
      c.*,
      buyer.name   as buyer_name,
      seller.name  as seller_name,
      o.total_amount,
      (
        SELECT text FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC LIMIT 1
      ) as last_message,
      (
        SELECT created_at FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC LIMIT 1
      ) as last_message_at,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.chat_id = c.id
          AND m.sender_id != ?
          AND m.is_read = 0
      ) as unread_count
    FROM chats c
    JOIN users buyer  ON buyer.id  = c.buyer_id
    JOIN users seller ON seller.id = c.seller_id
    LEFT JOIN orders o ON o.id = c.order_id
    WHERE c.buyer_id = ? OR c.seller_id = ?
    ORDER BY last_message_at DESC
  `).all(req.user!.id, req.user!.id, req.user!.id);

  return res.json(chats);
});

// GET /api/chats/unread — общее кол-во непрочитанных для хедера
router.get('/unread', requireAuth, (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM messages m
    JOIN chats c ON c.id = m.chat_id
    WHERE (c.buyer_id = ? OR c.seller_id = ?)
      AND m.sender_id != ?
      AND m.is_read = 0
  `).get(req.user!.id, req.user!.id, req.user!.id) as any;

  return res.json({ count: result.count });
});

// GET /api/chats/:id/messages — сообщения + помечаем как прочитанные
router.get('/:id/messages', requireAuth, (req: AuthRequest, res: Response) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.id) as any;
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });

  if (chat.buyer_id !== req.user!.id && chat.seller_id !== req.user!.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  // Помечаем как прочитанные все сообщения от собеседника
  db.prepare(`
    UPDATE messages SET is_read = 1
    WHERE chat_id = ? AND sender_id != ? AND is_read = 0
  `).run(req.params.id, req.user!.id);

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.id);

  return res.json(messages);
});

// POST /api/chats/:id/messages — отправить сообщение
router.post('/:id/messages', requireAuth, (req: AuthRequest, res: Response) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.id) as any;
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });

  if (chat.buyer_id !== req.user!.id && chat.seller_id !== req.user!.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Сообщение не может быть пустым' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, chat_id, sender_id, text, is_read)
    VALUES (?, ?, ?, ?, 0)
  `).run(id, req.params.id, req.user!.id, text.trim());

  const message = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `).get(id);

  return res.status(201).json(message);
});

export default router;