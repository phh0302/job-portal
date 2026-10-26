import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { QUOTA_KEY, REQ_STATUS, VERDICT, type Screening, type ScreeningQuota } from '../../lib/screening';

/** Khối "AI đánh giá CV" ở chi tiết đơn ứng tuyển */
export default function AiScreeningCard({ applicationId, withdrawn }: { applicationId: number; withdrawn: boolean }) {
  const qc = useQueryClient();
  const key = ['employer', 'screening', applicationId];
  const { data: s, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<Screening | ''>(`/employer/applications/${applicationId}/screening`)).data || null,
  });
  const { data: quota } = useQuery({ queryKey: QUOTA_KEY, queryFn: async () => (await api.get<ScreeningQuota>('/employer/screening/quota')).data });
  const run = useMutation({
    mutationFn: async () => (await api.post<Screening>(`/employer/applications/${applicationId}/screening`)).data,
    onSuccess: (d) => {
      qc.setQueryData(key, d);
      qc.invalidateQueries({ queryKey: QUOTA_KEY });
      qc.invalidateQueries({ queryKey: ['employer', 'applications'] });
    },
  });

  const canRun = !withdrawn && !!quota && quota.remaining > 0;
  const button = (
    <button
      onClick={() => run.mutate()}
      disabled={!canRun || run.isPending}
      className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
    >
      {run.isPending ? 'Đang phân tích CV…' : s ? '↻ Phân tích lại' : '🤖 Phân tích CV bằng AI'}
    </button>
  );

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">🤖 AI đánh giá mức phù hợp</h3>
        {quota && (
          <span className="text-xs text-slate-500">
            {quota.limit ? `Còn ${quota.remaining}/${quota.limit} lượt hôm nay` : 'Tính năng đang tắt'}
          </span>
        )}
      </div>
      {run.isError && <div className="mt-2"><Alert type="error">{errorMessage(run.error)}</Alert></div>}

      {isLoading ? (
        <p className="mt-2 text-sm text-slate-500">Đang tải…</p>
      ) : !s ? (
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>So sánh CV với yêu cầu của tin: điểm phù hợp, yêu cầu nào đáp ứng / còn thiếu, câu hỏi phỏng vấn gợi ý.</p>
          {button}
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-violet-200 text-lg font-bold" aria-label={`Điểm phù hợp ${s.score} trên 100`}>
              {s.score}
            </div>
            <div>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${VERDICT[s.verdict].cls}`}>{VERDICT[s.verdict].label}</span>
              <p className="mt-1 text-xs text-slate-500">
                {s.source === 'AI' ? 'Phân tích bởi AI' : 'So khớp từ khoá (chưa bật AI)'} · {new Date(s.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
          {!s.cvReadable && <Alert type="info">Không đọc được nội dung file CV (vd. file .doc cũ hoặc ảnh scan) – đánh giá dựa trên hồ sơ ứng viên.</Alert>}
          <p className="text-slate-700">{s.summary}</p>

          {s.requirements.length > 0 && (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Đối chiếu yêu cầu</caption>
              <tbody className="divide-y divide-slate-100">
                {s.requirements.map((r, i) => (
                  <tr key={i} className="align-top">
                    <td className={`w-6 py-1.5 font-bold ${REQ_STATUS[r.status].cls}`} title={REQ_STATUS[r.status].label}>{REQ_STATUS[r.status].icon}</td>
                    <td className="py-1.5">
                      <p className="font-medium">{r.requirement}</p>
                      {r.evidence && <p className="text-slate-500">{r.evidence}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {s.strengths.length > 0 && (
            <div>
              <p className="font-medium text-green-700">Điểm mạnh</p>
              <ul className="ml-4 list-disc text-slate-700">{s.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {s.gaps.length > 0 && (
            <div>
              <p className="font-medium text-red-700">Còn thiếu</p>
              <ul className="ml-4 list-disc text-slate-700">{s.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {s.interviewQuestions.length > 0 && (
            <div>
              <p className="font-medium">Câu hỏi phỏng vấn gợi ý</p>
              <ol className="ml-4 list-decimal text-slate-700">{s.interviewQuestions.map((x, i) => <li key={i}>{x}</li>)}</ol>
            </div>
          )}
          {button}
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        Kết quả chỉ để tham khảo, quyết định cuối cùng thuộc về bạn. AI được yêu cầu chỉ xét năng lực liên quan công việc, bỏ qua tuổi, giới tính, ngoại hình, quê quán…
      </p>
    </section>
  );
}
