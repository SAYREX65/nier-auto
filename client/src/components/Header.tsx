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
  const [menuOpen, setMenuOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const fetch = () => {
      api.get('/chats/unread').then(r => setUnread(r.data.count)).catch(() => {});
    };
    fetch();
    pollRef.current = setInterval(fetch, 5000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  // Закрывать меню при переходе
  const close = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header__inner container">

        {/* Логотип */}
        <Link to="/" className="header__logo" onClick={close}>
          Nier<span className="text-accent">:auto</span>
        </Link>

        {/* Навигация десктоп */}
        <nav className="header__nav">
          <Link to="/catalog" className="nav-link">Каталог</Link>
          <Link to="/ai"      className="nav-link">AI Подбор</Link>
          <Link to="/compare" className="nav-link">Сравнение</Link>
          {user && (
            <>
              <Link to="/orders" className="nav-link">Заказы</Link>
              <Link to="/chats"  className="nav-link nav-link--with-badge">
                Сообщения
                {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
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

          <Link to="/cart" className="header__cart" onClick={close}>
            <span className="header__cart-icon">🛒</span>
            {cartCount > 0 && <span className="header__cart-count">{cartCount}</span>}
          </Link>

          {user ? (
            <div className="header__user">
              <Link to="/profile" className="header__profile" onClick={close}>
                <div className="header__avatar">
                  {localStorage.getItem('avatar_' + user.id) ? (
                    <img src={localStorage.getItem('avatar_' + user.id)!} alt="avatar" className="header__avatar-img" />
                  ) : (
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="header__username">{user.name}</span>
              </Link>
              <button className="btn btn-ghost header__logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <div className="header__auth">
              <Link to="/login"    className="btn btn-ghost"    onClick={close}>Войти</Link>
              <Link to="/register" className="btn btn-primary"  onClick={close}>Регистрация</Link>
            </div>
          )}

          {/* Бургер */}
          <button
            className={`header__burger ${menuOpen ? 'header__burger--open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Меню"
          >
            <span /><span /><span />
          </button>

        </div>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <nav className="header__mobile-nav">
          <Link to="/catalog" className="mobile-nav-link" onClick={close}>Каталог</Link>
          <Link to="/ai"      className="mobile-nav-link" onClick={close}>AI Подбор</Link>
          <Link to="/compare" className="mobile-nav-link" onClick={close}>Сравнение</Link>
          {user && (
            <>
              <Link to="/orders" className="mobile-nav-link" onClick={close}>Заказы</Link>
              <Link to="/chats"  className="mobile-nav-link" onClick={close}>
                Сообщения {unread > 0 && <span className="nav-badge nav-badge--inline">{unread}</span>}
              </Link>
            </>
          )}
          {(user?.role === 'seller' || user?.role === 'admin') && (
            <Link to="/seller" className="mobile-nav-link" onClick={close}>Продавец</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="mobile-nav-link" onClick={close}>Админ</Link>
          )}
          {user ? (
            <button className="mobile-nav-link mobile-nav-link--btn" onClick={handleLogout}>
              Выйти
            </button>
          ) : (
            <>
              <Link to="/login"    className="mobile-nav-link" onClick={close}>Войти</Link>
              <Link to="/register" className="mobile-nav-link" onClick={close}>Регистрация</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}