import { useEffect, useState } from 'react';
import api from '../api';
import './AdminDashboard.css';

type Tab = 'stats' | 'users' | 'orders' | 'products';

export default function AdminDashboard() {
  const [tab, setTab]   = useState<Tab>('stats');
  const [stats, setStats]     = useState<any>(null);
  const [users, setUsers]     = useState<any[]>([]);
  const [orders, setOrders]   = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const requests = [api.get('/admin/stats')];
    if (tab === 'users')    requests.push(api.get('/admin/users'));
    if (tab === 'orders')   requests.push(api.get('/admin/orders'));
    if (tab === 'products') requests.push(api.get('/products?limit=100'));

    Promise.all(requests).then(results => {
      setStats(results[0].data);
      if (tab === 'users')    setUsers(results[1]?.data || []);
      if (tab === 'orders')   setOrders(results[1]?.data || []);
      if (tab === 'products') setProducts(results[1]?.data?.products || []);
    }).finally(() => setLoading(false));
  }, [tab]);

  const handleRoleChange = async (userId: string, role: string) => {
    await api.put(`/admin/users/${userId}/role`, { role });
    setUsers(u => u.map(user =>
      user.id === userId ? { ...user, role } : user
    ));
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;
    await api.delete(`/admin/users/${id}`);
    setUsers(u => u.filter(user => user.id !== id));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    await api.delete(`/admin/products/${id}`);
    setProducts(p => p.filter(pr => pr.id !== id));
  };

  const handlePromote = async (id: string, current: number) => {
    await api.put(`/admin/products/${id}/promote`, { is_promoted: !current });
    setProducts(p => p.map(pr =>
      pr.id === id ? { ...pr, is_promoted: current ? 0 : 1 } : pr
    ));
  };

  const handleOrderStatus = async (id: string, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    setOrders(o => o.map(or =>
      or.id === id ? { ...or, status } : or
    ));
  };

  const ROLE_COLORS: Record<string, string> = {
    admin:  'var(--accent)',
    seller: '#f0b429',
    buyer:  'var(--text-secondary)',
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">
          Админ<span className="text-accent">-панель</span>
        </h1>

        {/* Табы */}
        <div className="seller-tabs">
          {(['stats', 'users', 'orders', 'products'] as Tab[]).map(t => (
            <button
              key={t}
              className={`seller-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {{ stats: 'Статистика', users: 'Пользователи',
                 orders: 'Заказы', products: 'Товары' }[t]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-muted" style={{ padding: '40px 0', textAlign: 'center' }}>
            Загрузка...
          </div>
        ) : (
          <>
            {/* Статистика */}
            {tab === 'stats' && stats && (
              <div className="admin-stats">
                <div className="admin-stat-cards">
                  <div className="admin-stat-card card">
                    <span className="admin-stat-card__value">
                      {stats.totalUsers}
                    </span>
                    <span className="admin-stat-card__label text-muted">
                      Пользователей
                    </span>
                  </div>
                  <div className="admin-stat-card card">
                    <span className="admin-stat-card__value">
                      {stats.totalProducts}
                    </span>
                    <span className="admin-stat-card__label text-muted">
                      Товаров
                    </span>
                  </div>
                  <div className="admin-stat-card card">
                    <span className="admin-stat-card__value">
                      {stats.totalOrders}
                    </span>
                    <span className="admin-stat-card__label text-muted">
                      Заказов
                    </span>
                  </div>
                  <div className="admin-stat-card card">
                    <span className="admin-stat-card__value text-accent">
                      {Number(stats.totalRevenue).toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="admin-stat-card__label text-muted">
                      Выручка
                    </span>
                  </div>
                </div>

                <div className="admin-stats__grid">
                  {/* Заказы по статусам */}
                  <div className="card admin-stats__block">
                    <h3 className="section-title">Заказы по статусам</h3>
                    {stats.ordersByStatus.map((s: any) => (
                      <div key={s.status} className="admin-stat-row">
                        <span className={`badge badge-${s.status}`}>
                          {{ processing: 'В обработке', shipped: 'Отправлен',
                             delivered: 'Доставлен', cancelled: 'Отменён' }[s.status as string]}
                        </span>
                        <span className="admin-stat-row__count">{s.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Топ товары */}
                  <div className="card admin-stats__block">
                    <h3 className="section-title">Топ товары</h3>
                    {stats.topProducts.map((p: any, i: number) => (
                      <div key={i} className="admin-stat-row">
                        <span style={{ fontSize: 13 }}>
                          <span className="text-muted" style={{ marginRight: 8 }}>
                            #{i + 1}
                          </span>
                          {p.name}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--accent)' }}>
                          {p.sold} шт.
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Топ продавцы */}
                  <div className="card admin-stats__block">
                    <h3 className="section-title">Топ продавцы</h3>
                    {stats.topSellers.map((s: any, i: number) => (
                      <div key={i} className="admin-stat-row">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                          <span className="text-muted" style={{ fontSize: 11 }}>{s.email}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 13 }}>{s.sales} продаж</span>
                          <span style={{ fontSize: 11, color: '#f0b429' }}>
                            ★ {Number(s.avg_rating).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                                   {/* Последние заказы */}
                  <div className="card admin-stats__block">
                    <h3 className="section-title">Последние заказы</h3>
                    {stats.recentOrders.map((o: any) => (
                      <div key={o.id} className="admin-stat-row">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                            #{o.id.slice(0, 8)}
                          </span>
                          <span className="text-muted" style={{ fontSize: 11 }}>
                            {o.buyer_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                            {Number(o.total_amount).toLocaleString('ru-RU')} ₽
                          </span>
                          <span className={`badge badge-${o.status}`} style={{ fontSize: 10 }}>
                            {{ processing: 'В обработке', shipped: 'Отправлен',
                               delivered: 'Доставлен', cancelled: 'Отменён' }[o.status as string]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Пользователи */}
            {tab === 'users' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th>Дата регистрации</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="admin-table__name">{user.name}</td>
                        <td className="text-muted" style={{ fontSize: 13 }}>{user.email}</td>
                        <td>
                          <select
                            className="input admin-table__role-select"
                            value={user.role}
                            style={{ color: ROLE_COLORS[user.role] }}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="buyer">Покупатель</option>
                            <option value="seller">Продавец</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </td>
                        <td className="text-muted" style={{ fontSize: 13 }}>
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Заказы */}
            {tab === 'orders' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID заказа</th>
                      <th>Покупатель</th>
                      <th>Сумма</th>
                      <th>Адрес</th>
                      <th>Статус</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>
                            #{order.id.slice(0, 8)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{order.buyer_name}</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>{order.buyer_email}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {Number(order.total_amount).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="text-muted" style={{ fontSize: 12, maxWidth: 200 }}>
                          {order.address}
                        </td>
                        <td>
                          <select
                            className="input admin-table__role-select"
                            value={order.status}
                            onChange={e => handleOrderStatus(order.id, e.target.value)}
                          >
                            <option value="processing">В обработке</option>
                            <option value="shipped">Отправлен</option>
                            <option value="delivered">Доставлен</option>
                            <option value="cancelled">Отменён</option>
                          </select>
                        </td>
                        <td className="text-muted" style={{ fontSize: 12 }}>
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Товары */}
            {tab === 'products' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>Бренд / OEM</th>
                      <th>Цена</th>
                      <th>Склад</th>
                      <th>Продавец</th>
                      <th>ТОП</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                            <span className="text-muted" style={{ fontSize: 11 }}>
                              {p.car_make} {p.car_model} {p.year} · {p.part_type}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 13 }}>{p.brand}</span>
                            {p.oem_code && (
                              <span className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                {p.oem_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {Number(p.price).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className={p.stock === 0 ? 'text-muted' : ''}>
                          {p.stock === 0 ? 'Нет' : `${p.stock} шт.`}
                        </td>
                        <td className="text-muted" style={{ fontSize: 12 }}>
                          {p.seller_name}
                        </td>
                        <td>
                          <button
                            className={`admin-promote-btn ${p.is_promoted ? 'active' : ''}`}
                            onClick={() => handlePromote(p.id, p.is_promoted)}
                            title={p.is_promoted ? 'Снять с продвижения' : 'Продвигать'}
                          >
                            {p.is_promoted ? '★' : '☆'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}