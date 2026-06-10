import './ReviewCard.css';

interface Review {
  id:            string;
  rating:        number;
  comment:       string | null;
  image_url:     string | null;
  created_at:    string;
  reviewer_name: string;
  reviewer_id:   string;
}

interface Props {
  review: Review;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`star ${s <= rating ? 'star--active' : ''}`}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewCard({ review }: Props) {
  return (
    <div className="review-card card">

      {/* Шапка */}
      <div className="review-card__header">
        <div className="review-card__avatar">
          {review.reviewer_name.charAt(0).toUpperCase()}
        </div>
        <div className="review-card__meta">
          <span className="review-card__name">{review.reviewer_name}</span>
          <span className="review-card__date text-muted">
            {new Date(review.created_at).toLocaleDateString('ru-RU', {
              day:   '2-digit',
              month: 'long',
              year:  'numeric',
            })}
          </span>
        </div>
        <Stars rating={review.rating} />
      </div>

      {/* Текст */}
      {review.comment && (
        <p className="review-card__comment">{review.comment}</p>
      )}

      {/* Изображение */}
      {review.image_url && (
        <div className="review-card__image-wrap">
          <img
            src={review.image_url}
            alt="Фото к отзыву"
            className="review-card__image"
            onClick={() => window.open(review.image_url!, '_blank')}
          />
        </div>
      )}

    </div>
  );
}