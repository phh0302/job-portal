import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { JOB_STATUS, StatusBadge } from '../../lib/status';
import type { Paginated } from '../../lib/types';
import { Empty, ReasonModal, Tabs } from './shared';
import { ListSkeleton } from '../../components/Skeleton';

interface Row {
  id: number;
  targetType: 'JOB' | 'COMPANY';
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { id: number; email: string } | null;
  job: { id: number; title: string; slug: string; status: string; company: string } | null;
  company: { id: number; name: string; slug: string } | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

const ACTIONS = [
  { value: 'NONE', label: 'Chỉ đánh dấu đã xử lý', jobOnly: false },
  { value: 'HIDE_JOB', label: 'Gỡ tin tuyển dụng', jobOnly: true },
  { value: 'WARN', label: 'Gửi cảnh cáo tới nhà tuyển dụng', jobOnly: false },
  { value: 'LOCK_USER', label: 'Khóa tài khoản nhà tuyển dụng của công ty', jobOnly: false },
] as const;

function ResolveModal({ r, onClose }: { r: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const [action, setAction] = useState<string>(r.targetType === 'JOB' ? 'HIDE_JOB' : 'WARN');
  const [note, setNote] = useState('');
  const mut = useMutation({
    mutationFn: () => api.post(`/admin/reports/${r.id}/resolve`, { action, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      onClose();
    },
    meta: { successMessage: 'Đã xử lý báo cáo' },
  });
  return (
    <Modal open onClose={onClose} title="Xử lý báo cáo">
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3 text-sm">
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        <p>Lý do báo cáo: <b>{r.reason}</b></p>
        {ACTIONS.filter((a) => !a.jobOnly || r.targetType === 'JOB').map((a) => (
          <label key={a.value} className={`flex items-center gap-2 ${a.value === 'LOCK_USER' ? 'text-red-600' : ''}`}>
            <input type="radio" checked={action === a.value} onChange={() => setAction(a.value)} />
            {a.label}
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block font-medium">Ghi chú xử lý (gửi kèm cảnh cáo / lý do gỡ tin)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} required rows={3} maxLength={1000} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        </label>
        <p className="text-xs text-slate-500">Các báo cáo đang mở khác về cùng nội dung sẽ được đóng cùng lúc.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={mut.isPending} disabled={!note.trim()}>Xác nhận</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'OPEN';
  const page = Number(params.get('page') ?? 1);
  const [resolving, setResolving] = useState<Row | null>(null);
  const [dismissing, setDismissing] = useState<Row | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/admin/reports', { params: { status: status || undefined, page, limit: 15 } })).data,
    placeholderData: keepPreviousData,
  });
  const dismiss = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/admin/reports/${id}/dismiss`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setDismissing(null);
    },
    meta: { successMessage: 'Đã bỏ qua báo cáo' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Báo cáo vi phạm</h1>
      <Tabs value={status} onChange={(v) => setParams({ status: v })} tabs={[{ value: 'OPEN', label: 'Chưa xử lý' }, { value: 'RESOLVED', label: 'Đã xử lý' }, { value: 'DISMISSED', label: 'Bỏ qua' }]} />
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="space-y-3">
            {data.items.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-red-700">⚑ {r.reason}</p>
                    {r.job ? (
                      <p>
                        Tin: <Link to={`/jobs/${r.job.slug}`} target="_blank" className="text-brand-600 hover:underline">{r.job.title}</Link> ({r.job.company}) <StatusBadge map={JOB_STATUS} value={r.job.status} />
                      </p>
                    ) : r.company ? (
                      <p>Công ty: <Link to={`/companies/${r.company.slug}`} target="_blank" className="text-brand-600 hover:underline">{r.company.name}</Link></p>
                    ) : null}
                    {r.details && <p className="mt-1 whitespace-pre-line rounded bg-slate-50 p-2 text-slate-700">{r.details}</p>}
                    <p className="mt-1 text-xs text-slate-500">Người báo cáo: {r.reporter?.email ?? '—'} · {formatDate(r.createdAt)}</p>
                    {r.resolutionNote && (
                      <p className="mt-1 text-xs text-slate-600">Kết quả: {r.resolutionNote} — {r.resolvedBy} ({formatDate(r.resolvedAt)})</p>
                    )}
                  </div>
                  {r.status === 'OPEN' && (
                    <div className="flex gap-2">
                      <button onClick={() => { dismiss.reset(); setDismissing(r); }} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Bỏ qua</button>
                      <button onClick={() => setResolving(r)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Xử lý</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setParams({ status, page: String(p) })} />
        </>
      ) : (
        <Empty>Không có báo cáo nào.</Empty>
      )}
      {resolving && <ResolveModal r={resolving} onClose={() => setResolving(null)} />}
      <ReasonModal
        open={!!dismissing}
        title="Bỏ qua báo cáo"
        label="Ghi chú (vì sao không vi phạm)"
        confirmText="Bỏ qua"
        presets={['Không phát hiện vi phạm', 'Báo cáo không đủ thông tin']}
        pending={dismiss.isPending}
        error={dismiss.error}
        onClose={() => setDismissing(null)}
        onConfirm={(reason) => dismissing && dismiss.mutate({ id: dismissing.id, reason })}
      />
    </div>
  );
}
