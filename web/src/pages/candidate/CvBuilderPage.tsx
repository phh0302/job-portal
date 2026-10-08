import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { toast } from '../../components/Toast';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { CV_COLORS, CV_TEMPLATES, createCvPdf, imageToDataUrl, type CvSettings } from '../../lib/cvPdf';
import { PROFILE_KEY, type CandidateProfile } from './types';

const SETTINGS_KEY = ['candidate', 'cv-settings'];
const area = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600';

function fileName(name: string) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `CV-${slug || 'ung-vien'}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

/** Danh sách những gì còn thiếu để CV đầy đủ */
function missing(p: CandidateProfile) {
  return [
    !p.headline && 'tiêu đề nghề nghiệp',
    !p.summary && 'phần giới thiệu',
    !p.phone && 'số điện thoại',
    !p.experiences.length && 'kinh nghiệm làm việc',
    !p.educations.length && 'học vấn',
    !p.skills.length && 'kỹ năng',
  ].filter(Boolean) as string[];
}

function Editor({ profile, initial }: { profile: CandidateProfile; initial: CvSettings }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [s, setS] = useState<CvSettings>(initial);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [renderError, setRenderError] = useState('');
  const [rendering, setRendering] = useState(false);
  const urlRef = useRef<string | null>(null);
  const set = <K extends keyof CvSettings>(k: K, v: CvSettings[K]) => setS((o) => ({ ...o, [k]: v }));

  const { data: photo } = useQuery({
    queryKey: ['cv-photo', profile.avatarUrl],
    queryFn: () => imageToDataUrl(profile.avatarUrl),
    staleTime: Infinity,
  });

  // Vẽ lại bản xem trước sau 500ms kể từ lần chỉnh cuối
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setRendering(true);
      try {
        const b = await createCvPdf({ profile, email: user?.email ?? '', settings: s, photo: photo ?? null });
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(b);
        setBlob(b);
        setPdfUrl(urlRef.current);
        setRenderError('');
      } catch (err) {
        if (!cancelled) setRenderError(`Không tạo được PDF: ${(err as Error).message}. Hãy chắc chắn đã cài thư viện (npm install trong thư mục web).`);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [profile, s, photo, user?.email]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const saveSettings = useMutation({
    mutationFn: async () => (await api.put<CvSettings>('/candidate/cv-settings', s)).data,
    onSuccess: (d) => qc.setQueryData(SETTINGS_KEY, d),
    meta: { successMessage: 'Đã lưu tuỳ chọn CV' },
  });

  const saveAsResume = useMutation({
    mutationFn: async () => {
      if (!blob) throw new Error('CV chưa được tạo xong');
      const fd = new FormData();
      fd.append('file', new File([blob], fileName(profile.fullName), { type: 'application/pdf' }));
      await api.post('/candidate/resumes', fd);
      await api.put('/candidate/cv-settings', s);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
      toast('Đã lưu CV vào "CV của tôi" – bạn có thể dùng CV này để ứng tuyển');
    },
  });

  const download = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName(profile.fullName);
    a.click();
  };

  const lacks = useMemo(() => missing(profile), [profile]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        {lacks.length > 0 && (
          <Alert type="info">
            CV sẽ đầy đủ hơn nếu bạn bổ sung: {lacks.join(', ')}.{' '}
            <Link to="/candidate/profile" className="font-medium underline">Cập nhật hồ sơ</Link>
          </Alert>
        )}
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Mẫu CV</h2>
          <div className="grid grid-cols-3 gap-2">
            {CV_TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('template', t.value)}
                aria-pressed={s.template === t.value}
                title={t.hint}
                className={`rounded-lg border px-2 py-2 text-sm ${s.template === t.value ? 'border-brand-600 bg-brand-50 font-medium text-brand-600' : 'border-slate-300 hover:bg-slate-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Màu chủ đạo</p>
            <div className="flex flex-wrap gap-2">
              {CV_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('accent', c)}
                  aria-label={`Màu ${c}`}
                  aria-pressed={s.accent === c}
                  className={`h-8 w-8 rounded-full ring-offset-2 ${s.accent === c ? 'ring-2 ring-slate-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.showPhoto} onChange={(e) => set('showPhoto', e.target.checked)} />
            Hiện ảnh đại diện {!profile.avatarUrl && <span className="text-xs text-slate-400">(chưa có ảnh)</span>}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.showBirthDate} onChange={(e) => set('showBirthDate', e.target.checked)} />
            Hiện ngày sinh
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Mục bổ sung</h2>
          <p className="text-xs text-slate-500">Mỗi dòng là một mục. Các phần khác lấy từ "Hồ sơ của tôi".</p>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Chứng chỉ</span>
            <textarea rows={3} maxLength={1000} value={s.certificates} onChange={(e) => set('certificates', e.target.value)} className={area} placeholder="AWS Certified Developer (2025)" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Ngoại ngữ</span>
            <textarea rows={2} maxLength={500} value={s.languages} onChange={(e) => set('languages', e.target.value)} className={area} placeholder="Tiếng Anh – IELTS 7.0" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Sở thích</span>
            <textarea rows={2} maxLength={500} value={s.interests} onChange={(e) => set('interests', e.target.value)} className={area} />
          </label>
        </section>

        {(saveSettings.isError || saveAsResume.isError) && <Alert type="error">{errorMessage(saveSettings.error ?? saveAsResume.error)}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveAsResume.mutate()} loading={saveAsResume.isPending} disabled={!blob}>Lưu vào CV của tôi</Button>
          <Button variant="outline" onClick={download} disabled={!pdfUrl}>Tải PDF</Button>
          <button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="text-sm text-brand-600 hover:underline">
            Lưu tuỳ chọn
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-100 p-2">
        {renderError ? (
          <Alert type="error">{renderError}</Alert>
        ) : pdfUrl ? (
          <iframe title="Xem trước CV" src={`${pdfUrl}#toolbar=0&navpanes=0`} className="h-[80vh] w-full rounded-lg bg-white" />
        ) : (
          <p className="p-10 text-center text-sm text-slate-500">Đang tạo bản xem trước…</p>
        )}
        {rendering && pdfUrl && <p className="mt-1 text-center text-xs text-slate-500">Đang cập nhật…</p>}
      </section>
    </div>
  );
}

export default function CvBuilderPage() {
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: async () => (await api.get<CandidateProfile>('/candidate/profile')).data });
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: async () => (await api.get<CvSettings>('/candidate/cv-settings')).data });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tạo CV online</h1>
        <p className="text-sm text-slate-500">CV được tạo tự động từ hồ sơ của bạn. Chọn mẫu, màu rồi tải PDF hoặc lưu để dùng khi ứng tuyển.</p>
      </div>
      {profile.isError || settings.isError ? (
        <Alert type="error">{errorMessage(profile.error ?? settings.error)}</Alert>
      ) : profile.data && settings.data ? (
        <Editor profile={profile.data} initial={settings.data} />
      ) : (
        <p className="text-slate-500">Đang tải…</p>
      )}
    </div>
  );
}
