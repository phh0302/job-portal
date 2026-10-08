import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import JobCard from '../../components/JobCard';
import { ListSkeleton, Skeleton } from '../../components/Skeleton';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import type { JobCard as Job } from '../../lib/types';

interface Rec {
  job: Job;
  score: number;
  breakdown: Record<'skills' | 'title' | 'category' | 'location' | 'experience' | 'salary', number>;
  matchedSkills: string[];
  missingSkills: string[];
  saved: boolean;
  reasons: string[];
}
interface RecResponse {
  aiEnabled: boolean;
  profileTips: string[];
  items: Rec[];
}
interface Insights {
  enabled: boolean;
  summary?: string;
  items?: { jobId: number; reason: string; tip: string | null }[];
  model?: string;
}

const BREAKDOWN_LABEL: Record<keyof Rec['breakdown'], [string, number]> = {
  skills: ['Kỹ năng', 40],
  title: ['Chức danh', 15],
  category: ['Ngành quan tâm', 15],
  location: ['Địa điểm', 10],
  experience: ['Kinh nghiệm', 10],
  salary: ['Mức lương', 10],
};

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-green-600' : score >= 50 ? 'bg-brand-600' : 'bg-slate-500';
  return (
    <div className="flex shrink-0 flex-col items-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${tone}`}>{score}%</span>
      <span className="mt-0.5 text-[11px] text-slate-500">phù hợp</span>
    </div>
  );
}

function RecItem({ r, ai, aiLoading }: { r: Rec; ai?: { reason: string; tip: string | null }; aiLoading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-600/40">
      <div className="flex gap-3">
        <ScoreBadge score={r.score} />
        <div className="min-w-0 flex-1">
          <JobCard job={r.job} bare />
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm sm:pl-[60px]">
        {ai ? (
          <div className="rounded-lg bg-brand-50 px-3 py-2">
            <p className="text-xs font-medium text-brand-700">✦ Nhận xét của AI</p>
            <p className="text-slate-700">{ai.reason}</p>
            {ai.tip && <p className="mt-1 text-slate-600"><span className="font-medium">Gợi ý:</span> {ai.tip}</p>}
          </div>
        ) : aiLoading ? (
          <div className="space-y-1.5 rounded-lg bg-slate-50 px-3 py-2" aria-label="AI đang phân tích">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : r.reasons.length ? (
          <ul className="list-disc space-y-0.5 pl-5 text-slate-600">
            {r.reasons.map((x) => <li key={x}>{x}</li>)}
          </ul>
        ) : null}

        {(r.matchedSkills.length > 0 || r.missingSkills.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {r.matchedSkills.map((s) => (
              <span key={s} className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">✓ {s}</span>
            ))}
            {r.missingSkills.map((s) => (
              <span key={s} className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500" title="Kỹ năng tin yêu cầu mà hồ sơ bạn chưa có">
                + {s}
              </span>
            ))}
          </div>
        )}

        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer select-none hover:text-slate-700">Cách tính điểm</summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {(Object.keys(BREAKDOWN_LABEL) as (keyof Rec['breakdown'])[]).map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt>{BREAKDOWN_LABEL[k][0]}</dt>
                <dd className="tabular-nums text-slate-700">{r.breakdown[k]}/{BREAKDOWN_LABEL[k][1]}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate', 'recommendations'],
    queryFn: async () => (await api.get<RecResponse>('/candidate/recommendations')).data,
  });
  // Nhận xét AI tải riêng (chậm hơn), không chặn danh sách
  const insights = useQuery({
    queryKey: ['candidate', 'recommendations', 'insights'],
    queryFn: async () => (await api.get<Insights>('/candidate/recommendations/insights')).data,
    enabled: !!data?.aiEnabled && data.items.length > 0,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const aiMap = new Map((insights.data?.items ?? []).map((i) => [i.jobId, i]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Việc làm gợi ý cho bạn</h1>
        <p className="text-sm text-slate-500">
          Xếp theo độ phù hợp với kỹ năng, kinh nghiệm, địa điểm, mức lương và các việc bạn từng quan tâm. Việc đã ứng tuyển không hiện ở đây.
        </p>
      </div>

      {data && data.profileTips.length > 0 && (
        <Alert type="info">
          <p className="font-medium">Hoàn thiện hồ sơ để gợi ý chính xác hơn:</p>
          <ul className="mt-1 list-disc pl-5">
            {data.profileTips.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <Link to="/candidate/profile" className="mt-1 inline-block font-medium underline">Cập nhật hồ sơ →</Link>
        </Alert>
      )}

      {data?.aiEnabled && data.items.length > 0 && (
        <section className="rounded-xl border border-brand-600/20 bg-gradient-to-br from-brand-50 to-white p-4">
          <p className="text-sm font-semibold text-brand-700">✦ Trợ lý nghề nghiệp AI</p>
          {insights.isLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <p className="text-xs text-slate-500">AI đang phân tích hồ sơ của bạn…</p>
            </div>
          ) : insights.data?.summary ? (
            <p className="mt-1 text-slate-700">{insights.data.summary}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              {insights.isError ? errorMessage(insights.error, 'Chưa lấy được nhận xét của AI, vui lòng thử lại sau.') : 'AI chưa có nhận xét lúc này.'}
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Nhận xét do AI tạo, chỉ mang tính tham khảo. Chỉ kỹ năng, kinh nghiệm và mong muốn công việc (không gồm họ tên, email, SĐT) được gửi để phân tích.
          </p>
        </section>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <Alert type="error">{errorMessage(error)}</Alert>
      ) : data && data.items.length ? (
        <div className="space-y-3">
          {data.items.map((r) => (
            <RecItem key={r.job.id} r={r} ai={aiMap.get(r.job.id)} aiLoading={insights.isLoading && data.items.indexOf(r) < 8} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Chưa tìm được việc đủ phù hợp. Hãy bổ sung kỹ năng và tiêu đề nghề nghiệp trong hồ sơ, hoặc{' '}
          <Link to="/jobs" className="text-brand-600 hover:underline">xem tất cả việc làm</Link>.
        </div>
      )}
    </div>
  );
}
