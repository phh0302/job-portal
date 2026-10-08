import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import CompanyLogo from '../components/CompanyLogo';
import JobCard from '../components/JobCard';
import Select from '../components/Select';
import { api } from '../lib/api';
import { useCategories, useLocations } from '../lib/catalog';
import { useSeo } from '../lib/seo';
import { usePublicSettings } from '../lib/settings';
import type { CompanyCard, JobCard as Job, Paginated } from '../lib/types';
import { ListSkeleton } from '../components/Skeleton';

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [locationId, setLocationId] = useState('');
  const { data: locations } = useLocations();
  const { data: categories } = useCategories();
  const { data: settings } = usePublicSettings();
  useSeo({});
  const { data: latest, isLoading } = useQuery({
    queryKey: ['jobs', 'latest'],
    queryFn: async () => (await api.get<Paginated<Job>>('/jobs', { params: { limit: 6, sort: 'newest' } })).data,
  });

  const { data: topCompanies } = useQuery({
    queryKey: ['companies', 'top'],
    queryFn: async () => (await api.get<Paginated<CompanyCard & { openJobs: number }>>('/companies', { params: { limit: 6 } })).data.items,
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (locationId) p.set('locationId', locationId);
    navigate(`/jobs?${p}`);
  }

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{settings?.homeBannerTitle ?? 'Tìm công việc phù hợp với bạn'}</h1>
          <p className="mt-3 text-slate-600">{settings?.homeBannerSubtitle ?? 'Hàng nghìn việc làm từ các nhà tuyển dụng uy tín'}</p>
          <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 shadow-sm sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 rounded-lg px-4 py-3 outline-none"
              placeholder="Vị trí, kỹ năng, công ty…"
            />
            <Select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              placeholder="Tất cả tỉnh/thành"
              options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
              className="border-0 py-3 sm:w-52"
            />
            <button className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Việc làm mới nhất</h2>
          <Link to="/jobs" className="text-sm text-brand-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {isLoading ? (
          <ListSkeleton rows={4} grid />
        ) : latest?.items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {latest.items.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">Chưa có việc làm nào.</p>
        )}
      </section>

      {topCompanies && topCompanies.some((c) => c.openJobs > 0) && (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">Công ty hàng đầu</h2>
            <Link to="/companies" className="text-sm text-brand-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCompanies.map((c) => (
              <Link key={c.id} to={`/companies/${c.slug}`} className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-brand-600/40 hover:shadow-sm">
                <CompanyLogo name={c.name} url={c.logoUrl} size={56} />
                <p className="mt-2 line-clamp-2 text-sm font-medium">{c.name}</p>
                <p className="text-xs text-brand-600">{c.openJobs} việc đang tuyển</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="mb-4 text-xl font-bold">Ngành nghề</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to={`/jobs?categoryId=${c.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm hover:border-brand-600 hover:text-brand-600"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
