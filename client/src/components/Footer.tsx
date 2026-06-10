import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">

        <div className="footer__brand">
          <span className="footer__logo">
            Nier<span className="text-accent">:auto</span>
          </span>
          <p className="footer__desc text-muted">
            Платформа для покупки и продажи автозапчастей
            с AI-подбором и рейтингом продавцов.
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <span className="footer__col-title">Покупателям</span>
            <Link to="/catalog">Каталог</Link>
            <Link to="/ai">AI-подбор</Link>
            <Link to="/compare">Сравнение</Link>
            <Link to="/orders">Мои заказы</Link>
          </div>
          <div className="footer__col">
            <span className="footer__col-title">Продавцам</span>
            <Link to="/register">Стать продавцом</Link>
            <Link to="/seller-dashboard">Панель продавца</Link>
          </div>
          <div className="footer__col">
            <span className="footer__col-title">Аккаунт</span>
            <Link to="/profile">Личный кабинет</Link>
            <Link to="/login">Войти</Link>
            <Link to="/register">Регистрация</Link>
          </div>
        </div>

      </div>

      <div className="container footer__bottom">
        <span className="text-muted" style={{ fontSize: 12 }}>
          © {new Date().getFullYear()} Nier:auto — Дипломный проект
        </span>
      </div>
    </footer>
  );
}