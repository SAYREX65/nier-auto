import { useState } from 'react';
import api from '../api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import './AIDiagnosePage.css';

const EXAMPLES = [
  'Стучит при повороте руля',
  'Скрипят тормоза при торможении',
  'Машину уводит в сторону',
  'Вибрирует руль на скорости',
  'Течёт масло снизу двигателя',
];

export default function AIDiagnosePage() {
  const [symptom, setSymptom]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{
    diagnosis: string[];
    products: Product[];
    message: string;
  } | null>(null);
  const [error, setError]         = useState('');

  const handleDiagnose = async () => {
    if (!symptom.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post('/ai/diagnose', { symptom });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка AI сервиса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">

        <div className="ai-header">
          <h1 className="page-title">
            <span className="text-accent">AI</span>-подбор запчастей
          </h1>
          <p className="text-secondary" style={{ fontSize: 15, maxWidth: 560 }}>
            Опишите симптом или проблему с автомобилем —
            искусственный интеллект определит нужные запчасти
            и покажет подходящие товары.
          </p>
        </div>

        {/* Форма */}
        <div className="ai-form card">
          <textarea
            className="input ai-form__textarea"
            placeholder="Например: при повороте слышен стук, машину тянет влево..."
            value={symptom}
            onChange={e => setSymptom(e.target.value)}
            rows={4}
          />

          {/* Примеры */}
          <div className="ai-form__examples">
            <span className="text-muted" style={{ fontSize: 12 }}>Примеры:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                className="ai-example-btn"
                onClick={() => setSymptom(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary ai-form__submit"
            onClick={handleDiagnose}
            disabled={loading || !symptom.trim()}
          >
            {loading ? (
              <span className="ai-loading">
                <span className="ai-loading__dot" />
                Анализируем...
              </span>
            ) : '⚡ Подобрать запчасти'}
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="ai-error">{error}</div>
        )}

        {/* Результат */}
        {result && (
          <div className="ai-result">

            <div className="ai-diagnosis card">
              <h3 className="section-title">Диагноз AI</h3>
              <p className="text-secondary" style={{ marginBottom: 16, fontSize: 14 }}>
                {result.message}
              </p>
              <div className="ai-diagnosis__tags">
                {result.diagnosis.map(d => (
                  <span key={d} className="ai-tag">{d}</span>
                ))}
              </div>
            </div>

            {result.products.length > 0 ? (
              <>
                <h2 className="section-title" style={{ marginTop: 32 }}>
                  Подходящие товары
                </h2>
                <div className="products-grid">
                  {result.products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            ) : (
              <div className="ai-no-products">
                <p className="text-muted">
                  По данному диагнозу товары не найдены.
                  Попробуйте другое описание или
                  <a href="/catalog" className="text-accent"> перейдите в каталог</a>.
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}