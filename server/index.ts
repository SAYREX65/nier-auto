import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { runMigrations } from './db/migrations';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import authRoutes    from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes   from './routes/orders';
import sellerRoutes  from './routes/sellers';
import adminRoutes   from './routes/admin';
import aiRoutes      from './routes/ai';
import chatRoutes    from './routes/chats';

const app  = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? '*' : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Статика загрузок
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Статика фронтенда
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API роуты
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/sellers',  sellerRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/chats',    chatRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Запуск после миграций
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Ошибка миграций:', err);
  process.exit(1);
});

export default app;