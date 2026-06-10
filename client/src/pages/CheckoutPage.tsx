import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../hooks/useCart';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { items, totalAmount: total, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    address: '',
    payment_method: 'card',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address.trim()) {
      setError('Укажите адрес доставки');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderItems = items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
      }));

      const { data } = await api.post('/orders', {
        items: orderItems,
        address: form.address,
        payment_method: form.payment_method,
      });

      clearCart();
      navigate(`/orders?success=${data.orderId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при оформлении заказа');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Оформление заказа</h1>

        <div className="checkout__layout">

          {/* Форма */}
          <form className="checkout__form" onSubmit={handleSubmit}>

            <div className="checkout__section card">
              <h3 className="section-title">Доставка</h3>

              <div className="form-group">
                <label className="form-label">Адрес доставки</label>
                <input
                  className="input"
                  placeholder="Город, улица, дом, квартира"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="checkout__section card">
              <h3 className="section-title">Способ оплаты</h3>

              <div className="payment-options">
                {PAYMENT_METHODS.map(pm => (
                  <label key={pm.value} className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value={pm.value}
                      checked={form.payment_method === pm.value}
                      onChange={() => setForm(f => ({ ...f, payment_method: pm.value }))}
                    />
                    <div className={`payment-option__card ${form.payment_method === pm.value ? 'active' : ''
                      }`}>
                      <span className="payment-option__icon">{pm.icon}</span>
                      <span>{pm.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary checkout__submit"
              disabled={loading}
            >
              {loading ? 'Оформляем...' : `Подтвердить заказ — ${total.toLocaleString('ru-RU')} ₽`}
            </button>

          </form>

          {/* Сводка заказа */}
          <div className="checkout__summary card">
            <h3 className="section-title">Ваш заказ</h3>

            {items.map(item => (
              <div key={item.product_id} className="checkout-item">
                <span className="checkout-item__name">
                  {item.name} <span className="text-muted">× {item.quantity}</span>
                </span>
                <span className="checkout-item__price">
                  {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ))}

            <hr className="divider" />

            <div className="checkout__total">
              <span>Итого</span>
              <span className="text-accent" style={{ fontSize: 22, fontWeight: 600 }}>
                {total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: 'card', label: 'Банковская карта', icon: '💳' },
  { value: 'cash', label: 'Наличные', icon: '💵' },
  { value: 'online', label: 'Онлайн-оплата', icon: '📱' },
];