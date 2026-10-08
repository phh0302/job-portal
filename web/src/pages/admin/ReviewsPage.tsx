import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import ReviewItem from '../../components/reviews/ReviewItem';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { REVIEW_STATUS, type MyReview, type ReviewStatus } from '../../lib/reviews';
import type { Paginated } from '../../lib/types';
import { Empty, ReasonModal, Tabs } from './shared';

type Row = MyReview & { company: { id: number; name: string; slug: string }; updatedAt: string };

const PRESETS = ['Ngôn từ xúc phạm, thiếu văn minh', 'Chứa thông tin cá nhân của người khác', 'Nội dung không liên quan / spam', 'Có dấu hiệu đánh giá giả mạo'];

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Row | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'reviews', status, page],
    queryFn: async () => (await api.get<Paginated<Row>>('/admin/reviews', { params: { status: status || undefined, page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });
  const done = () => qc.invalidateQueries({ queryKey: ['admin'] });
  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/admin/reviews/${id}/approve`),
    onSuccess: done,
    meta: { successMessage: 'Đã duyệt đánh giá' },
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/admin/reviews/${id}/reject`, { reason }),
    onSuccess: () => {
      done();
      setRejecting(null);
    },
    meta: { successMessage: 'Đã từ chối / gỡ đánh giá' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Duyệt đánh giá công ty</h1>
      <Tabs
        tabs={[
          { value: 'PENDING', label: 'Chờ duyệt' },
          { value: 'APPROVED', label: 'Đã đăng' },
          { value: 'REJECTED', label: 'Bị từ chối' },
          { value: '', label: 'Tất cả' },
        ]}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />
      {approve.isError && <Alert type="error">{errorMessage(approve.error)}</Alert>}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <Alert type="error">{errorMessage(error)}</Alert>
      ) : !data?.items.length ? (
        <Empty>Không có đánh giá nào.</Empty>
      ) : (
        <>
          {data.items.map((r) => {
            const st = REVIEW_STATUS[r.status];
            return (
              <div key={r.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link to={`/companies/${r.company.slug}`} target="_blank" className="font-semibold hover:text-brand-600">{r.company.name}</Link>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                  <span className="text-xs text-slate-500">
                    Người viết: {r.author}
                    {r.isAnonymous ? ' (ẩn danh khi đăng)' : ''}
                  </span>
                  {r.rejectReason && <span className="text-xs text-red-600">Lý do: {r.rejectReason}</span>}
                </div>
                <ReviewItem
                  r={r}
                  companyName={r.company.name}
                  extra={
                    <div className="mt-3 flex gap-2">
                      {r.status === 'PENDING' && (
                        <button onClick={() => approve.mutate(r.id)} disabled={approve.isPending} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                          Duyệt
                        </button>
                      )}
                      {r.status !== 'REJECTED' && (
                        <button onClick={() => setRejecting(r)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                          {r.status === 'APPROVED' ? 'Gỡ đánh giá' : 'Từ chối'}
                        </button>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
      <ReasonModal
        open={!!rejecting}
        title={rejecting?.status === 'APPROVED' ? 'Gỡ đánh giá' : 'Từ chối đánh giá'}
        label="Lý do (gửi tới người viết)"
        confirmText="Xác nhận"
        danger
        presets={PRESETS}
        pending={reject.isPending}
        error={reject.isError ? reject.error : null}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => rejecting && reject.mutate({ id: rejecting.id, reason })}
      />
    </div>
  );
}
