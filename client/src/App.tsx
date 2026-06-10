import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import Header   from './components/Header';
import Footer   from './components/Footer';

import HomePage          from './pages/HomePage';
import CatalogPage       from './pages/CatalogPage';
import ProductPage       from './pages/ProductPage';
import CartPage          from './pages/CartPage';
import CheckoutPage      from './pages/CheckoutPage';
import OrdersPage        from './pages/OrdersPage';
import ProfilePage       from './pages/ProfilePage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import SellerDashboard   from './pages/SellerDashboard';
import AdminDashboard    from './pages/AdminDashboard';
import AIDiagnosePage    from './pages/AIDiagnosePage';
import ComparePage       from './pages/ComparePage';
import SellerPage        from './pages/SellerPage';
import ChatsPage         from './pages/ChatsPage';

// ───────────────────────────────────────────────
// Защищённый маршрут — только для авторизованных
// ───────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ───────────────────────────────────────────────
// Маршрут только для роли
// ───────────────────────────────────────────────
function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)               return <Navigate to="/login"   replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ───────────────────────────────────────────────
// Маршрут только для гостей
// ───────────────────────────────────────────────
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ───────────────────────────────────────────────
// Основной компонент
// ───────────────────────────────────────────────
export default function App() {
  return (
    <div className="app">
      <Header />

      <main className="main">
        <Routes>

          {/* Публичные */}
          <Route path="/"        element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/seller/:id"  element={<SellerPage />} />
          <Route path="/ai"      element={<AIDiagnosePage />} />
          <Route path="/compare" element={<ComparePage />} />

          {/* Только для гостей */}
          <Route path="/login" element={
            <GuestRoute><LoginPage /></GuestRoute>
          } />
          <Route path="/register" element={
            <GuestRoute><RegisterPage /></GuestRoute>
          } />

          {/* Только для авторизованных */}
          <Route path="/cart" element={
            <ProtectedRoute><CartPage /></ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><OrdersPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/chats" element={
            <ProtectedRoute><ChatsPage /></ProtectedRoute>
          } />

          {/* Только для продавца и админа */}
          <Route path="/seller" element={
            <RoleRoute roles={['seller', 'admin']}>
              <SellerDashboard />
            </RoleRoute>
          } />

          {/* Только для админа */}
          <Route path="/admin" element={
            <RoleRoute roles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      <Footer />
    </div>
  );
}