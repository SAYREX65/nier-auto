import { Request, Response, NextFunction } from 'express';
import db from '../db/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  const user = db.prepare(
    'SELECT id, name, email, role FROM users WHERE session_token = ?'
  ).get(token) as any;

  if (!user) return res.status(401).json({ error: 'Сессия истекла' });

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    next();
  };
}