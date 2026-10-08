import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { Paginated } from '../../lib/types';
import { Empty, Tabs } from './shared';

interface Email {
  id: string;
  to: string;
  subject: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string;
  sentAt: string | null;
  createdAt: string;
}
type Res = Paginated<Email> & { counts: Record<Email['status'], number>; smtpConfigured: boolean };

const STATUS: Record<Email['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Chờ gửi', cls: 'bg-amber-100 text-amber-800' },
  SENDING: { label: 'Đang gửi', cls: 'bg-blue-100 text-blue-700' },
  SENT: { label: 'Đã gửi', cls: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Lỗi', cls: 'bg-red-100 text-red-700' },
};
const dt = (v: string | null) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

export default function EmailsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as Email['status'] | '';
  const page = Number(params.get('page') ?? 1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'emails', status, page],
    queryFn: async () => (await api.get<Res>('/admin/emails', { params: { status: status || undefined, page, limit: 20 } })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/admin/emails/${id}/retry`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'emails'] }),
    meta: { successMessage: 'Đã đưa email vào hàng đợi gửi lại' },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Hàng đợi email</h1>
        <p className="text-sm text-slate-500">Email được gửi nền, lỗi sẽ tự thử lại sau 1, 5, 30, 120, 360 phút. Email đã gửi được giữ 30 ngày.</p>
      </div>
      {data && !data.smtpConfigured && (
        <Alert type="info">Chưa cấu hình SMTP — email đang được in ra terminal của API thay vì gửi thật. Điền SMTP_* trong api/.env và cài nodemailer để gửi thật.</Alert>
      )}
      {retry.isError && <Alert type="error">{errorMessage(retry.error)}</Alert>}
      <Tabs
        value={status}
        onChange={(v) => setParams(v ? { status: v } : {})}
        tabs={[
          { value: '', label: 'Tất cả' },
          ...(['PENDING', 'FAILED', 'SENT'] as const).map((s) => ({ value: s, label: STATUS[s].label, count: data?.counts[s] })),
        ]}
      />
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : data && data.items.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Người nhận / tiêu đề</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium">Thời gian</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium">{e.to}</p>
                      <p className="text-slate-600">{e.subject}</p>
                      {e.lastError && <p className="mt-1 break-words text-xs text-red-600">Lỗi: {e.lastError}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS[e.status].cls}`}>{STATUS[e.status].label}</span>
                      {e.attempts > 0 && <p className="mt-1 text-xs text-slate-500">{e.attempts} lần thử</p>}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      <p>Tạo: {dt(e.createdAt)}</p>
                      {e.status === 'SENT' && <p>Gửi: {dt(e.sentAt)}</p>}
                      {e.status === 'PENDING' && e.attempts > 0 && <p>Thử lại: {dt(e.nextAttemptAt)}</p>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {e.status === 'FAILED' && (
                        <button disabled={retry.isPending} onClick={() => retry.mutate(e.id)} className="text-xs text-brand-600 hover:underline">
                          Gửi lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParams({ ...(status && { status }), page: String(p) })} />
        </>
      ) : (
        <Empty>Không có email nào.</Empty>
      )}
    </div>
  );
}
