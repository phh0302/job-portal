import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { Paginated } from '../lib/types';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/** live: đang kết nối realtime (kết nối được mở 1 lần ở layout, dùng chung cho bản desktop & mobile) */
export default function NotificationBell({ live = false }: { live?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Có realtime thì chỉ hỏi lại 5 phút/lần; mất kết nối thì hỏi mỗi phút
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    refetchInterval: live ? 5 * 60_000 : 60_000,
  });
  const { data: latest } = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: async () => (await api.get<Paginated<AppNotification>>('/notifications', { params: { limit: 8 } })).data.items,
    enabled: open,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function onItem(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Thông báo" className="relative rounded-lg p-2 hover:bg-slate-100">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {!!unread && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="flex items-center gap-2 font-semibold">
              Thông báo
              <span
                title={live ? 'Đang nhận thông báo tức thời' : 'Đang kết nối lại…'}
                className={`h-2 w-2 rounded-full ${live ? 'bg-green-500' : 'bg-slate-300'}`}
              />
            </span>
            {!!unread && (
              <button onClick={() => markAll.mutate()} className="text-xs text-brand-600 hover:underline">
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {latest?.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Chưa có thông báo</li>}
            {latest?.map((n) => (
              <li key={n.id}>
                <button onClick={() => onItem(n)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/60'}`}>
                  <p className={`text-sm ${n.isRead ? '' : 'font-semibold'}`}>{n.title}</p>
                  {n.message && <p className="line-clamp-2 text-xs text-slate-600">{n.message}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2 text-center text-sm text-brand-600 hover:bg-slate-50">
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
