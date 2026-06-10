import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext'; 
import { Product } from '../types';
import './ProductCard.css';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { addItem, items = [] } = useCart();
  const inCart = items.some(i => i.product_id === product.id);

  return (
    <div className={`product-card card ${product.is_promoted ? 'product-card--promoted' : ''}`}>

      {product.is_promoted !== 0 && (
        <div className="product-card__promoted">ТОП</div>
      )}

      <Link to={`/product/${product.id}`} className="product-card__image-wrap">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-card__image"
          />
        ) : (
          <div className="product-card__no-image">🔧</div>
        )}
      </Link>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__brand">{product.brand}</span>
          {product.oem_code && (
            <span className="product-card__oem text-muted">{product.oem_code}</span>
          )}
        </div>

        <Link to={`/product/${product.id}`}>
          <h3 className="product-card__name">{product.name}</h3>
        </Link>

        <p className="product-card__compat text-muted">
          {product.car_make} {product.car_model} {product.year}
        </p>

        <div className="product-card__seller">
          <Link to={`/seller/${product.seller_id}`} className="product-card__seller-link">
            {product.seller_name}
          </Link>
          {product.seller_rating > 0 && (
            <span className="product-card__rating">
              ★ {Number(product.seller_rating).toFixed(1)}
            </span>
          )}
        </div>

        <div className="product-card__footer">
          <span className="product-card__price">
            {product.price.toLocaleString('ru-RU')} ₽
          </span>
          <button
            className={`btn ${inCart ? 'btn-ghost' : 'btn-primary'} product-card__btn`}
            onClick={() => addItem({
              product_id: product.id,
              name:       product.name,
              brand:      product.brand,
              price:      product.price,
              image_url:  product.image_url,
              stock:      product.stock,
            })}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'Нет в наличии' : inCart ? 'В корзине' : 'В корзину'}
          </button>
        </div>
      </div>
    </div>
  );
}