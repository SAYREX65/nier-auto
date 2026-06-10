import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import { useAuth } from '../hooks/useAuth';
import './SellerPage.css';

interface SellerInfo {
  id:            string;
  name:          string;
  email:         string;
  avg_rating:    number;
  review_count:  number;
  product_count: number;
  total_sales:   number;
  created_at:    string;
}

interface Review {
  id:            string;
  rating:        number;
  comment:       string | null;
  image_url:     string | null;
  created_at:    string;
  reviewer_name: string;
  reviewer_id:   string;
}

export default function SellerPage() {
  const { id }   = useParams<{ id: string }>();
  const { user } = useAuth();

  const [seller,   setSeller]   = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [loading,  setLoading]  = useState(true);

  const fetchSeller = () => {
    setLoading(true);
    api.get(`/sellers/${id}`)
      .then(r => {
        setSeller(r.data.seller);
        setProducts(r.data.products);
        setReviews(r.data.reviews);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSeller(); }, [id]);

  if (loading) return <div className="page container">Загрузка...</div>;
  if (!seller) return <div className="page container">Продавец не найден</div>;

  const alreadyReviewed = reviews.some(r => r.reviewer_id === user?.id);
  const canReview       = user && user.role === 'buyer' && user.id !== id;

  return (
    <div className="page">
      <div className="container">

        {/* Профиль продавца */}
        <div className="seller-profile card">
          <div className="seller-profile__avatar">
            {seller.name.charAt(0).toUpperCase()}
          </div>

          <div className="seller-profile__info">
            <h1 className="seller-profile__name">{seller.name}</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>
              На сайте с {new Date(seller.created_at).toLocaleDateString('ru-RU', {
                month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {/* Статистика */}
          <div className="seller-profile__stats">
            <div className="seller-stat">
              <span className="seller-stat__value text-accent">
                {Number(seller.avg_rating).toFixed(1)}
              </span>
              <span className="seller-stat__label text-muted">Рейтинг</span>
            </div>
            <div className="seller-stat">
              <span className="seller-stat__value">{seller.review_count}</span>
              <span className="seller-stat__label text-muted">Отзывов</span>
            </div>
            <div className="seller-stat">
              <span className="seller-stat__value">{seller.product_count}</span>
              <span className="seller-stat__label text-muted">Товаров</span>
            </div>
            <div className="seller-stat">
              <span className="seller-stat__value">{seller.total_sales}</span>
              <span className="seller-stat__label text-muted">Продаж</span>
            </div>
          </div>

          {/* Звёзды */}
          <div className="seller-profile__stars">
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={`seller-star ${star <= Math.round(seller.avg_rating) ? 'active' : ''}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="seller-page__layout">

          {/* Товары продавца */}
          <div className="seller-page__main">
            <h2 className="section-title">
              Товары продавца
              <span className="text-muted" style={{ fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                ({products.length})
              </span>
            </h2>

            {products.length === 0 ? (
              <p className="text-muted">У продавца нет товаров</p>
            ) : (
              <div className="products-grid">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>

          {/* Отзывы */}
          <div className="seller-page__reviews">
            <h2 className="section-title">
              Отзывы
              <span className="text-muted" style={{ fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                ({reviews.length})
              </span>
            </h2>

            {/* Уже оставил отзыв */}
            {alreadyReviewed && (
              <div className="review-already card">
                <span>✅</span>
                <p>Вы уже оставили отзыв этому продавцу</p>
              </div>
            )}

            {/* Форма отзыва */}
            {canReview && !alreadyReviewed && (
              <ReviewForm
                sellerId={id!}
                onSuccess={fetchSeller}
              />
            )}

            {/* Не авторизован */}
            {!user && (
              <div className="review-login-hint card">
                <p className="text-muted">
                  Войдите как покупатель чтобы оставить отзыв
                </p>
              </div>
            )}

            {/* Список отзывов */}
            {reviews.length === 0 ? (
              <div className="reviews-empty">
                <span style={{ fontSize: 36, opacity: 0.2 }}>⭐</span>
                <p className="text-muted">Отзывов пока нет</p>
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}