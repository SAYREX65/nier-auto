import { useEffect, useState } from 'react';
import api from '../api';
import { Product, Order } from '../types';
import './SellerDashboard.css';

type Tab = 'products' | 'orders' | 'add';

const STATUS_LABELS: Record<string, string> = {
  processing: 'В обработке',
  shipped:    'Отправлен',
  delivered:  'Доставлен',
  cancelled:  'Отменён',
};

const PART_TYPES = [
  'Тормозная система', 'Двигатель', 'Подвеска',
  'Рулевое управление', 'Электрика', 'Кузов',
  'Трансмиссия', 'Охлаждение', 'Фильтры', 'Прочее',
];

const CAR_MAKES = [
  'Toyota', 'BMW', 'Mercedes', 'Audi', 'Volkswagen',
  'Ford', 'Hyundai', 'Kia', 'Lada', 'Nissan',
  'Honda', 'Mazda', 'Skoda', 'Volvo', 'Lexus',
];

export default function SellerDashboard() {
  const [tab, setTab]           = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const emptyForm = {
    name: '', brand: '', oem_code: '', car_make: '',
    car_model: '', year: new Date().getFullYear(),
    part_type: '', price: '', stock: '', image_url: '', description: '',
  };
  const [form, setForm]   = useState(emptyForm);
  const [msg, setMsg]     = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/products?limit=100'),
      api.get('/orders/seller'),
    ]).then(([pr, or]) => {
      // Фильтруем только свои товары
      setProducts(pr.data.products);
      setOrders(or.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      year:  Number(form.year),
    };

    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        setMsg('Товар обновлён');
        setEditProduct(null);
      } else {
        await api.post('/products', payload);
        setMsg('Товар добавлен');
      }
      setForm(emptyForm);
      fetchData();
      setTab('products');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setForm({
      name:        product.name,
      brand:       product.brand,
      oem_code:    product.oem_code || '',
      car_make:    product.car_make,
      car_model:   product.car_model,
      year:        product.year,
      part_type:   product.part_type,
      price:       String(product.price),
      stock:       String(product.stock),
      image_url:   product.image_url || '',
      description: product.description || '',
    });
    setTab('add');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    await api.delete(`/products/${id}`);
    fetchData();
  };

  const handleStatusChange = async (orderId: string, status: string) => {
  try {
    await api.put(`/orders/${orderId}/status`, { status });
    setOrders(prev =>
      prev.map((o: any) => o.id === orderId ? { ...o, status } : o)
    );
  } catch (err: any) {
    alert(err.response?.data?.error ?? 'Ошибка изменения статуса');
  }
};

  const cancelEdit = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setMsg('');
    setError('');
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Панель продавца</h1>

        {/* Табы */}
        <div className="seller-tabs">
          <button
            className={`seller-tab ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}
          >
            Мои товары
            <span className="seller-tab__count">{products.length}</span>
          </button>
          <button
            className={`seller-tab ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            Заказы
            <span className="seller-tab__count">{orders.length}</span>
          </button>
          <button
            className={`seller-tab ${tab === 'add' ? 'active' : ''}`}
            onClick={() => { cancelEdit(); setTab('add'); }}
          >
            {editProduct ? 'Редактировать' : '+ Добавить товар'}
          </button>
        </div>

        {loading ? (
          <div className="text-muted" style={{ padding: '40px 0', textAlign: 'center' }}>
            Загрузка...
          </div>
        ) : (
          <>
            {/* Список товаров */}
            {tab === 'products' && (
              <div className="seller-products">
                {products.length === 0 ? (
                  <div className="seller-empty">
                    <p className="text-muted">У вас нет товаров</p>
                    <button className="btn btn-primary" onClick={() => setTab('add')}>
                      Добавить первый товар
                    </button>
                  </div>
                ) : (
                  <div className="seller-products__list">
                    {products.map(p => (
                      <div key={p.id} className="seller-product-row card">
                        <div className="seller-product-row__image">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} />
                            : <span>🔧</span>
                          }
                        </div>

                        <div className="seller-product-row__info">
                          <span className="seller-product-row__name">{p.name}</span>
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            {p.brand} · {p.oem_code || 'без OEM'} · {p.part_type}
                          </span>
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            {p.car_make} {p.car_model} {p.year}
                          </span>
                        </div>

                        <div className="seller-product-row__stats">
                          <span className="seller-product-row__price">
                            {p.price.toLocaleString('ru-RU')} ₽
                          </span>
                          <span className={`seller-product-row__stock ${p.stock === 0 ? 'out' : ''}`}>
                            {p.stock === 0 ? 'Нет в наличии' : `${p.stock} шт.`}
                          </span>
                        </div>

                        <div className="seller-product-row__actions">
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 13 }}
                            onClick={() => handleEdit(p)}
                          >
                            Изменить
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 13 }}
                            onClick={() => handleDelete(p.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Заказы */}
            {tab === 'orders' && (
              <div className="seller-orders">
                {orders.length === 0 ? (
                  <div className="seller-empty">
                    <p className="text-muted">Заказов пока нет</p>
                  </div>
                ) : (
                  <div className="seller-orders__list">
                    {orders.map((order: any) => (
                      <div key={order.id} className="seller-order-row card">
                        <div className="seller-order-row__info">
                          <span className="seller-order-row__id">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            {order.buyer_name} · {order.buyer_email}
                          </span>
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            {new Date(order.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>

                        <div className="seller-order-row__middle">
                          <span className="seller-order-row__total">
                            {order.total_amount.toLocaleString('ru-RU')} ₽
                          </span>
                          <span className="text-muted" style={{ fontSize: 12 }}>
                            {order.address}
                          </span>
                        </div>

                        <div className="seller-order-row__status">
                          <select
                            className="input"
                            style={{ width: 180 }}
                            value={order.status}
                            onChange={e => handleStatusChange(order.id, e.target.value)}
                          >
                            <option value="processing">В обработке</option>
                            <option value="shipped">Отправлен</option>
                            <option value="delivered">Доставлен</option>
                            <option value="cancelled">Отменён</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Форма добавления/редактирования */}
            {tab === 'add' && (
              <div className="seller-form card">
                <div className="seller-form__header">
                  <h3 className="section-title">
                    {editProduct ? `Редактирование: ${editProduct.name}` : 'Новый товар'}
                  </h3>
                  {editProduct && (
                    <button className="btn btn-ghost" onClick={cancelEdit}>
                      Отмена
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="seller-form__grid">
                  <div className="form-group">
                    <label className="form-label">Название *</label>
                    <input
                      name="name"
                      className="input"
                      placeholder="Тормозной диск передний"
                      value={form.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Бренд *</label>
                    <input
                      name="brand"
                      className="input"
                      placeholder="Bosch"
                      value={form.brand}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">OEM-код</label>
                    <input
                      name="oem_code"
                      className="input"
                      placeholder="0 986 479 R84"
                      value={form.oem_code}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Тип детали *</label>
                    <select
                      name="part_type"
                      className="input"
                      value={form.part_type}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Выберите тип</option>
                      {PART_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Марка авто *</label>
                    <select
                      name="car_make"
                      className="input"
                      value={form.car_make}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Выберите марку</option>
                      {CAR_MAKES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Модель авто *</label>
                    <input
                      name="car_model"
                      className="input"
                      placeholder="Camry"
                      value={form.car_model}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Год *</label>
                    <input
                      name="year"
                      type="number"
                      className="input"
                      min={1990}
                      max={new Date().getFullYear() + 1}
                      value={form.year}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Цена (₽) *</label>
                    <input
                      name="price"
                      type="number"
                      className="input"
                      min={1}
                      placeholder="2500"
                      value={form.price}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Количество *</label>
                    <input
                      name="stock"
                      type="number"
                      className="input"
                      min={0}
                      placeholder="10"
                      value={form.stock}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ссылка на изображение</label>
                    <input
                      name="image_url"
                      className="input"
                      placeholder="https://..."
                      value={form.image_url}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group seller-form__full">
                    <label className="form-label">Описание</label>
                    <textarea
                      name="description"
                      className="input"
                      rows={3}
                      placeholder="Дополнительная информация о товаре..."
                      value={form.description}
                      onChange={handleFormChange}
                    />
                  </div>

                  {msg   && <p className="profile__success seller-form__full">{msg}</p>}
                  {error && <p className="form-error seller-form__full">{error}</p>}

                  <div className="seller-form__full seller-form__actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? 'Сохраняем...'
                        : editProduct ? 'Сохранить изменения' : 'Добавить товар'
                      }
                    </button>
                    {editProduct && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={cancelEdit}
                      >
                        Отмена
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}