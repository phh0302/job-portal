import { useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Pagination from '../../components/Pagination';
import { api } from '../../lib/api';
import { useSeo } from '../../lib/seo';
import type { CompanyCard, Paginated } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

export default function CompanyListPage() {
  const [params, setParams] = useSearchParams();
  const [kw, setKw] = useState(params.get('q') ?? '');
  const page = Number(params.get('page') ?? 1);
  const q = params.get('q') ?? '';
  useSeo({ title: 'Danh sách công ty tuyển dụng', description: 'Khám phá các công ty đang tuyển dụng, thông tin quy mô, địa chỉ và vị trí đang mở.' });

  const { data, isLoading } = useQuery({
    queryKey: ['companies', q, page],
    queryFn: async () =>
      (await api.get<Paginated<CompanyCard & { openJobs: number; rating: { average: number; count: number } }>>('/companies', { params: { q: q || undefined, page, limit: 12 } })).data,
    placeholderData: keepPreviousData,
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setParams(kw.trim() ? { q: kw.trim() } : {});
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold">Công ty</h1>
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Tên công ty…" className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-brand-600" />
        <button className="rounded-lg bg-brand-600 px-5 font-medium text-white hover:bg-brand-700">Tìm</button>
      </form>
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((c) => (
              <Link key={c.id} to={`/companies/${c.slug}`} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600/40 hover:shadow-sm">
                <CompanyLogo name={c.name} url={c.logoUrl} size={56} />
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold">
                    {c.name}
                    {c.verified && <span className="ml-1 text-brand-600">✔</span>}
                  </p>
                  <p className="text-sm text-slate-500">{c.location ?? ''}</p>
                  <p className="mt-1 text-sm text-brand-600">{c.openJobs} việc đang tuyển</p>
                  {c.rating.count > 0 && (
                    <p className="text-xs text-slate-500"><span className="text-amber-500">★</span> {c.rating.average.toFixed(1)} ({c.rating.count})</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {data && data.items.length === 0 && <p className="mt-6 text-center text-slate-500">Không tìm thấy công ty.</p>}
          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onChange={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', String(p));
                setParams(next);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
