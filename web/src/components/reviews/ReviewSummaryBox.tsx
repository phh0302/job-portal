import type { ReviewSummary } from '../../lib/reviews';
import { Stars } from './Stars';

export default function ReviewSummaryBox({ s }: { s: ReviewSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-center">
        <p className="text-4xl font-bold">{s.count ? s.average.toFixed(1) : '–'}</p>
        <Stars value={s.average} />
        <p className="mt-1 text-xs text-slate-500">{s.count} đánh giá</p>
      </div>
      <table className="flex-1 text-xs" aria-label="Phân bố số sao">
        <tbody>
          {[5, 4, 3, 2, 1].map((n) => {
            const v = s.distribution[n - 1] ?? 0;
            const pct = s.count ? Math.round((v / s.count) * 100) : 0;
            return (
              <tr key={n}>
                <th scope="row" className="w-10 py-0.5 text-left font-normal text-slate-600">{n} ★</th>
                <td className="py-0.5">
                  <div className="h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="w-10 py-0.5 text-right text-slate-500">{v}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
