import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import JobCard from '../../components/JobCard';
import Pagination from '../../components/Pagination';
import { api } from '../../lib/api';
import type { JobCard as Job, Paginated } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

type SavedJob = Job & { isOpen: boolean; savedAt: string };

export default function SavedJobsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['candidate', 'saved-jobs', page],
    queryFn: async () => (await api.get<Paginated<SavedJob>>('/candidate/saved-jobs', { params: { page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Việc làm đã lưu</h1>
      {isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length ? (
        <>
          <div className="space-y-3">
            {data.items.map((j) => (
              <div key={j.id} className={j.isOpen ? '' : 'opacity-60'}>
                {!j.isOpen && <p className="mb-1 text-xs font-medium text-red-600">Tin đã hết hạn / đóng</p>}
                <JobCard job={j} />
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Bạn chưa lưu việc làm nào. Bấm ♡ trên tin tuyển dụng để lưu.{' '}
          <Link to="/jobs" className="text-brand-600 hover:underline">Tìm việc</Link>
        </div>
      )}
    </div>
  );
}
