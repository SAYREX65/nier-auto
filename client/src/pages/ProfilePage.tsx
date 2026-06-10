import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [tab, setTab]             = useState<'info' | 'password' | 'avatar'>('info');
  const [oldPassword, setOld]     = useState('');
  const [newPassword, setNew]     = useState('');
  const [confirm, setConfirm]     = useState('');
  const [msg, setMsg]             = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [avatar, setAvatar]       = useState<string>(
    localStorage.getItem('avatar_' + user?.id) || ''
  );

  const fileRef = useRef<HTMLInputElement>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setError('');

    if (newPassword !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', { oldPassword, newPassword });
      setMsg('Пароль успешно изменён');
      setOld(''); setNew(''); setConfirm('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatar(result);
      localStorage.setItem('avatar_' + user?.id, result);
      setMsg('Аватар обновлён');
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUrl = (url: string) => {
    setAvatar(url);
    localStorage.setItem('avatar_' + user?.id, url);
    setMsg('Аватар обновлён');
  };

  const removeAvatar = () => {
    setAvatar('');
    localStorage.removeItem('avatar_' + user?.id);
    setMsg('Аватар удалён');
  };

  const ROLE_LABELS: Record<string, string> = {
    buyer:  'Покупатель',
    seller: 'Продавец',
    admin:  'Администратор',
  };

  return (
    <div className="profile-page page">
      <div className="container">
        <h1 className="page-title">Профиль</h1>

        <div className="profile__layout">

          {/* Левая колонка — аватар и инфо */}
          <div className="profile__sidebar">
            <div className="profile__avatar-wrap card">
              <div className="profile__avatar">
                {avatar ? (
                  <img src={avatar} alt="Аватар" className="profile__avatar-img" />
                ) : (
                  <div className="profile__avatar-placeholder">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile__avatar-info">
                <p className="profile__name">{user?.name}</p>
                <p className="profile__role">
                  {ROLE_LABELS[user?.role ?? 'buyer']}
                </p>
                <p className="profile__email text-muted">{user?.email}</p>
              </div>
              <button
                className="btn btn-ghost profile__avatar-btn"
                onClick={() => setTab('avatar')}
              >
                Изменить аватар
              </button>
            </div>

            {/* Навигация */}
            <nav className="profile__nav card">
              {[
                { key: 'info',     label: '👤 Информация' },
                { key: 'password', label: '🔒 Смена пароля' },
                { key: 'avatar',   label: '🖼 Аватар' },
              ].map(item => (
                <button
                  key={item.key}
                  className={`profile__nav-item ${tab === item.key ? 'active' : ''}`}
                  onClick={() => { setTab(item.key as any); setMsg(''); setError(''); }}
                >
                  {item.label}
                </button>
              ))}
              <hr className="divider" />
              <button className="profile__nav-item profile__logout" onClick={logout}>
                🚪 Выйти
              </button>
            </nav>
          </div>

          {/* Правая колонка — контент */}
          <div className="profile__content card">

            {/* Информация */}
            {tab === 'info' && (
              <div className="profile__section">
                <h2 className="section-title">Информация об аккаунте</h2>
                <div className="profile__info-grid">
                  <div className="profile__info-row">
                    <span className="profile__info-label">Имя</span>
                    <span className="profile__info-value">{user?.name}</span>
                  </div>
                  <div className="profile__info-row">
                    <span className="profile__info-label">Email</span>
                    <span className="profile__info-value">{user?.email}</span>
                  </div>
                  <div className="profile__info-row">
                    <span className="profile__info-label">Роль</span>
                    <span className="profile__info-value">
                      <span className={`badge badge-${user?.role}`}>
                        {ROLE_LABELS[user?.role ?? 'buyer']}
                      </span>
                    </span>
                  </div>
                  <div className="profile__info-row">
                    <span className="profile__info-label">ID</span>
                    <span className="profile__info-value profile__id">
                      {user?.id}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Смена пароля */}
            {tab === 'password' && (
              <div className="profile__section">
                <h2 className="section-title">Смена пароля</h2>
                <form onSubmit={handleChangePassword} className="profile__form">
                  <div className="form-group">
                    <label className="form-label">Текущий пароль</label>
                    <input
                      type="password"
                      className="input"
                      value={oldPassword}
                      onChange={e => setOld(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Новый пароль</label>
                    <input
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={e => setNew(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Повторите пароль</label>
                    <input
                      type="password"
                      className="input"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                    />
                  </div>

                  {error && <p className="form-error">{error}</p>}
                  {msg   && <p className="form-success">{msg}</p>}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Сохраняем...' : 'Сохранить пароль'}
                  </button>
                </form>
              </div>
            )}

            {/* Аватар */}
            {tab === 'avatar' && (
              <div className="profile__section">
                <h2 className="section-title">Аватар профиля</h2>

                {/* Превью */}
                <div className="avatar-preview">
                  {avatar ? (
                    <img src={avatar} alt="Аватар" className="avatar-preview__img" />
                  ) : (
                    <div className="avatar-preview__placeholder">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Загрузка файла */}
                <div className="avatar-section">
                  <h3 className="avatar-section__title">Загрузить файл</h3>
                  <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                    JPG, PNG, WebP — до 2 МБ
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => fileRef.current?.click()}
                  >
                    Выбрать файл
                  </button>
                </div>

                <hr className="divider" />

                {/* По ссылке */}
                <div className="avatar-section">
                  <h3 className="avatar-section__title">Или вставить ссылку</h3>
                  <div className="avatar-url-form">
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/photo.jpg"
                      id="avatar-url-input"
                    />
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        const input = document.getElementById('avatar-url-input') as HTMLInputElement;
                        if (input.value) handleAvatarUrl(input.value);
                      }}
                    >
                      Применить
                    </button>
                  </div>
                </div>

                {avatar && (
                  <button className="btn btn-danger" onClick={removeAvatar}>
                    Удалить аватар
                  </button>
                )}

                {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
                {msg   && <p className="form-success" style={{ marginTop: 12 }}>{msg}</p>}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}