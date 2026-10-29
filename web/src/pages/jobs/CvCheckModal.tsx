import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { CV_CHECK_QUOTA_KEY, PRIORITY, REQ_STATUS, VERDICT, type CvCheck, type ScreeningQuota } from '../../lib/screening';
import type { Resume } from '../../lib/types';

/** Vòng tròn % tương thích */
function MatchRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#64748b';
  return (
    <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`Tương thích ${value}%`}>
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{value}%</span>
    </div>
  );
}

export default function CvCheckModal({
  open,
  onClose,
  jobId,
  jobTitle,
  canApply,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  canApply: boolean;
  onApply: () => void;
}) {
  const qc = useQueryClient();
  const resultKey = ['candidate', 'cv-check', jobId];
  const { data: resumes } = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: async () => (await api.get<Resume[]>('/candidate/resumes')).data,
    enabled: open,
  });
  const { data: quota, error: quotaError, refetch: refetchQuota } = useQuery({
    queryKey: CV_CHECK_QUOTA_KEY,
    queryFn: async () => (await api.get<ScreeningQuota>('/candidate/cv-check/quota')).data,
    enabled: open,
  });
  const { data: last, isLoading, error: lastError, refetch: refetchLast } = useQuery({
    queryKey: resultKey,
    queryFn: async () => (await api.get<CvCheck | null>(`/candidate/jobs/${jobId}/cv-check`)).data,
    enabled: open,
  });

  // '' = chưa chọn (mặc định), 'profile' = chỉ dùng hồ sơ, số = id CV
  const [choice, setChoice] = useState<string>('');
  const defaultId = resumes?.find((r) => r.isDefault)?.id ?? resumes?.[0]?.id;
  const selected = choice || (defaultId ? String(defaultId) : 'profile');
  const [result, setResult] = useState<CvCheck | null>(null);
  useEffect(() => {
    if (open) setResult(null);
  }, [open, jobId]);
  // Lượt có thể đổi ở nơi khác (admin đổi giới hạn, tab khác) -> lấy lại mỗi lần mở cửa sổ
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: CV_CHECK_QUOTA_KEY });
  }, [open, qc]);
  const shown = result ?? last ?? null;

  const check = useMutation({
    mutationFn: async () =>
      (await api.post<CvCheck>(`/candidate/jobs/${jobId}/cv-check`, selected === 'profile' ? {} : { resumeId: Number(selected) })).data,
    onSuccess: (r) => {
      setResult(r);
      qc.setQueryData(resultKey, r);
    },
    // Cả khi lỗi (vd. 429 hết lượt) cũng cập nhật số lượt để khoá nút đúng lúc
    onSettled: () => qc.invalidateQueries({ queryKey: CV_CHECK_QUOTA_KEY }),
  });

  const noQuota = !!quota && quota.limit > 0 && quota.remaining <= 0;
  const disabled = !!quota && quota.limit === 0;

  return (
    <Modal open={open} onClose={onClose} title={`Kiểm tra CV với JD: ${jobTitle}`} wide>
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          AI đọc mô tả công việc và CV của bạn, ước tính <b>% tương thích</b> và gợi ý những điểm nên cải thiện trước khi nộp. Kết quả chỉ bạn xem
          được, nhà tuyển dụng không thấy.
        </p>

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="block">
            <span className="mb-1 block font-medium">Dùng CV nào để kiểm tra?</span>
            <select
              value={selected}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            >
              {resumes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fileName}
                  {r.isDefault ? ' (mặc định)' : ''}
                </option>
              ))}
              <option value="profile">Chỉ dùng thông tin hồ sơ (không có file CV)</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={() => check.mutate()} loading={check.isPending} disabled={disabled || noQuota}>
              🎯 {shown ? 'Kiểm tra lại' : 'Kiểm tra ngay'}
            </Button>
            {quota && quota.limit > 0 && (
              <span className="text-xs text-slate-500">
                Còn {quota.remaining}/{quota.limit} lượt hôm nay{!quota.aiEnabled && ' · đang dùng chế độ so khớp từ khoá (chưa bật AI)'}
              </span>
            )}
          </div>
          {disabled && <p className="mt-2 text-xs text-slate-500">Tính năng đang tạm tắt.</p>}
          {check.isPending && <p className="mt-2 text-xs text-slate-500">AI đang đọc CV, thường mất 10–30 giây…</p>}
        </div>

        {check.isError && <Alert type="error">{errorMessage(check.error)}</Alert>}
        {(quotaError || lastError) && !check.isError && (
          <Alert type="error">
            {errorMessage(quotaError ?? lastError, 'Không tải được dữ liệu kiểm tra CV')}{' '}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                refetchQuota();
                refetchLast();
              }}
            >
              Thử lại
            </button>
          </Alert>
        )}
        {isLoading && !shown && <p className="text-slate-500">Đang tải…</p>}

        {shown && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4">
              <MatchRing value={shown.matchPercent} />
              <div className="min-w-0">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${VERDICT[shown.verdict].cls}`}>{VERDICT[shown.verdict].label}</span>
                <p className="mt-2">{shown.summary}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {shown.source === 'AI' ? 'Phân tích bởi AI' : 'So khớp từ khoá'} · {formatDate(shown.createdAt)}
                  {shown.cached && ' · CV và JD không đổi nên dùng lại kết quả gần nhất (không trừ lượt)'}
                </p>
              </div>
            </div>
            {!shown.cvReadable && shown.resumeId != null && (
              <Alert type="info">Không đọc được nội dung file CV (có thể là ảnh scan). Kết quả chỉ dựa trên hồ sơ – hãy dùng CV dạng PDF/DOCX có chữ.</Alert>
            )}

            {shown.improvements.length > 0 && (
              <section>
                <h3 className="mb-2 font-semibold">Bạn nên cải thiện</h3>
                <ol className="space-y-2">
                  {shown.improvements.map((im, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY[im.priority].cls}`}>{PRIORITY[im.priority].label}</span>
                        <span className="text-xs uppercase text-slate-500">{im.area}</span>
                      </div>
                      <p>{im.suggestion}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {shown.requirements.length > 0 && (
              <section>
                <h3 className="mb-2 font-semibold">Đối chiếu yêu cầu của JD</h3>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {shown.requirements.map((r, i) => {
                    const st = REQ_STATUS[r.status];
                    return (
                      <li key={i} className="flex gap-3 p-2.5">
                        <span className={`w-20 shrink-0 font-medium ${st.cls}`}>
                          {st.icon} {st.label}
                        </span>
                        <span className="min-w-0">
                          {r.requirement}
                          {r.evidence && <span className="block text-xs text-slate-500">“{r.evidence}”</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {shown.strengths.length > 0 && (
              <section>
                <h3 className="mb-2 font-semibold">Điểm mạnh nên nhấn mạnh</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {shown.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {shown.cvRewriteTips.length > 0 && (
              <section>
                <h3 className="mb-2 font-semibold">Gợi ý viết lại CV</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {shown.cvRewriteTips.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {shown.missingKeywords.length > 0 && (
              <section>
                <h3 className="mb-2 font-semibold">Từ khoá của JD chưa thấy trong CV</h3>
                <div className="flex flex-wrap gap-1.5">
                  {shown.missingKeywords.map((k) => (
                    <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                      {k}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">Chỉ thêm vào CV những kỹ năng bạn thực sự có.</p>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <Link to="/candidate/profile" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
                Cập nhật hồ sơ
              </Link>
              <Link to="/candidate/cv-builder" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
                Sửa CV online
              </Link>
              {canApply && (
                <Button
                  onClick={() => {
                    onClose();
                    onApply();
                  }}
                >
                  Ứng tuyển ngay
                </Button>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Kết quả do AI ước tính để tham khảo, không quyết định việc bạn có được tuyển hay không. Thông tin liên hệ (tên, email, SĐT, địa chỉ) không được gửi
          cho AI.
        </p>
      </div>
    </Modal>
  );
}
