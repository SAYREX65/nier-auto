import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import './CartPage.css';

export default function CartPage() {
  const { items, removeItem, updateQty, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="page container">
        <div className="cart-empty">
          <span className="cart-empty__icon">🛒</span>
          <h2>Корзина пуста</h2>
          <p className="text-muted">Добавьте товары из каталога</p>
          <Link to="/catalog" className="btn btn-primary">Перейти в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Корзина</h1>

        <div className="cart__layout">

          {/* Список товаров */}
          <div className="cart__items">
            {items.map((item) => (
              <div key={item.product_id} className="cart-item card">

                <div className="cart-item__image">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} />
                    : <span>🔧</span>
                  }
                </div>

                <div className="cart-item__info">
                  <Link to={`/product/${item.product_id}`} className="cart-item__name">
                    {item.name}
                  </Link>
                  <p className="cart-item__meta text-muted">
                    {item.brand}
                  </p>
                  <p className="cart-item__price">
                    {item.price.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div className="cart-item__controls">
                  <div className="product-page__qty">
                    <button className="qty-btn"
                      onClick={() => updateQty(item.product_id, item.quantity - 1)}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn"
                      onClick={() => updateQty(item.product_id, item.quantity + 1)}>+</button>
                  </div>

                  <span className="cart-item__subtotal">
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>

                  <button
                    className="btn btn-danger"
                    onClick={() => removeItem(item.product_id)}
                  >
                    Удалить
                  </button>
                </div>

              </div>
            ))}

            <button className="btn btn-ghost" onClick={clearCart}>
              Очистить корзину
            </button>
          </div>

          {/* Итог */}
          <div className="cart__summary card">
            <h3 className="section-title">Итого</h3>

            <div className="summary__rows">
              {items.map((item) => (
                <div key={item.product_id} className="summary__row">
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    {item.name} × {item.quantity}
                  </span>
                  <span style={{ fontSize: 13 }}>
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>

            <hr className="divider" />

            <div className="summary__total">
              <span>Итого</span>
              <span className="summary__total-price">
                {totalAmount.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <button
              className="btn btn-primary summary__btn"
              onClick={() => navigate('/checkout')}
            >
              Оформить заказ
            </button>

            <Link to="/catalog" className="btn btn-ghost summary__btn">
              Продолжить покупки
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}