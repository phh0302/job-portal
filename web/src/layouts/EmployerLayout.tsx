import { useQuery } from '@tanstack/react-query';
import { useSeo } from '../lib/seo';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import type { EmployerMe } from '../pages/employer/types';
import { useUnreadMessages } from '../lib/messages';

const LINKS = [
  { to: '/employer', label: 'Tổng quan', end: true },
  { to: '/employer/jobs', label: 'Tin tuyển dụng' },
  { to: '/employer/applications', label: 'Ứng viên ứng tuyển' },
  { to: '/employer/messages', label: 'Tin nhắn', badge: 'messages' },
  { to: '/employer/candidates', label: 'Tìm hồ sơ' },
  { to: '/employer/company', label: 'Hồ sơ công ty' },
  { to: '/employer/reviews', label: 'Đánh giá công ty' },
  { to: '/employer/team', label: 'Đội tuyển dụng' },
  { to: '/employer/billing', label: 'Gói dịch vụ' },
  { to: '/employer/account', label: 'Tài khoản' },
];

export const EMPLOYER_ME_KEY = ['employer', 'me'];

export default function EmployerLayout() {
  useSeo({ title: 'Quản lý', noindex: true });
  const { pathname } = useLocation();
  const { data: me, isLoading } = useQuery({
    queryKey: EMPLOYER_ME_KEY,
    queryFn: async () => (await api.get<EmployerMe>('/employer/me')).data,
  });

  // Chưa có công ty -> chỉ cho vào trang tạo công ty / tài khoản
  const unread = useUnreadMessages('employer', !!me?.company);
  const needCompany = !isLoading && me && !me.company && !['/employer/company', '/employer/account'].includes(pathname);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 md:flex-col md:self-start">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-600' : 'hover:bg-slate-50'}`
            }
          >
            {l.label}
            {l.badge && unread > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{unread > 99 ? '99+' : unread}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0">
        {isLoading ? (
          <p className="text-slate-500">Đang tải…</p>
        ) : needCompany ? (
          <div className="rounded-xl border border-dashed border-brand-600/40 bg-white p-10 text-center">
            <p className="text-lg font-semibold">Chào mừng bạn đến với JobPortal!</p>
            <p className="mt-1 text-slate-600">Hãy tạo hồ sơ công ty để bắt đầu đăng tin tuyển dụng.</p>
            <p className="mt-1 text-sm text-slate-500">Được đồng nghiệp mời? Mở link trong email mời để tham gia công ty có sẵn.</p>
            <NavLink to="/employer/company" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">
              Tạo hồ sơ công ty
            </NavLink>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
