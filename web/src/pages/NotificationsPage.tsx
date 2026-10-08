import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { Paginated } from '../lib/types';
import { ListSkeleton } from '../components/Skeleton';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'page', page, unreadOnly],
    queryFn: async () =>
      (await api.get<Paginated<AppNotification>>('/notifications', { params: { page, limit: 15, unread: unreadOnly || undefined } })).data,
    placeholderData: keepPreviousData,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Thông báo</h1>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
            Chỉ chưa đọc
          </label>
          <button onClick={() => markAll.mutate()} className="text-brand-600 hover:underline">Đánh dấu đã đọc hết</button>
        </div>
      </div>
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {data.items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/60'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-brand-600'}`} />
                  <span className="min-w-0">
                    <span className={`block ${n.isRead ? '' : 'font-semibold'}`}>{n.title}</span>
                    {n.message && <span className="block text-sm text-slate-600">{n.message}</span>}
                    <span className="block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Không có thông báo nào.</p>
      )}
    </div>
  );
}
