import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import { ListSkeleton } from '../../components/Skeleton';
import { toast } from '../../components/Toast';
import ReviewForm from '../../components/reviews/ReviewForm';
import ReviewItem from '../../components/reviews/ReviewItem';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { REVIEW_STATUS, type MyReview } from '../../lib/reviews';

export default function CandidateReviewsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MyReview | null>(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reviews', 'mine', 'all'],
    queryFn: async () => (await api.get<MyReview[]>('/candidate/reviews')).data,
  });
  const remove = useMutation({
    mutationFn: async (companyId: number) => api.delete(`/candidate/reviews/company/${companyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      toast('Đã xoá đánh giá');
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Đánh giá của tôi</h1>
        <p className="text-sm text-slate-500">Viết đánh giá ở trang của từng công ty. Mỗi lần sửa, đánh giá sẽ được duyệt lại.</p>
      </div>
      {remove.isError && <Alert type="error">{errorMessage(remove.error)}</Alert>}
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <Alert type="error">{errorMessage(error)}</Alert>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Bạn chưa đánh giá công ty nào.{' '}
          <Link to="/companies" className="text-brand-600 hover:underline">Xem danh sách công ty</Link>
        </div>
      ) : (
        data.map((r) => {
          const st = REVIEW_STATUS[r.status];
          return (
            <div key={r.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link to={`/companies/${r.company!.slug}`} className="font-semibold hover:text-brand-600">{r.company!.name}</Link>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                {r.status === 'REJECTED' && r.rejectReason && <span className="text-xs text-red-600">Lý do: {r.rejectReason}</span>}
              </div>
              <ReviewItem
                r={{ ...r, author: r.isAnonymous ? null : 'Bạn' }}
                companyName={r.company!.name}
                extra={
                  <div className="mt-3 flex gap-3 text-sm">
                    <button onClick={() => setEditing(r)} className="text-brand-600 hover:underline">Sửa</button>
                    <button
                      onClick={() => window.confirm('Xoá đánh giá này?') && remove.mutate(r.company!.id)}
                      className="text-red-600 hover:underline"
                    >
                      Xoá
                    </button>
                  </div>
                }
              />
            </div>
          );
        })
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Sửa đánh giá ${editing?.company?.name ?? ''}`}>
        {editing && <ReviewForm companyId={editing.company!.id} initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
