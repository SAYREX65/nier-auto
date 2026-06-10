import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Product, Pagination } from '../types';
import ProductCard from '../components/ProductCard';
import './CatalogPage.css';

interface Filters {
  makes: { car_make: string }[];
  models: { car_make: string; car_model: string }[];
  years: { year: number }[];
  types: { part_type: string }[];
  brands: { brand: string }[];
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);

  // Текущие значения фильтров из URL
  const make = params.get('make') || '';
  const model = params.get('model') || '';
  const year = params.get('year') || '';
  const part_type = params.get('part_type') || '';
  const brand = params.get('brand') || '';
  const search = params.get('search') || '';
  const sort = params.get('sort') || 'created_at';
  const order = params.get('order') || 'DESC';
  const page = params.get('page') || '1';

  // Загрузка метаданных фильтров
  useEffect(() => {
    api.get('/products/meta/filters').then(r => setFilters(r.data));
  }, []);

  // Загрузка товаров при изменении любого параметра
  useEffect(() => {
    setLoading(true);
    const currentParams = new URLSearchParams(window.location.search);
    console.log('sending params:', Object.fromEntries(currentParams));
    api.get('/products', { params: Object.fromEntries(currentParams) })
      .then(r => {
        setProducts(r.data.products);
        setPagination(r.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [params]);

  // СТАЛО
 const setMultiFilter = (updates: Record<string, string>) => {
  const next = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) next.set(key, value);
    else next.delete(key);
  });
  if (!('page' in updates)) next.set('page', '1');
  setParams(next);
};

  const setFilter = (key: string, value: string) => {
    setMultiFilter({ [key]: value });
  };

  const clearFilters = () => setParams(new URLSearchParams());

  const filteredModels = filters?.models.filter(m =>
    !make || m.car_make === make
  ) ?? [];

  return (
    <div className="catalog page">
      <div className="container catalog__layout">

        {/* Боковая панель фильтров */}
        <aside className="catalog__sidebar">
          <div className="sidebar__header">
            <h3>Фильтры</h3>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={clearFilters}>
              Сбросить
            </button>
          </div>

          <div className="filter-group">
            <label className="filter-label">Марка</label>
            <select className="input" value={make}
              onChange={e => setMultiFilter({ make: e.target.value, model: '' })}>
              <option value="">Все марки</option>
              {filters?.makes.map(m => (
                <option key={m.car_make} value={m.car_make}>{m.car_make}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Модель</label>
            <select className="input" value={model}
              onChange={e => setFilter('model', e.target.value)}>
              <option value="">Все модели</option>
              {filteredModels.map(m => (
                <option key={m.car_model} value={m.car_model}>{m.car_model}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Год</label>
            <select className="input" value={year}
              onChange={e => setFilter('year', e.target.value)}>
              <option value="">Любой год</option>
              {filters?.years.map(y => (
                <option key={y.year} value={y.year}>{y.year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Тип детали</label>
            <select className="input" value={part_type}
              onChange={e => setFilter('part_type', e.target.value)}>
              <option value="">Все типы</option>
              {filters?.types.map(t => (
                <option key={t.part_type} value={t.part_type}>{t.part_type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Бренд</label>
            <select className="input" value={brand}
              onChange={e => setFilter('brand', e.target.value)}>
              <option value="">Все бренды</option>
              {filters?.brands.map(b => (
                <option key={b.brand} value={b.brand}>{b.brand}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* Основная часть */}
        <div className="catalog__main">

          {/* Поиск и сортировка */}
          <div className="catalog__toolbar">
            <input
              className="input catalog__search"
              placeholder="Поиск по названию или OEM-коду..."
              value={search}
              onChange={e => setFilter('search', e.target.value)}
            />
            <select className="input catalog__sort"
              value={`${sort}_${order}`}
              onChange={e => {
                const [s, o] = e.target.value.split('_');
                setMultiFilter({ sort: s, order: o });
              }}>
              <option value="created_at_DESC">Новые</option>
              <option value="price_ASC">Цена: по возрастанию</option>
              <option value="price_DESC">Цена: по убыванию</option>
              <option value="name_ASC">По названию</option>
            </select>
          </div>

          {/* Количество результатов */}
          {pagination && (
            <p className="catalog__count text-muted">
              Найдено: {pagination.total} товаров
            </p>
          )}

          {/* Товары */}
          {loading ? (
            <div className="catalog__loading">Загрузка...</div>
          ) : products.length === 0 ? (
            <div className="catalog__empty">
              <p>Товары не найдены</p>
              <button className="btn btn-ghost" onClick={clearFilters}>
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Пагинация */}
          {pagination && pagination.pages > 1 && (
            <div className="catalog__pagination">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  className={`pagination__btn ${Number(page) === pageNum ? 'active' : ''}`}
                  // СТАЛО
                  onClick={() => {
                    console.log('clicking page:', pageNum);
                    setFilter('page', String(pageNum));
                    console.log('after setFilter, url:', window.location.search);
                  }}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}