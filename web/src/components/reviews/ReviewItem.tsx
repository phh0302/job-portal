import type { ReactNode } from 'react';
import { formatDate } from '../../lib/format';
import { RELATION_LABEL, type PublicReview } from '../../lib/reviews';
import { Stars } from './Stars';

export default function ReviewItem({ r, extra, companyName }: { r: PublicReview; extra?: ReactNode; companyName?: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={r.rating} />
        <h3 className="font-semibold">{r.title}</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {r.author ?? 'Người dùng ẩn danh'} · {RELATION_LABEL[r.relation]} · {formatDate(r.createdAt)}
      </p>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium text-green-700">👍 Điểm tốt</p>
          <p className="whitespace-pre-line text-slate-700">{r.pros}</p>
        </div>
        <div>
          <p className="font-medium text-red-700">👎 Điểm chưa tốt</p>
          <p className="whitespace-pre-line text-slate-700">{r.cons}</p>
        </div>
      </div>
      {r.employerReply && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">Phản hồi từ {companyName ?? 'công ty'}</p>
          <p className="whitespace-pre-line text-slate-700">{r.employerReply}</p>
        </div>
      )}
      {extra}
    </article>
  );
}
