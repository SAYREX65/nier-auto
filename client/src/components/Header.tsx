import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';
import api from '../api';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { items = [] }   = useCart();
  const navigate         = useNavigate();
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Polling непрочитанных сообщений каждые 5 сек
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    const fetch = () => {
      api.get('/chats/unread')
        .then(r => setUnread(r.data.count))
        .catch(() => {});
    };

    fetch();
    pollRef.current = setInterval(fetch, 5000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  return (
    <header className="header">
      <div className="header__inner container">

        {/* Логотип */}
        <Link to="/" className="header__logo">
          Nier<span className="text-accent">:auto</span>
        </Link>

        {/* Навигация */}
        <nav className="header__nav">
          <Link to="/catalog" className="nav-link">Каталог</Link>
          <Link to="/ai"      className="nav-link">AI Подбор</Link>
          <Link to="/compare" className="nav-link">Сравнение</Link>

          {user && (
            <>
              <Link to="/orders" className="nav-link">Заказы</Link>
              <Link to="/chats"  className="nav-link nav-link--with-badge">
                Сообщения
                {unread > 0 && (
                  <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>
                )}
              </Link>
            </>
          )}

          {(user?.role === 'seller' || user?.role === 'admin') && (
            <Link to="/seller" className="nav-link">Продавец</Link>
          )}

          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link">Админ</Link>
          )}
        </nav>

        {/* Правая часть */}
        <div className="header__actions">

          {/* Корзина */}
          <Link to="/cart" className="header__cart">
            <span className="header__cart-icon">🛒</span>
            {cartCount > 0 && (
              <span className="header__cart-count">{cartCount}</span>
            )}
          </Link>

          {user ? (
            <div className="header__user">
              <Link to="/profile" className="header__profile">
                <div className="header__avatar">
                  {localStorage.getItem('avatar_' + user.id) ? (
                    <img
                      src={localStorage.getItem('avatar_' + user.id)!}
                      alt="avatar"
                      className="header__avatar-img"
                    />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="header__username">{user.name}</span>
              </Link>
              <button
                className="btn btn-ghost header__logout"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="header__auth">
              <Link to="/login"    className="btn btn-ghost">Войти</Link>
              <Link to="/register" className="btn btn-primary">Регистрация</Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}