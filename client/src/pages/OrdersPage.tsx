import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './OrdersPage.css';

interface OrderItem {
  product_id: string;
  seller_id: string;
  name: string;
  brand: string;
  oem_code: string | null;
  image_url: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  buyer_id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  address: string;
  created_at: string;
  items: OrderItem[];
}

const CancelTimer = memo(function CancelTimer({ createdAt, onExpire, onCancel }: {
  createdAt: string;
  onExpire: () => void;
  onCancel: () => void;
}) {
  const getSecondsLeft = () => {
    const date = new Date(createdAt.replace(' ', 'T') + 'Z');
    const diff = 600 - Math.floor((Date.now() - date.getTime()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    firedRef.current = false;
    const interval = setInterval(() => {
      const left = getSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]); // eslint-disable-line

  if (secondsLeft <= 0) return null;

  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const s = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="cancel-timer">
      <span className="cancel-timer__time">{m}:{s}</span>
      <span className="cancel-timer__label"> осталось для отмены</span>
      <button className="btn btn-danger btn-sm" onClick={onCancel}>
        Отменить заказ
      </button>
    </div>
  );
});

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    processing: 'Обрабатывается',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменён',
  };
  return (
    <span className={`badge badge-${status}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'active' | 'history'>('active');
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [seenHistoryCount, setSeenHistoryCount] = useState<number>(() => {
    return Number(localStorage.getItem('seen_history_count') ?? 0);
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get('/orders', { signal: controller.signal })
      .then(r => setOrders(r.data))
      .catch(err => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error(err);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleExpire = useCallback((orderId: string) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o)
    );
    api.put(`/orders/${orderId}/status`, { status: 'shipped' }).catch(console.error);
  }, []);

  const handleCancel = useCallback((orderId: string) => {
    setCancelConfirm(orderId);
  }, []);

  const confirmCancel = async () => {
    if (!cancelConfirm) return;
    try {
      await api.put(`/orders/${cancelConfirm}/status`, { status: 'cancelled' });
      setOrders(prev =>
        prev.map(o => o.id === cancelConfirm ? { ...o, status: 'cancelled' } : o)
      );
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Ошибка отмены заказа');
    } finally {
      setCancelConfirm(null);
    }
  };

  const handleOpenChat = async (order: Order) => {
    const sellerId = order.items?.[0]?.seller_id;
    if (!sellerId) {
      alert('Не удалось определить продавца');
      return;
    }
    setChatLoading(order.id);
    try {
      await api.post('/chats', { order_id: order.id, seller_id: sellerId });
      navigate('/chats');
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Ошибка создания чата');
    } finally {
      setChatLoading(null);
    }
  };

  const activeOrders  = orders.filter(o => ['processing', 'shipped'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const displayed     = tab === 'active' ? activeOrders : historyOrders;

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <p className="text-muted">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page page">
      <div className="container">
        <h1 className="page-title">Мои заказы</h1>

        {/* Модалка подтверждения отмены */}
        {cancelConfirm && (
          <div className="confirm-overlay">
            <div className="confirm-modal card">
              <h3>Отменить заказ?</h3>
              <p className="text-muted">Это действие нельзя отменить.</p>
              <div className="confirm-modal__actions">
                <button className="btn btn-ghost" onClick={() => setCancelConfirm(null)}>
                  Назад
                </button>
                <button className="btn btn-danger" onClick={confirmCancel}>
                  Да, отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Табы */}
        <div className="orders-tabs">
          <button
            className={`orders-tab ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            Активные
            {activeOrders.length > 0 && (
              <span className="orders-tab__count">{activeOrders.length}</span>
            )}
          </button>
          <button
            className={`orders-tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setTab('history');
              setSeenHistoryCount(historyOrders.length);
              localStorage.setItem('seen_history_count', String(historyOrders.length));
            }}
          >
            История покупок
            {historyOrders.length > seenHistoryCount && (
              <span className="orders-tab__count">
                {historyOrders.length - seenHistoryCount}
              </span>
            )}
          </button>
        </div>

        {/* Пустое состояние */}
        {displayed.length === 0 ? (
          <div className="orders-empty">
            <span style={{ fontSize: 48, opacity: 0.2 }}>
              {tab === 'active' ? '📦' : '🧾'}
            </span>
            <p className="text-muted">
              {tab === 'active' ? 'Нет активных заказов' : 'История заказов пуста'}
            </p>
          </div>
        ) : (
          <div className="orders-list">
            {displayed.map(order => (
              <div key={order.id} className="order-card card">

                {/* Шапка */}
                <div className="order-card__header">
                  <div className="order-card__header-left">
                    <span className="order-card__id">
                      Заказ #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="order-card__date text-muted">
                      {new Date(order.created_at.replace(' ', 'T')).toLocaleString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Таймер отмены */}
                {order.status === 'processing' && (
                  <CancelTimer
                    createdAt={order.created_at}
                    onExpire={() => handleExpire(order.id)}
                    onCancel={() => handleCancel(order.id)}
                  />
                )}

                {/* Товары */}
                <div className="order-card__items">
                  {order.items?.map((item, i) => (
                    <div key={i} className="order-item">
                      <div className="order-item__img-wrap">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="order-item__img" />
                        ) : (
                          <div className="order-item__no-img">🔧</div>
                        )}
                      </div>
                      <div className="order-item__info">
                        <span className="order-item__name">{item.name}</span>
                        <span className="order-item__brand text-muted">{item.brand}</span>
                        {item.oem_code && (
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            OEM: {item.oem_code}
                          </span>
                        )}
                      </div>
                      <div className="order-item__qty">× {item.quantity}</div>
                      <div className="order-item__price">
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  ))}
                </div>

                {/* Подвал */}
                <div className="order-card__footer">
                  <div className="order-card__footer-left">
                    <span className="text-muted" style={{ fontSize: 13 }}>
                      📍 {order.address}
                    </span>
                    <span className="text-muted" style={{ fontSize: 13 }}>
                      💳 {
                        order.payment_method === 'card'   ? 'Картой'   :
                        order.payment_method === 'cash'   ? 'Наличными' :
                        order.payment_method === 'online' ? 'Онлайн'   :
                        order.payment_method
                      }
                    </span>
                  </div>
                  <div className="order-card__footer-right">
                    <span className="order-card__total">
                      {order.total_amount.toLocaleString('ru-RU')} ₽
                    </span>
                    {['processing', 'shipped'].includes(order.status) && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 13 }}
                        onClick={() => handleOpenChat(order)}
                        disabled={chatLoading === order.id}
                      >
                        {chatLoading === order.id ? 'Открываем...' : '💬 Написать продавцу'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}