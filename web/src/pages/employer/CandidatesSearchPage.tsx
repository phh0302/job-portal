import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import Select from '../../components/Select';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useLocations, useSkills } from '../../lib/catalog';
import { formatSalary } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import CandidateProfileView from './CandidateProfileView';
import type { CandidateView } from './types';
import { ListSkeleton } from '../../components/Skeleton';

interface Row {
  id: number;
  fullName: string;
  headline: string | null;
  avatarUrl: string | null;
  location: string | null;
  yearsOfExperience: number;
  expectedSalary: number | null;
  skills: { id: number; name: string }[];
}

export function CandidatesSearchPage() {
  const [params, setParams] = useSearchParams();
  const [kw, setKw] = useState(params.get('q') ?? '');
  useEffect(() => setKw(params.get('q') ?? ''), [params]);
  const { data: skills } = useSkills();
  const { data: locations } = useLocations();
  const page = Number(params.get('page') ?? 1);
  const query = Object.fromEntries(['q', 'skillId', 'locationId', 'minExperience'].map((k) => [k, params.get(k) || undefined]));

  const { data, isLoading } = useQuery({
    queryKey: ['employer', 'candidates', query, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/employer/candidates', { params: { ...query, page, limit: 12 } })).data,
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
      <div>
        <h1 className="text-2xl font-bold">Tìm hồ sơ ứng viên</h1>
        <p className="text-sm text-slate-500">Chỉ hiển thị ứng viên đã bật “Cho phép nhà tuyển dụng tìm thấy hồ sơ”.</p>
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setFilter('q', kw.trim()); }} className="flex gap-2">
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Vị trí, kỹ năng, tên…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        <button className="rounded-lg bg-brand-600 px-4 text-white">Tìm</button>
      </form>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={params.get('skillId') ?? ''} onChange={(e) => setFilter('skillId', e.target.value)} placeholder="Mọi kỹ năng" options={(skills ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <Select value={params.get('locationId') ?? ''} onChange={(e) => setFilter('locationId', e.target.value)} placeholder="Mọi tỉnh/thành" options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
        <Select value={params.get('minExperience') ?? ''} onChange={(e) => setFilter('minExperience', e.target.value)} placeholder="Mọi kinh nghiệm" options={[1, 2, 3, 5].map((y) => ({ value: y, label: `Từ ${y} năm` }))} />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {data.items.map((c) => (
              <Link key={c.id} to={`/employer/candidates/${c.id}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600/40 hover:shadow-sm">
                {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500">{c.fullName.charAt(0)}</span>}
                <div className="min-w-0">
                  <p className="font-semibold">{c.fullName}</p>
                  <p className="truncate text-sm text-slate-600">{c.headline ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {c.yearsOfExperience} năm KN{c.location ? ` · ${c.location}` : ''}
                    {c.expectedSalary !== null && ` · mong muốn ${formatSalary(c.expectedSalary, null, false).replace('Từ ', '')}`}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.skills.slice(0, 5).map((s) => <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{s.name}</span>)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n); }} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Không tìm thấy hồ sơ phù hợp.</div>
      )}
    </div>
  );
}

type CandidateDetail = CandidateView & { contactUnlocked: boolean; credits: { contact: number; planActive: boolean } };

function UnlockBox({ c, id }: { c: CandidateDetail; id: string }) {
  const qc = useQueryClient();
  const unlock = useMutation({
    mutationFn: async () => (await api.post(`/employer/candidates/${id}/unlock`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer', 'candidate', id] });
      qc.invalidateQueries({ queryKey: ['employer', 'billing'] });
    },
    meta: { successMessage: 'Đã mở thông tin liên hệ' },
  });
  if (c.contactUnlocked) return null;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-medium">Thông tin liên hệ (email, số điện thoại, địa chỉ) đang ẩn.</p>
      {c.credits.planActive && c.credits.contact > 0 ? (
        <>
          <p className="mt-1 text-slate-600">Dùng 1 lượt để xem (còn {c.credits.contact} lượt). Mở 1 lần, cả công ty xem được mãi.</p>
          {unlock.isError && <div className="mt-2"><Alert type="error">{errorMessage(unlock.error)}</Alert></div>}
          <button onClick={() => unlock.mutate()} disabled={unlock.isPending} className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            Mở thông tin liên hệ
          </button>
        </>
      ) : (
        <p className="mt-1 text-slate-600">
          {c.credits.planActive ? 'Bạn đã hết lượt mở liên hệ.' : 'Cần gói dịch vụ còn hạn để mở thông tin liên hệ.'}{' '}
          <Link to="/employer/billing" className="font-medium text-brand-600 hover:underline">Xem gói dịch vụ</Link>
        </p>
      )}
    </section>
  );
}

export function CandidateDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employer', 'candidate', id],
    queryFn: async () => (await api.get<CandidateDetail>(`/employer/candidates/${id}`)).data,
  });
  return (
    <div className="space-y-4">
      <Link to="/employer/candidates" className="text-sm text-brand-600 hover:underline">← Tìm hồ sơ</Link>
      {isLoading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : error || !data ? (
        <Alert type="error">{errorMessage(error)}</Alert>
      ) : (
        <>
          <UnlockBox c={data} id={id} />
          <CandidateProfileView c={data} />
        </>
      )}
    </div>
  );
}
