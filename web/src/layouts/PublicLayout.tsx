import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ROLE_HOME, ROLE_LABEL } from '../auth/types';
import NotificationBell from '../components/NotificationBell';
import VerifyEmailBanner from '../components/VerifyEmailBanner';
import { useRealtimeNotifications } from '../lib/realtime';
import SupportWidget from '../components/support/SupportWidget';
import { usePublicSettings } from '../lib/settings';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { data: settings } = usePublicSettings();
  const live = useRealtimeNotifications(!!user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Đóng menu mobile & cuộn lên đầu khi đổi trang
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  async function onLogout() {
    await logout();
    navigate('/');
  }

  const navCls = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-brand-600' : 'hover:text-brand-600');
  const mobileCls = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 ${isActive ? 'bg-brand-50 text-brand-600' : 'hover:bg-slate-50'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Bỏ qua tới nội dung
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link to="/" className="text-xl font-bold text-brand-600">JobPortal</Link>

          {/* Desktop */}
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <NavLink to="/jobs" className={navCls}>Việc làm</NavLink>
            <NavLink to="/companies" className={navCls}>Công ty</NavLink>
            {user ? (
              <>
                <NotificationBell live={live} />
                <NavLink to={ROLE_HOME[user.role]} className={navCls}>
                  <span className="hidden lg:inline">{ROLE_LABEL[user.role]}: </span>
                  <b>{user.fullName}</b>
                </NavLink>
                <button onClick={onLogout} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Đăng xuất</button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg border border-brand-600 px-3 py-1.5 text-brand-600 hover:bg-brand-50">Đăng nhập</Link>
                <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Đăng ký</Link>
              </>
            )}
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-1 md:hidden">
            {user && <NotificationBell live={live} />}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="space-y-1 border-t border-slate-100 px-4 py-3 text-sm md:hidden">
            <NavLink to="/jobs" className={mobileCls}>Việc làm</NavLink>
            <NavLink to="/companies" className={mobileCls}>Công ty</NavLink>
            {user ? (
              <>
                <NavLink to={ROLE_HOME[user.role]} className={mobileCls}>
                  {ROLE_LABEL[user.role]}: <b>{user.fullName}</b>
                </NavLink>
                <button onClick={onLogout} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">Đăng xuất</button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" className="rounded-lg border border-brand-600 px-3 py-2 text-center text-brand-600">Đăng nhập</Link>
                <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-2 text-center text-white">Đăng ký</Link>
              </div>
            )}
          </nav>
        )}
      </header>
      {settings?.siteNotice && <div className="bg-brand-600 px-4 py-2 text-center text-sm text-white">{settings.siteNotice}</div>}
      <VerifyEmailBanner />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <nav className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link to="/pages/gioi-thieu" className="hover:text-brand-600">Giới thiệu</Link>
          <Link to="/pages/dieu-khoan" className="hover:text-brand-600">Điều khoản sử dụng</Link>
          <Link to="/pages/chinh-sach-bao-mat" className="hover:text-brand-600">Chính sách bảo mật</Link>
        </nav>
        © {new Date().getFullYear()} JobPortal
      </footer>
      <SupportWidget />
    </div>
  );
}
