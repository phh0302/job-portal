import { useQuery } from '@tanstack/react-query';
import { useSeo } from '../lib/seo';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../lib/api';
import type { AdminOverview } from '../pages/admin/types';

export const ADMIN_OVERVIEW_KEY = ['admin', 'overview'];

export default function AdminLayout() {
  useSeo({ title: 'Quản lý', noindex: true });
  const { data } = useQuery({
    queryKey: ADMIN_OVERVIEW_KEY,
    queryFn: async () => (await api.get<AdminOverview>('/admin/dashboard')).data,
    refetchInterval: 60_000,
  });
  const links = [
    { to: '/admin', label: 'Tổng quan', end: true },
    { to: '/admin/jobs', label: 'Duyệt tin', badge: data?.todo.pendingJobs },
    { to: '/admin/companies', label: 'Xác minh công ty', badge: data?.todo.pendingCompanies },
    { to: '/admin/reports', label: 'Báo cáo vi phạm', badge: data?.todo.openReports },
    { to: '/admin/reviews', label: 'Duyệt đánh giá', badge: data?.todo.pendingReviews },
    { to: '/admin/billing', label: 'Gói & thanh toán', badge: data?.todo.pendingOrders },
    { to: '/admin/users', label: 'Người dùng' },
    { to: '/admin/catalog', label: 'Danh mục' },
    { to: '/admin/content', label: 'Trang & cấu hình' },
    { to: '/admin/emails', label: 'Hàng đợi email' },
    { to: '/admin/audit', label: 'Nhật ký thao tác' },
  ];
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 md:flex-col md:self-start">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-600' : 'hover:bg-slate-50'}`
            }
          >
            {l.label}
            {!!l.badge && <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{l.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
