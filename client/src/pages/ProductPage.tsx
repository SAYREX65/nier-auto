import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Product } from '../types';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import './ProductPage.css';


export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(r => setProduct(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page container">Загрузка...</div>;
  if (!product) return <div className="page container">Товар не найден</div>;

  return (
    <div className="product-page page">
      <div className="container">

        {/* Хлебные крошки */}
        <nav className="breadcrumb">
          <Link to="/">Главная</Link>
          <span>/</span>
          <Link to="/catalog">Каталог</Link>
          <span>/</span>
          <Link to={`/catalog?part_type=${product.part_type}`}>{product.part_type}</Link>
          <span>/</span>
          <span className="text-muted">{product.name}</span>
        </nav>

        <div className="product-page__grid">

          {/* Изображение */}
          <div className="product-page__image-wrap card">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <div className="product-page__no-image">🔧</div>
            )}
          </div>

          {/* Информация */}
          <div className="product-page__info">
            {product.is_promoted === 1 && (
              <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', marginBottom: 12, display: 'inline-block' }}>
                ТОП ТОВАР
              </span>
            )}

            <h1 className="product-page__title">{product.name}</h1>

            <div className="product-page__meta">
              <div className="meta-row">
                <span className="meta-label">Бренд</span>
                <span className="meta-value text-accent">{product.brand}</span>
              </div>
              {product.oem_code && (
                <div className="meta-row">
                  <span className="meta-label">OEM-код</span>
                  <span className="meta-value" style={{ fontFamily: 'monospace' }}>
                    {product.oem_code}
                  </span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">Совместимость</span>
                <span className="meta-value">
                  {product.car_make} {product.car_model} {product.year}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Тип детали</span>
                <span className="meta-value">{product.part_type}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Наличие</span>
                <span className={`meta-value ${product.stock > 0 ? 'text-accent' : 'text-muted'}`}>
                  {product.stock > 0 ? `${product.stock} шт.` : 'Нет в наличии'}
                </span>
              </div>
            </div>

            {product.description && (
              <p className="product-page__desc">{product.description}</p>
            )}

            <div className="product-page__buy">
              <span className="product-page__price">
                {product.price.toLocaleString('ru-RU')} ₽
              </span>

              <div className="product-page__qty">
                <button className="qty-btn"
                  onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="qty-value">{qty}</span>
                <button className="qty-btn"
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
              </div>

              <button
                className="btn btn-primary product-page__add"
                disabled={product.stock === 0}
                onClick={() => addItem({
                  product_id: product.id,
                  name: product.name,
                  brand: product.brand,
                  price: product.price,
                  image_url: product.image_url,
                  stock: product.stock,
                }, qty)}
              >
                В корзину
              </button>

              <Link
                to={`/compare?add=${product.id}`}
                className="btn btn-ghost"
              >
                Сравнить
              </Link>
            </div>

            {/* Продавец */}
            <div className="seller-badge card">
              <Link to={`/seller/${product.seller_id}`} className="seller-badge__link">
                <div className="seller-badge__info">
                  <span className="seller-badge__name">{product.seller_name}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>Продавец</span>
                </div>
                {Number(product.seller_rating) > 0 && (
                  <span className="seller-badge__rating">
                    ★ {Number(product.seller_rating).toFixed(1)}
                  </span>
                )}
              </Link>
              {user && user.role !== 'seller' && user.id !== product.seller_id && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13, marginTop: 8 }}
                  onClick={async () => {
                    try {
                      await api.post('/chats', { seller_id: product.seller_id });
                      navigate('/chats');
                    } catch (err: any) {
                      alert(err.response?.data?.error ?? 'Ошибка');
                    }
                  }}
                >
                  Написать продавцу
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}