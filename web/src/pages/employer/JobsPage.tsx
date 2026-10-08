import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { JOB_STATUS, StatusBadge } from '../../lib/status';
import type { Paginated } from '../../lib/types';
import type { EmployerJobRow } from './types';
import { ListSkeleton } from '../../components/Skeleton';

type JobsResponse = Paginated<EmployerJobRow> & { counts: Record<string, number> };
const TABS = ['', 'APPROVED', 'PENDING', 'DRAFT', 'REJECTED', 'CLOSED', 'EXPIRED'];

export default function JobsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [extendJob, setExtendJob] = useState<EmployerJobRow | null>(null);
  const [newDeadline, setNewDeadline] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employer', 'jobs', status, page],
    queryFn: async () => (await api.get<JobsResponse>('/employer/jobs', { params: { status: status || undefined, page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  const action = useMutation({
    mutationFn: ({ id, act, body }: { id: number; act: 'submit' | 'close' | 'reopen' | 'extend' | 'delete' | 'feature'; body?: object }) =>
      act === 'delete' ? api.delete(`/employer/jobs/${id}`) : api.post(`/employer/jobs/${id}/${act}`, body),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['employer', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employer', 'billing'] });
      setExtendJob(null);
      toast({ submit: 'Đã gửi duyệt tin', close: 'Đã đóng tin', reopen: 'Đã mở lại tin', extend: 'Đã gia hạn tin', delete: 'Đã xóa tin', feature: 'Tin đã được đẩy nổi bật' }[v.act]);
    },
  });

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const setTab = (s: string) => setParams(s ? { status: s } : {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tin tuyển dụng</h1>
        <Link to="/employer/jobs/new" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">+ Đăng tin mới</Link>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${status === t ? 'border-brand-600 font-medium text-brand-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
          >
            {t ? JOB_STATUS[t].label : 'Tất cả'} ({t ? data?.counts[t] ?? 0 : total})
          </button>
        ))}
      </div>

      {action.isError && <Alert type="error">{errorMessage(action.error)}</Alert>}

      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Tin tuyển dụng</th>
                  <th className="px-4 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 text-right font-medium">Lượt xem</th>
                  <th className="px-4 py-2 text-right font-medium">Ứng viên</th>
                  <th className="px-4 py-2 font-medium">Hạn nộp</th>
                  <th className="px-4 py-2 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((j) => (
                  <tr key={j.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link to={`/employer/jobs/${j.id}/edit`} className="font-medium hover:text-brand-600">{j.title}</Link>
                      <p className="text-xs text-slate-500">{j.location ?? '—'} · cập nhật {formatDate(j.updatedAt)}</p>
                      {j.status === 'REJECTED' && j.rejectReason && <p className="mt-1 text-xs text-red-600">Lý do từ chối: {j.rejectReason}</p>}
                      {j.featuredUntil && new Date(j.featuredUntil) > new Date() && (
                        <p className="mt-1 text-xs font-medium text-amber-600">★ Nổi bật đến {formatDate(j.featuredUntil)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge map={JOB_STATUS} value={j.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{j.viewCount.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Link to={`/employer/applications?jobId=${j.id}`} className="hover:text-brand-600">
                        {j.applications}
                        {j.newApplications > 0 && <span className="ml-1 rounded bg-red-500 px-1.5 text-xs text-white">{j.newApplications} mới</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(j.deadline)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {j.status === 'APPROVED' && <a href={`/jobs/${j.slug}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Xem</a>}
                        {j.status !== 'PENDING' && <Link to={`/employer/jobs/${j.id}/edit`} className="text-brand-600 hover:underline">Sửa</Link>}
                        {(j.status === 'DRAFT' || j.status === 'REJECTED') && (
                          <button onClick={() => action.mutate({ id: j.id, act: 'submit' })} className="text-brand-600 hover:underline">Gửi duyệt</button>
                        )}
                        {j.status === 'APPROVED' && (
                          <button
                            onClick={() => window.confirm('Dùng 1 lượt để đẩy tin này lên đầu kết quả tìm kiếm 7 ngày?') && action.mutate({ id: j.id, act: 'feature' })}
                            className="text-amber-600 hover:underline"
                          >
                            ★ Đẩy nổi bật
                          </button>
                        )}
                        {j.status === 'APPROVED' && (
                          <button onClick={() => window.confirm('Đóng tin này? Ứng viên sẽ không thấy tin nữa.') && action.mutate({ id: j.id, act: 'close' })} className="text-slate-600 hover:underline">Đóng</button>
                        )}
                        {(j.status === 'CLOSED' || j.status === 'EXPIRED') && (
                          <button onClick={() => action.mutate({ id: j.id, act: 'reopen' })} className="text-brand-600 hover:underline">Mở lại</button>
                        )}
                        {j.status !== 'PENDING' && j.status !== 'DRAFT' && j.status !== 'REJECTED' && (
                          <button onClick={() => { setExtendJob(j); setNewDeadline(''); action.reset(); }} className="text-brand-600 hover:underline">Gia hạn</button>
                        )}
                        {j.applications === 0 && (
                          <button onClick={() => window.confirm(`Xóa tin "${j.title}"?`) && action.mutate({ id: j.id, act: 'delete' })} className="text-red-600 hover:underline">Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParams({ ...(status && { status }), page: String(p) })} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Chưa có tin nào. <Link to="/employer/jobs/new" className="text-brand-600 hover:underline">Đăng tin đầu tiên</Link>
        </div>
      )}

      <Modal open={!!extendJob} onClose={() => setExtendJob(null)} title={`Gia hạn: ${extendJob?.title ?? ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (extendJob) action.mutate({ id: extendJob.id, act: 'extend', body: { deadline: newDeadline } });
          }}
          className="space-y-4"
        >
          {action.isError && <Alert type="error">{errorMessage(action.error)}</Alert>}
          <p className="text-sm text-slate-600">Hạn hiện tại: {extendJob && formatDate(extendJob.deadline)}. Hạn mới tối đa 90 ngày kể từ hôm nay.</p>
          <Field label="Hạn nộp mới" type="date" required value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setExtendJob(null)}>Hủy</Button>
            <Button type="submit" loading={action.isPending}>Gia hạn</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
