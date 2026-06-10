import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [target, duration]);

  return count;
}

interface Stats {
  products: number;
  sellers: number;
  makes: number;
  brands: number;
}

function StatCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <div className="stat-card">
      <span className="stat-card__value">{count}{suffix}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

export default function HomePage() {
  const [promoted, setPromoted] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ products: 0, sellers: 0, makes: 0, brands: 0 });

  useEffect(() => {
    api.get('/products?limit=8').then(r => setPromoted(r.data.products));
    api.get('/products/meta/filters').then(r => {
      setStats({
        products: 0,
        sellers:  0,
        makes:    r.data.makes.length,
        brands:   r.data.brands.length,
      });
      api.get('/products?limit=1').then(p => {
        setStats(prev => ({
          ...prev,
          products: p.data.pagination.total,
        }));
      });
    });
  }, []);

  return (
    <div className="home">

      {/* Hero */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__stats">
            <h2 className="hero__stats-title">Платформа в цифрах</h2>
            <div className="hero__stats-grid">
              <StatCard label="Товаров в каталоге" value={stats.products} suffix="+" />
              <StatCard label="Марок автомобилей"  value={stats.makes}    suffix="+" />
              <StatCard label="Брендов запчастей"  value={stats.brands}   suffix="+" />
              <StatCard label="Довольных клиентов" value={1240}           suffix="+" />
            </div>
          </div>

          <div className="hero__content">
            <h1 className="hero__title">
              Запчасти для<br />
              <span className="text-accent">любого авто</span>
            </h1>
            <p className="hero__subtitle">
              Оригинальные и аналоговые запчасти с доставкой.
              AI-подбор по симптому, сравнение и рейтинг продавцов.
            </p>
            <div className="hero__actions">
              <Link to="/catalog" className="btn btn-primary">Перейти в каталог</Link>
              <Link to="/ai" className="btn btn-ghost">AI-подбор</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Факты об индустрии */}
      <section className="facts-section">
        <div className="container">
          <p className="facts-section__eyebrow">Рынок автозапчастей сегодня</p>
          <div className="facts-grid">
            <div className="fact-item">
              <span className="fact-item__number">73%</span>
              <span className="fact-item__text">
                автовладельцев переплачивают за запчасти через посредников
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-item__number">40%</span>
              <span className="fact-item__text">
                средняя наценка перекупщика сверх реальной стоимости детали
              </span>
            </div>
            <div className="fact-item">
              <span className="fact-item__number">1 из 3</span>
              <span className="fact-item__text">
                покупателей не знает артикул нужной детали и уходит ни с чем
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Манифест */}
      <section className="manifest-section">
        <div className="container manifest-section__inner">
          <p className="manifest-section__label">наш ответ</p>
          <h2 className="manifest-section__title">
            Мы устали от посредников.<br />
            Поэтому построили место,<br />
            где продавец и покупатель<br />
            <span className="manifest-section__accent">говорят напрямую.</span>
          </h2>
          <p className="manifest-section__sub">
            Никаких скрытых наценок. Никаких звонков в пустоту.<br />
            Только реальные продавцы, честные цены и AI который знает что вам нужно —
            даже если вы сами ещё не знаете.
          </p>
          <Link to="/catalog" className="btn btn-primary manifest-section__btn">
            Найти запчасть
          </Link>
        </div>
      </section>

      {/* Популярные товары */}
      <section className="container">
        <div className="home__section-header">
          <h2 className="section-title">Популярные товары</h2>
          <Link to="/catalog" className="text-accent" style={{ fontSize: 14 }}>
            Смотреть все →
          </Link>
        </div>
        <div className="products-grid">
          {promoted.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Категории */}
      <section className="container home__categories">
        <h2 className="section-title">Категории</h2>
        <div className="categories-grid">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.type}
              to={`/catalog?part_type=${encodeURIComponent(cat.type)}`}
              className="category-card card"
            >
              <span className="category-card__icon">{cat.icon}</span>
              <span className="category-card__name">{cat.type}</span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

const CATEGORIES = [
  { type: 'Тормозная система',  icon: '🔴' },
  { type: 'Двигатель',          icon: '⚙️' },
  { type: 'Подвеска',           icon: '🔩' },
  { type: 'Рулевое управление', icon: '🎯' },
  { type: 'Электрика',          icon: '⚡' },
  { type: 'Кузов',              icon: '🚗' },
  { type: 'Трансмиссия',        icon: '🔧' },
  { type: 'Охлаждение',         icon: '❄️' },
];