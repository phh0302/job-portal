import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import JobCard from '../../components/JobCard';
import Pagination from '../../components/Pagination';
import Select from '../../components/Select';
import { api } from '../../lib/api';
import { useCategories, useLocations } from '../../lib/catalog';
import { JOB_TYPE_LABEL, LEVEL_LABEL } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import type { JobCard as Job, Paginated } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

const FILTER_KEYS = ['q', 'locationId', 'categoryId', 'jobType', 'level', 'salaryMin', 'experience', 'fastResponse', 'sort', 'page'] as const;
const toOptions = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }));
const SALARY_OPTIONS = [5, 10, 15, 20, 30, 50].map((m) => ({ value: m * 1_000_000, label: `Từ ${m} triệu` }));
const EXP_OPTIONS = [0, 1, 2, 3, 5].map((y) => ({ value: y, label: y === 0 ? 'Không yêu cầu' : `Tối đa ${y} năm` }));

export default function JobListPage() {
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('q') ?? '');
  const { data: locations } = useLocations();
  const { data: categories } = useCategories();
  const locName = locations?.find((l) => String(l.id) === params.get('locationId'))?.name;
  const catName = categories?.find((c) => String(c.id) === params.get('categoryId'))?.name;
  const seoTitle = ['Việc làm', params.get('q') && `"${params.get('q')}"`, catName, locName && `tại ${locName}`].filter(Boolean).join(' ');
  useSeo({ title: seoTitle, description: `Tuyển dụng ${seoTitle.toLowerCase()} mới nhất, lương hấp dẫn, cập nhật hằng ngày trên JobPortal.` });

  useEffect(() => setKeyword(params.get('q') ?? ''), [params]);

  const query = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]).filter(([, v]) => v));
  const page = Number(params.get('page') ?? 1);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['jobs', query],
    queryFn: async () => (await api.get<Paginated<Job>>('/jobs', { params: { ...query, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
    if (key === 'page') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setFilter('q', keyword.trim());
  }

  const filterCount = ['locationId', 'categoryId', 'jobType', 'level', 'salaryMin', 'experience', 'fastResponse'].filter((k) => params.get(k)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Vị trí, kỹ năng, công ty…"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-600"
        />
        <button className="rounded-lg bg-brand-600 px-5 font-medium text-white hover:bg-brand-700">Tìm</button>
      </form>

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Bộ lọc</h2>
            {filterCount > 0 && (
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => setParams(params.get('q') ? { q: params.get('q')! } : {})}
              >
                Xóa lọc ({filterCount})
              </button>
            )}
          </div>
          <Select label="Địa điểm" value={params.get('locationId') ?? ''} onChange={(e) => setFilter('locationId', e.target.value)} placeholder="Tất cả" options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
          <Select label="Ngành nghề" value={params.get('categoryId') ?? ''} onChange={(e) => setFilter('categoryId', e.target.value)} placeholder="Tất cả" options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Mức lương" value={params.get('salaryMin') ?? ''} onChange={(e) => setFilter('salaryMin', e.target.value)} placeholder="Tất cả" options={SALARY_OPTIONS} />
          <Select label="Loại hình" value={params.get('jobType') ?? ''} onChange={(e) => setFilter('jobType', e.target.value)} placeholder="Tất cả" options={toOptions(JOB_TYPE_LABEL)} />
          <Select label="Cấp bậc" value={params.get('level') ?? ''} onChange={(e) => setFilter('level', e.target.value)} placeholder="Tất cả" options={toOptions(LEVEL_LABEL)} />
          <Select label="Kinh nghiệm" value={params.get('experience') ?? ''} onChange={(e) => setFilter('experience', e.target.value)} placeholder="Tất cả" options={EXP_OPTIONS} />
          <label className="flex items-start gap-2 rounded-lg bg-emerald-50 p-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={params.get('fastResponse') === 'true'}
              onChange={(e) => setFilter('fastResponse', e.target.checked ? 'true' : '')}
            />
            <span>
              <span className="font-medium text-emerald-800">⚡ Chỉ NTD phản hồi nhanh</span>
              <span className="block text-xs text-slate-500">Phản hồi ≥ 80% hồ sơ, trung bình trong 3 ngày</span>
            </span>
          </label>
        </aside>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              {data ? (
                <>
                  Tìm thấy <b>{data.total}</b> việc làm {isFetching && <span className="text-slate-400">…</span>}
                </>
              ) : (
                ' '
              )}
            </p>
            <Select
              value={params.get('sort') ?? 'newest'}
              onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}
              options={[
                { value: 'newest', label: 'Mới nhất' },
                { value: 'salary', label: 'Lương cao nhất' },
                { value: 'relevant', label: 'Phù hợp nhất' },
              ]}
              className="w-auto"
            />
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : isError ? (
            <p className="text-red-600">Không tải được danh sách việc làm.</p>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="space-y-3">
                {data.items.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
              <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setFilter('page', String(p))} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              Không có việc làm phù hợp. Thử bỏ bớt bộ lọc nhé.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
