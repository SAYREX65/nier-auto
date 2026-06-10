import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import { Product } from '../types';
import './ComparePage.css';

const MAX_COMPARE = 4;

const COMPARE_FIELDS: { key: keyof Product; label: string; better?: 'min' | 'max' }[] = [
  { key: 'brand',       label: 'Бренд' },
  { key: 'oem_code',    label: 'OEM-код' },
  { key: 'part_type',   label: 'Тип детали' },
  { key: 'car_make',    label: 'Марка авто' },
  { key: 'car_model',   label: 'Модель авто' },
  { key: 'year',        label: 'Год выпуска',    better: 'max' },
  { key: 'price',       label: 'Цена',           better: 'min' },
  { key: 'stock',       label: 'Наличие',        better: 'max' },
  { key: 'seller_name', label: 'Продавец' },
  { key: 'seller_rating', label: 'Рейтинг продавца', better: 'max' },
  { key: 'description', label: 'Описание' },
];

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts]           = useState<Product[]>([]);
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching]         = useState(false);

  const ids = searchParams.getAll('id');

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); return; }
    Promise.all(ids.map(id => api.get(`/products/${id}`)))
      .then(results => setProducts(results.map(r => r.data)))
      .catch(() => {});
  }, [searchParams]);

  const addId = searchParams.get('add');
  useEffect(() => {
    if (!addId || ids.includes(addId)) return;
    if (ids.length >= MAX_COMPARE) return;
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    next.append('id', addId);
    setSearchParams(next);
  }, [addId]);

  const addProduct = (product: Product) => {
    if (ids.includes(product.id) || ids.length >= MAX_COMPARE) return;
    const next = new URLSearchParams(searchParams);
    next.append('id', product.id);
    setSearchParams(next);
    setSearch('');
    setSearchResults([]);
  };

  const removeProduct = (id: string) => {
    const next = new URLSearchParams();
    ids.filter(i => i !== id).forEach(i => next.append('id', i));
    setSearchParams(next);
  };

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      api.get(`/products?search=${encodeURIComponent(search)}&limit=5`)
        .then(r => setSearchResults(r.data.products))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Получаем лучшее значение по полю
  const getBest = (key: keyof Product, better: 'min' | 'max') => {
    if (products.length < 2) return null;
    const vals = products
      .map(p => Number(p[key]))
      .filter(v => !isNaN(v) && v > 0);
    if (vals.length < 2) return null;
    return better === 'min' ? Math.min(...vals) : Math.max(...vals);
  };

  const isBestValue = (product: Product, key: keyof Product, better?: 'min' | 'max') => {
    if (!better || products.length < 2) return false;
    const best = getBest(key, better);
    if (best === null) return false;
    return Number(product[key]) === best;
  };

  // Все ли значения одинаковые в строке
  const allSame = (key: keyof Product) => {
    if (products.length < 2) return false;
    const vals = products.map(p => String(p[key] ?? ''));
    return vals.every(v => v === vals[0]);
  };

  const formatValue = (product: Product, key: keyof Product) => {
    const val = product[key];
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'price') return `${Number(val).toLocaleString('ru-RU')} ₽`;
    if (key === 'stock') return Number(val) > 0 ? `${val} шт.` : 'Нет';
    if (key === 'seller_rating') {
      const n = Number(val);
      return n > 0 ? `★ ${n.toFixed(1)}` : '—';
    }
    if (key === 'year') return String(val);
    return String(val);
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Сравнение товаров</h1>

        {/* Добавление товара */}
        {ids.length < MAX_COMPARE && (
          <div className="compare-add">
            <div className="compare-add__input-wrap">
              <input
                className="input"
                placeholder="Поиск товара для сравнения..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {(searchResults.length > 0 || searching) && (
                <div className="compare-add__dropdown">
                  {searching && (
                    <div className="compare-add__option text-muted">Поиск...</div>
                  )}
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      className="compare-add__option"
                      onClick={() => addProduct(p)}
                      disabled={ids.includes(p.id)}
                    >
                      <span className="compare-add__option-name">{p.name}</span>
                      <span className="compare-add__option-meta text-muted">
                        {p.brand} · {p.price.toLocaleString('ru-RU')} ₽
                      </span>
                      {ids.includes(p.id) && (
                        <span className="text-muted" style={{ fontSize: 11 }}>Уже добавлен</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Можно сравнить до {MAX_COMPARE} товаров · добавлено {ids.length}
            </p>
          </div>
        )}

        {products.length === 0 ? (
          <div className="compare-empty">
            <span style={{ fontSize: 48, opacity: 0.2 }}>📊</span>
            <p className="text-muted">Добавьте товары для сравнения</p>
            <Link to="/catalog" className="btn btn-primary">В каталог</Link>
          </div>
        ) : (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="compare-table__label-col">Характеристика</th>
                  {products.map(p => (
                    <th key={p.id} className="compare-table__product-col">
                      <div className="compare-product-header">
                        <div className="compare-product-header__image">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} />
                            : <span>🔧</span>
                          }
                        </div>
                        <Link
                          to={`/product/${p.id}`}
                          className="compare-product-header__name"
                        >
                          {p.name}
                        </Link>
                        <button
                          className="compare-product-header__remove"
                          onClick={() => removeProduct(p.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {COMPARE_FIELDS.map(field => {
                  const same = allSame(field.key);
                  return (
                    <tr
                      key={field.key}
                      className={`compare-table__row ${same ? 'compare-table__row--same' : ''}`}
                    >
                      <td className="compare-table__label">
                        {field.label}
                        {same && (
                          <span className="compare-same-badge">одинаково</span>
                        )}
                      </td>
                      {products.map(p => {
                        const best = isBestValue(p, field.key, field.better);
                        return (
                          <td
                            key={p.id}
                            className={`compare-table__value ${best ? 'compare-table__value--best' : ''}`}
                          >
                            {field.key === 'seller_name' ? (
                              <Link
                                to={`/seller/${p.seller_id}`}
                                className="text-accent"
                                style={{ fontSize: 13 }}
                              >
                                {formatValue(p, field.key)}
                              </Link>
                            ) : (
                              formatValue(p, field.key)
                            )}
                            {best && field.better === 'min' && (
                              <span className="compare-best-badge">Лучшая цена</span>
                            )}
                            {best && field.better === 'max' && field.key === 'stock' && (
                              <span className="compare-best-badge">Больше в наличии</span>
                            )}
                            {best && field.better === 'max' && field.key === 'seller_rating' && (
                              <span className="compare-best-badge">Лучший продавец</span>
                            )}
                            {best && field.better === 'max' && field.key === 'year' && (
                              <span className="compare-best-badge">Новее</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Кнопки */}
                <tr>
                  <td className="compare-table__label">Действие</td>
                  {products.map(p => (
                    <td key={p.id} className="compare-table__value">
                      <Link
                        to={`/product/${p.id}`}
                        className="btn btn-primary"
                        style={{ fontSize: 13 }}
                      >
                        Купить
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}