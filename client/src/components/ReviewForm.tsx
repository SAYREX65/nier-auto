import { useState } from 'react';
import api from '../api';
import './ReviewForm.css';

interface Props {
  sellerId:  string;
  onSuccess: () => void;
}

export default function ReviewForm({ sellerId, onSuccess }: Props) {
  const [rating,    setRating]    = useState(5);
  const [comment,   setComment]   = useState('');
  const [imageUrl,  setImageUrl]  = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview,   setPreview]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState<'url' | 'file'>('url');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 2 МБ');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setImageUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setPreview(url);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalImageUrl = imageUrl;

      // Если выбран файл — конвертируем в base64 и отправляем
      if (imageFile) {
        finalImageUrl = preview; // base64
      }

      await api.post(`/sellers/${sellerId}/reviews`, {
        rating,
        comment,
        image_url: finalImageUrl || null,
      });

      // Сброс формы
      setRating(5);
      setComment('');
      setImageUrl('');
      setImageFile(null);
      setPreview('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка отправки отзыва');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="review-form card" onSubmit={handleSubmit}>
      <h3 className="review-form__title">Оставить отзыв</h3>

      {/* Звёзды */}
      <div className="form-group">
        <label className="form-label">Оценка</label>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              className={`star-picker__star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
          <span className="star-picker__label">{rating} из 5</span>
        </div>
      </div>

      {/* Комментарий */}
      <div className="form-group">
        <label className="form-label">Комментарий</label>
        <textarea
          className="input"
          rows={4}
          placeholder="Расскажите о вашем опыте с этим продавцом..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </div>

      {/* Изображение */}
      <div className="form-group">
        <label className="form-label">Фото (необязательно)</label>

        {/* Табы */}
        <div className="review-form__img-tabs">
          <button
            type="button"
            className={`review-form__img-tab ${tab === 'url' ? 'active' : ''}`}
            onClick={() => setTab('url')}
          >
            По ссылке
          </button>
          <button
            type="button"
            className={`review-form__img-tab ${tab === 'file' ? 'active' : ''}`}
            onClick={() => setTab('file')}
          >
            Загрузить файл
          </button>
        </div>

        {tab === 'url' && (
          <input
            type="url"
            className="input"
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={e => handleUrlChange(e.target.value)}
          />
        )}

        {tab === 'file' && (
          <div className="review-form__file-wrap">
            <label className="review-form__file-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <span className="btn btn-ghost">
                📎 Выбрать файл
              </span>
              {imageFile && (
                <span className="review-form__file-name">
                  {imageFile.name}
                </span>
              )}
            </label>
          </div>
        )}

        {/* Превью */}
        {preview && (
          <div className="review-form__preview">
            <img src={preview} alt="Превью" className="review-form__preview-img" />
            <button
              type="button"
              className="review-form__preview-remove"
              onClick={() => {
                setPreview('');
                setImageUrl('');
                setImageFile(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
      >
        {loading ? 'Отправляем...' : 'Отправить отзыв'}
      </button>
    </form>
  );
}