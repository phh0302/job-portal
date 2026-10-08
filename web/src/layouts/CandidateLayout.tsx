import { useSeo } from '../lib/seo';
import { NavLink, Outlet } from 'react-router-dom';
import { useUnreadMessages } from '../lib/messages';

const LINKS = [
  { to: '/candidate/recommendations', label: '✦ Việc làm gợi ý' },
  { to: '/candidate/profile', label: 'Hồ sơ của tôi' },
  { to: '/candidate/resumes', label: 'CV của tôi' },
  { to: '/candidate/cv-builder', label: 'Tạo CV online' },
  { to: '/candidate/applications', label: 'Việc đã ứng tuyển' },
  { to: '/candidate/messages', label: 'Tin nhắn', badge: 'messages' },
  { to: '/candidate/saved-jobs', label: 'Việc đã lưu' },
  { to: '/candidate/followed-companies', label: 'Công ty theo dõi' },
  { to: '/candidate/reviews', label: 'Đánh giá của tôi' },
  { to: '/candidate/job-alerts', label: 'Thông báo việc làm' },
  { to: '/account/change-password', label: 'Đổi mật khẩu' },
];

export default function CandidateLayout() {
  useSeo({ title: 'Quản lý', noindex: true });
  const unread = useUnreadMessages('candidate');
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 md:flex-col md:self-start">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
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
        <Outlet />
      </div>
    </div>
  );
}
