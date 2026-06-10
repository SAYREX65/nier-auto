import { Router, Request, Response } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

const router = Router();
const scryptAsync = promisify(scrypt);

// Хеширование пароля
async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return { hash: hash.toString('hex'), salt };
}

// Проверка пароля
async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedHash = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, derivedHash);
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'buyer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    }

    const { hash, salt } = await hashPassword(password);
    const id = uuidv4();
    const token = uuidv4();
    const validRole = ['buyer', 'seller'].includes(role) ? role : 'buyer';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, salt, role, session_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, hash, salt, validRole, token);

    return res.status(201).json({
      token,
      user: { id, name, email, role: validRole }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = uuidv4();
    db.prepare('UPDATE users SET session_token = ? WHERE id = ?').run(token, user.id);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    db.prepare('UPDATE users SET session_token = NULL WHERE session_token = ?').run(token);
  }
  return res.json({ message: 'Выход выполнен' });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  const user = db.prepare(
    'SELECT id, name, email, role FROM users WHERE session_token = ?'
  ).get(token) as any;

  if (!user) return res.status(401).json({ error: 'Сессия истекла' });

  return res.json({ user });
});

// PUT /api/auth/change-password
router.put('/change-password', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE session_token = ?').get(token) as any;
  if (!user) return res.status(401).json({ error: 'Сессия истекла' });

  const valid = await verifyPassword(oldPassword, user.password_hash, user.salt);
  if (!valid) return res.status(400).json({ error: 'Неверный текущий пароль' });

  const { hash, salt } = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .run(hash, salt, user.id);

  return res.json({ message: 'Пароль обновлён' });
});

export default router;