import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import CompanyLogo from '../../components/CompanyLogo';
import Pagination from '../../components/Pagination';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { APPLICATION_STATUS, formatDate } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

interface MyApplication {
  id: number;
  status: string;
  createdAt: string;
  statusChangedAt: string | null;
  resumeFileName: string;
  coverLetter: string | null;
  canWithdraw: boolean;
  hasMessages: boolean;
  unreadMessages: boolean;
  job: {
    id: number;
    slug: string;
    title: string;
    status: string;
    deadline: string;
    location: string | null;
    company: { name: string; slug: string; logoUrl: string | null };
  };
}

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['candidate', 'applications', page],
    queryFn: async () => (await api.get<Paginated<MyApplication>>('/candidate/applications', { params: { page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => api.post(`/candidate/applications/${id}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'applications'] }),
    meta: { successMessage: 'Đã rút đơn ứng tuyển' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Việc đã ứng tuyển</h1>
      {withdraw.isError && <Alert type="error">{errorMessage(withdraw.error)}</Alert>}
      {isError && !data ? (
        <Alert type="error">
          {errorMessage(error)}{' '}
          <button type="button" onClick={() => refetch()} className="font-medium underline">Thử lại</button>
        </Alert>
      ) : isLoading ? (
        <ListSkeleton />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.items.map((a) => {
              const st = APPLICATION_STATUS[a.status];
              return (
                <div key={a.id} className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
                  <CompanyLogo name={a.job.company.name} url={a.job.company.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/jobs/${a.job.slug}`} className="font-semibold hover:text-brand-600">
                      {a.job.title}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {a.job.company.name}
                      {a.job.location ? ` · ${a.job.location}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nộp ngày {formatDate(a.createdAt)} · CV: {a.resumeFileName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${st?.cls}`}>{st?.label ?? a.status}</span>
                    {a.hasMessages && (
                      <Link to={`/candidate/messages/${a.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                        💬 Tin nhắn{a.unreadMessages ? ' (mới)' : ''}
                      </Link>
                    )}
                    {a.canWithdraw && (
                      <button
                        disabled={withdraw.isPending}
                        onClick={() => window.confirm('Rút đơn ứng tuyển này? Bạn sẽ không thể nộp lại.') && withdraw.mutate(a.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Rút đơn
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Bạn chưa ứng tuyển việc nào.{' '}
          <Link to="/jobs" className="text-brand-600 hover:underline">
            Tìm việc ngay
          </Link>
        </div>
      )}
    </div>
  );
}
