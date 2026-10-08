import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { api } from '../../lib/api';
import type { MyReview, PublicReview, ReviewSummary } from '../../lib/reviews';
import type { Paginated } from '../../lib/types';
import Modal from '../Modal';
import Pagination from '../Pagination';
import ReviewForm from './ReviewForm';
import ReviewItem from './ReviewItem';
import ReviewSummaryBox from './ReviewSummaryBox';

/** Khối "Đánh giá" trên trang công ty */
export default function CompanyReviews({ companyId, slug, companyName }: { companyId: number; slug: string; companyName: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['reviews', 'company', slug, page],
    queryFn: async () => (await api.get<Paginated<PublicReview> & { summary: ReviewSummary }>(`/companies/${slug}/reviews`, { params: { page, limit: 5 } })).data,
    placeholderData: keepPreviousData,
  });
  const isCandidate = user?.role === 'CANDIDATE';
  const { data: mine } = useQuery({
    queryKey: ['reviews', 'mine', companyId],
    queryFn: async () => (await api.get<MyReview | null>(`/candidate/reviews/company/${companyId}`)).data,
    enabled: isCandidate,
  });

  const canWrite = !user || isCandidate;
  const onWrite = () => (user ? setOpen(true) : navigate('/login', { state: { from: location.pathname } }));

  return (
    <section id="reviews" className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Đánh giá công ty</h2>
        {canWrite && (
          <button onClick={onWrite} className="rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50">
            {mine ? 'Sửa đánh giá của bạn' : '✎ Viết đánh giá'}
          </button>
        )}
      </div>
      {mine && mine.status !== 'APPROVED' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {mine.status === 'PENDING' ? 'Đánh giá của bạn đang chờ duyệt.' : `Đánh giá của bạn bị từ chối: ${mine.rejectReason ?? ''}`}
        </p>
      )}
      {data && <ReviewSummaryBox s={data.summary} />}
      {data?.items.map((r) => <ReviewItem key={r.id} r={r} companyName={companyName} />)}
      {data && data.items.length === 0 && <p className="text-sm text-slate-500">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm!</p>}
      {data && <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />}

      <Modal open={open} onClose={() => setOpen(false)} title={`Đánh giá ${companyName}`}>
        <ReviewForm companyId={companyId} initial={mine} onDone={() => setOpen(false)} />
      </Modal>
    </section>
  );
}
