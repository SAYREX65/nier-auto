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
  const [showPayModal, setShowPayModal] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address.trim()) {
      setError('Укажите адрес доставки');
      return;
    }

    if (form.payment_method === 'online') {
      setShowPayModal(true);
      return;
    }

    await placeOrder();
  };

  const placeOrder = async () => {
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

  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cardForm.number.replace(/\s/g, '');
    if (digits.length < 16) { setError('Введите корректный номер карты'); return; }
    if (!cardForm.name.trim()) { setError('Введите имя держателя'); return; }
    if (cardForm.expiry.length < 5) { setError('Введите срок действия'); return; }
    if (cardForm.cvv.length < 3) { setError('Введите CVV'); return; }

    setCardLoading(true);
    setError('');
    // Имитация обработки платежа
    await new Promise(r => setTimeout(r, 2000));
    setCardLoading(false);
    setCardSuccess(true);
    await new Promise(r => setTimeout(r, 1200));
    setShowPayModal(false);
    await placeOrder();
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
                    <div className={`payment-option__card ${form.payment_method === pm.value ? 'active' : ''}`}>
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

      {/* Модал оплаты картой */}
      {showPayModal && (
        <div className="pay-modal-overlay" onClick={() => !cardLoading && setShowPayModal(false)}>
          <div className="pay-modal" onClick={e => e.stopPropagation()}>
            {cardSuccess ? (
              <div className="pay-modal__success">
                <div className="pay-modal__success-icon">✓</div>
                <p>Оплата прошла успешно!</p>
              </div>
            ) : (
              <>
                <div className="pay-modal__header">
                  <h3>Оплата картой</h3>
                  <button className="pay-modal__close" onClick={() => setShowPayModal(false)}>✕</button>
                </div>

                <div className="pay-card-preview">
                  <div className="pay-card-preview__chip">■■</div>
                  <div className="pay-card-preview__number">
                    {cardForm.number || '•••• •••• •••• ••••'}
                  </div>
                  <div className="pay-card-preview__bottom">
                    <span>{cardForm.name || 'ИМЯ ДЕРЖАТЕЛЯ'}</span>
                    <span>{cardForm.expiry || 'MM/YY'}</span>
                  </div>
                </div>

                <form className="pay-modal__form" onSubmit={handleCardPay}>
                  <div className="form-group">
                    <label className="form-label">Номер карты</label>
                    <input
                      className="input"
                      placeholder="0000 0000 0000 0000"
                      value={cardForm.number}
                      maxLength={19}
                      onChange={e => setCardForm(f => ({ ...f, number: formatCardNumber(e.target.value) }))}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Имя держателя</label>
                    <input
                      className="input"
                      placeholder="IVAN PETROV"
                      value={cardForm.name}
                      onChange={e => setCardForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="pay-modal__row">
                    <div className="form-group">
                      <label className="form-label">Срок действия</label>
                      <input
                        className="input"
                        placeholder="MM/YY"
                        value={cardForm.expiry}
                        maxLength={5}
                        onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input
                        className="input"
                        placeholder="•••"
                        type="password"
                        value={cardForm.cvv}
                        maxLength={3}
                        onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }))}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <button
                    type="submit"
                    className="btn btn-primary pay-modal__btn"
                    disabled={cardLoading}
                  >
                    {cardLoading
                      ? <span className="pay-modal__spinner">⟳</span>
                      : `Оплатить ${total.toLocaleString('ru-RU')} ₽`}
                  </button>
                  <p className="pay-modal__secure">🔒 Защищено 256-bit SSL шифрованием</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: 'card',   label: 'Наличные',       icon: '💵' },
  { value: 'online', label: 'Картой онлайн',  icon: '💳' },
  { value: 'cash',   label: 'При получении',  icon: '📦' },
];
