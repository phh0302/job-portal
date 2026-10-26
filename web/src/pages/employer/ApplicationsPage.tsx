import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import Select from '../../components/Select';
import { api, errorMessage } from '../../lib/api';
import { APPLICATION_STATUS, formatDate } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import type { EmployerJobRow } from './types';
import { ListSkeleton } from '../../components/Skeleton';
import { Alert } from '../../components/ui';
import { QUOTA_KEY, VERDICT, type ScreeningQuota, type Verdict } from '../../lib/screening';
import { toast } from '../../components/Toast';

interface Row {
  id: number;
  status: string;
  createdAt: string;
  hasNote: boolean;
  ai: { score: number; verdict: Verdict } | null;
  job: { id: number; title: string };
  candidate: { fullName: string; headline: string | null; avatarUrl: string | null; location: string | null; yearsOfExperience: number };
}

/** Chấm hàng loạt các đơn chưa được AI chấm của 1 tin */
function BatchScreen({ jobId }: { jobId: number }) {
  const qc = useQueryClient();
  const { data: quota } = useQuery({ queryKey: QUOTA_KEY, queryFn: async () => (await api.get<ScreeningQuota>('/employer/screening/quota')).data });
  const run = useMutation({
    mutationFn: async () => (await api.post<{ screened: number; remainingUnscreened: number }>(`/employer/jobs/${jobId}/screen-new`)).data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['employer', 'applications'] });
      qc.invalidateQueries({ queryKey: QUOTA_KEY });
      toast(r.screened ? `Đã chấm ${r.screened} hồ sơ${r.remainingUnscreened ? `, còn ${r.remainingUnscreened} hồ sơ chưa chấm` : ''}` : 'Không còn hồ sơ nào chưa chấm');
    },
  });
  if (!quota?.limit) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => run.mutate()}
        disabled={run.isPending || !quota.remaining}
        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        title="Chấm tối đa 5 hồ sơ chưa chấm mỗi lần"
      >
        {run.isPending ? 'Đang chấm…' : '🤖 AI chấm hồ sơ mới'}
      </button>
      <span className="text-xs text-slate-500">Còn {quota.remaining}/{quota.limit} lượt hôm nay</span>
      {run.isError && <Alert type="error">{errorMessage(run.error)}</Alert>}
    </div>
  );
}

export default function ApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const [kw, setKw] = useState(params.get('q') ?? '');
  useEffect(() => setKw(params.get('q') ?? ''), [params]);
  const page = Number(params.get('page') ?? 1);
  const query = { jobId: params.get('jobId') || undefined, status: params.get('status') || undefined, q: params.get('q') || undefined, pending: params.get('pending') || undefined, sort: params.get('sort') || undefined };

  const { data: jobs } = useQuery({
    queryKey: ['employer', 'jobs', 'all-for-filter'],
    queryFn: async () => (await api.get<Paginated<EmployerJobRow>>('/employer/jobs', { params: { limit: 50 } })).data.items,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['employer', 'applications', query, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/employer/applications', { params: { ...query, page, limit: 15 } })).data,
    placeholderData: keepPreviousData,
  });

  function setFilter(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setParams(next);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ứng viên ứng tuyển</h1>
      {params.get('pending') && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Đang lọc: hồ sơ chờ quá 3 ngày chưa được phản hồi. Phản hồi (Phù hợp / Phỏng vấn / Từ chối) hoặc nhắn tin để giữ nhãn "Phản hồi nhanh".
          <button onClick={() => setFilter('pending', '')} className="font-medium underline">Bỏ lọc</button>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_200px_1fr]">
        <Select value={params.get('jobId') ?? ''} onChange={(e) => setFilter('jobId', e.target.value)} placeholder="Tất cả tin tuyển dụng" options={(jobs ?? []).map((j) => ({ value: j.id, label: j.title }))} />
        <Select
          value={params.get('status') ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          placeholder="Mọi trạng thái"
          options={Object.entries(APPLICATION_STATUS).map(([value, s]) => ({ value, label: s.label }))}
        />
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); setFilter('q', kw.trim()); }} className="flex gap-2">
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Tên ứng viên…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
          <button className="rounded-lg bg-brand-600 px-3 text-sm text-white">Tìm</button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={params.get('sort') ?? 'newest'}
          onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}
          options={[
            { value: 'newest', label: 'Mới nhất' },
            { value: 'ai', label: 'Điểm AI cao nhất' },
          ]}
          className="w-auto"
        />
        {params.get('jobId') && <BatchScreen jobId={Number(params.get('jobId'))} />}
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {data.items.map((a) => {
              const st = APPLICATION_STATUS[a.status];
              return (
                <li key={a.id}>
                  <Link to={`/employer/applications/${a.id}`} className={`flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 ${a.status === 'SUBMITTED' ? 'bg-brand-50/50' : ''}`}>
                    {a.candidate.avatarUrl ? (
                      <img src={a.candidate.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500">{a.candidate.fullName.charAt(0)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={a.status === 'SUBMITTED' ? 'font-semibold' : 'font-medium'}>
                        {a.candidate.fullName} {a.hasNote && <span title="Có ghi chú">📝</span>}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {a.candidate.headline ?? 'Chưa có tiêu đề'} · {a.candidate.yearsOfExperience} năm KN{a.candidate.location ? ` · ${a.candidate.location}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">Ứng tuyển “{a.job.title}” ngày {formatDate(a.createdAt)}</p>
                    </div>
                    {a.ai && (
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${VERDICT[a.ai.verdict].cls}`} title={`AI: ${VERDICT[a.ai.verdict].label}`}>
                        🤖 {a.ai.score}
                      </span>
                    )}
                    <span className={`rounded px-2 py-1 text-xs font-medium ${st?.cls}`}>{a.status === 'SUBMITTED' ? 'Mới' : st?.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n); }} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có ứng viên nào.</div>
      )}
    </div>
  );
}
