import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Pagination from '../../components/Pagination';
import { ListSkeleton } from '../../components/Skeleton';
import { toast } from '../../components/Toast';
import ReviewItem from '../../components/reviews/ReviewItem';
import ReviewSummaryBox from '../../components/reviews/ReviewSummaryBox';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { PublicReview, ReviewSummary } from '../../lib/reviews';
import type { Paginated } from '../../lib/types';

type Data = Paginated<PublicReview> & { summary: ReviewSummary; canReply: boolean };

function ReplyBox({ r, onDone }: { r: PublicReview; onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(r.employerReply ?? '');
  const save = useMutation({
    mutationFn: async (reply: string) => (await api.post(`/employer/reviews/${r.id}/reply`, { reply })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', 'employer'] });
      toast('Đã lưu phản hồi');
      onDone();
    },
  });
  return (
    <div className="mt-3 space-y-2">
      {save.isError && <Alert type="error">{errorMessage(save.error)}</Alert>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Cảm ơn bạn đã chia sẻ…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
      />
      <div className="flex gap-2">
        <button onClick={() => save.mutate(text.trim())} disabled={save.isPending} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
          Lưu phản hồi
        </button>
        <button onClick={onDone} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Huỷ</button>
      </div>
      <p className="text-xs text-slate-500">Phản hồi hiển thị công khai dưới đánh giá. Để trống rồi lưu để xoá phản hồi.</p>
    </div>
  );
}

export default function EmployerReviewsPage() {
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<number | null>(null);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reviews', 'employer', page],
    queryFn: async () => (await api.get<Data>('/employer/reviews', { params: { page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Đánh giá công ty</h1>
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <Alert type="error">{errorMessage(error)}</Alert>
      ) : data ? (
        <>
          <ReviewSummaryBox s={data.summary} />
          {!data.canReply && <p className="text-sm text-slate-500">Chỉ quản trị viên công ty mới phản hồi được đánh giá.</p>}
          {data.items.length === 0 && <p className="text-slate-500">Chưa có đánh giá nào được đăng.</p>}
          {data.items.map((r) => (
            <ReviewItem
              key={r.id}
              r={r}
              extra={
                data.canReply &&
                (replying === r.id ? (
                  <ReplyBox r={r} onDone={() => setReplying(null)} />
                ) : (
                  <button onClick={() => setReplying(r.id)} className="mt-3 text-sm text-brand-600 hover:underline">
                    {r.employerReply ? 'Sửa phản hồi' : 'Phản hồi'}
                  </button>
                ))
              }
            />
          ))}
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
