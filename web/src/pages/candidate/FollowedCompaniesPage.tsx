import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Pagination from '../../components/Pagination';
import { api } from '../../lib/api';
import type { CompanyCard, Paginated } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

type Followed = CompanyCard & { openJobs: number; followedAt: string };

export default function FollowedCompaniesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['candidate', 'followed-companies', page],
    queryFn: async () => (await api.get<Paginated<Followed>>('/candidate/followed-companies', { params: { page, limit: 12 } })).data,
    placeholderData: keepPreviousData,
  });
  const unfollow = useMutation({
    mutationFn: (id: number) => api.delete(`/candidate/followed-companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'followed-companies'] });
      qc.invalidateQueries({ queryKey: ['company-follow'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Công ty đang theo dõi</h1>
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <CompanyLogo name={c.name} url={c.logoUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <Link to={`/companies/${c.slug}`} className="line-clamp-2 font-semibold hover:text-brand-600">{c.name}</Link>
                  <p className="text-sm text-slate-500">{c.location ?? ''}</p>
                  <Link to={`/companies/${c.slug}`} className="text-sm text-brand-600">{c.openJobs} việc đang tuyển</Link>
                </div>
                <button onClick={() => unfollow.mutate(c.id)} className="self-start text-xs text-slate-500 hover:text-red-600">
                  Bỏ theo dõi
                </button>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Bạn chưa theo dõi công ty nào.{' '}
          <Link to="/companies" className="text-brand-600 hover:underline">Khám phá công ty</Link>
        </div>
      )}
    </div>
  );
}
