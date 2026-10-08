import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { UserRole } from './types';

/** Bảo vệ route: chưa đăng nhập -> /login, sai vai trò -> /403 */
export default function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="py-24 text-center text-slate-500">Đang tải…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
