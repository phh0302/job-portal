import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { APPLICATION_STATUS, formatDate } from '../../lib/format';
import { getSignedUrl, openSignedFile } from '../../lib/files';
import CandidateProfileView from './CandidateProfileView';
import AiScreeningCard from './AiScreeningCard';
import type { CandidateView } from './types';

interface Detail {
  id: number;
  status: string;
  createdAt: string;
  statusChangedAt: string | null;
  coverLetter: string | null;
  employerNote: string | null;
  resumeFileName: string;
  resumeIsPdf: boolean;
  nextStatuses: string[];
  job: { id: number; title: string; slug: string };
  candidate: CandidateView;
}

const ACTION_LABEL: Record<string, string> = {
  VIEWED: 'Đánh dấu đã xem',
  SHORTLISTED: 'Phù hợp',
  INTERVIEW: 'Mời phỏng vấn',
  OFFERED: 'Gửi offer',
  REJECTED: 'Từ chối',
};


function StatusModal({ app, status, onClose }: { app: Detail; status: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const mut = useMutation({
    mutationFn: async () =>
      (
        await api.patch<Detail>(`/employer/applications/${app.id}/status`, {
          status,
          message: message || null,
          sendEmail,
          ...(status === 'INTERVIEW' && { interview: { time, location } }),
        })
      ).data,
    onSuccess: (d) => {
      qc.setQueryData(['employer', 'application', String(app.id)], d);
      qc.invalidateQueries({ queryKey: ['employer', 'applications'] });
      onClose();
    },
    meta: { successMessage: 'Đã cập nhật trạng thái và thông báo ứng viên' },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mut.mutate();
  }

  return (
    <Modal open onClose={onClose} title={`${ACTION_LABEL[status]} – ${app.candidate.fullName}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        {mut.isError && <Alert type="error">{errorMessage(mut.error)}</Alert>}
        {status === 'INTERVIEW' && (
          <>
            <Field label="Thời gian phỏng vấn *" required value={time} onChange={(e) => setTime(e.target.value)} placeholder="VD: 9:00 thứ Hai, 20/10/2026" maxLength={200} />
            <Field label="Địa điểm / hình thức *" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Tầng 8, 123 Láng Hạ hoặc link Google Meet" maxLength={300} />
          </>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Lời nhắn thêm trong email (không bắt buộc)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={3000} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Gửi email {status === 'INTERVIEW' ? 'mời phỏng vấn' : status === 'REJECTED' ? 'thông báo kết quả (mẫu thư từ chối lịch sự)' : 'thông báo'} cho ứng viên
        </label>
        <p className="text-xs text-slate-500">Ứng viên luôn nhận thông báo trong web.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={mut.isPending} className={status === 'REJECTED' ? '!bg-red-600 hover:!bg-red-700' : ''}>
            Xác nhận
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NoteCard({ app }: { app: Detail }) {
  const [note, setNote] = useState(app.employerNote ?? '');
  const mut = useMutation({ mutationFn: () => api.patch(`/employer/applications/${app.id}/note`, { employerNote: note || null }) });
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Ghi chú nội bộ</h3>
      <p className="text-xs text-slate-500">Chỉ nhà tuyển dụng thấy</p>
      <textarea value={note} onChange={(e) => { setNote(e.target.value); mut.reset(); }} rows={4} maxLength={5000} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600" />
      <div className="mt-2 flex items-center gap-3">
        <Button onClick={() => mut.mutate()} loading={mut.isPending} className="!py-1.5 text-sm">Lưu ghi chú</Button>
        {mut.isSuccess && <span className="text-sm text-green-600">Đã lưu</span>}
        {mut.isError && <span className="text-sm text-red-600">{errorMessage(mut.error)}</span>}
      </div>
    </section>
  );
}

export default function ApplicationDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [action, setAction] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { data: app, isLoading, error } = useQuery({
    queryKey: ['employer', 'application', id],
    queryFn: async () => (await api.get<Detail>(`/employer/applications/${id}`)).data,
  });

  // Mở đơn mới sẽ tự chuyển "Đã xem" -> làm mới danh sách
  useEffect(() => {
    if (app) qc.invalidateQueries({ queryKey: ['employer', 'applications'] });
  }, [app?.id, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Link có chữ ký (5 phút) -> nhúng thẳng PDF vào iframe, không cần tải cả file về bộ nhớ
  const view = useMutation({
    mutationFn: () => getSignedUrl(`/employer/applications/${id}/resume-link`),
    onSuccess: (url) => setPdfUrl(url),
  });
  const download = useMutation({ mutationFn: () => openSignedFile(`/employer/applications/${id}/resume-link`, 'download') });

  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (error || !app) return <Alert type="error">{errorMessage(error, 'Không tìm thấy đơn ứng tuyển')}</Alert>;
  const st = APPLICATION_STATUS[app.status];

  return (
    <div className="space-y-4">
      <Link to="/employer/applications" className="text-sm text-brand-600 hover:underline">← Danh sách ứng viên</Link>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <CandidateProfileView c={app.candidate} />
          {app.coverLetter && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 font-semibold">Thư giới thiệu</h3>
              <p className="whitespace-pre-line text-sm text-slate-700">{app.coverLetter}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <AiScreeningCard applicationId={app.id} withdrawn={app.status === 'WITHDRAWN'} />
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Ứng tuyển vị trí</p>
            <Link to={`/employer/jobs/${app.job.id}/edit`} className="font-semibold hover:text-brand-600">{app.job.title}</Link>
            <p className="mt-1 text-xs text-slate-500">Ngày nộp {formatDate(app.createdAt)}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm">Trạng thái:</span>
              <span className={`rounded px-2 py-1 text-xs font-medium ${st?.cls}`}>{st?.label}</span>
            </div>
            {app.nextStatuses.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {app.nextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAction(s)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${s === 'REJECTED' ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                  >
                    {app.status === 'INTERVIEW' && s === 'INTERVIEW' ? 'Đổi lịch phỏng vấn' : ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{app.status === 'WITHDRAWN' ? 'Ứng viên đã rút đơn.' : 'Không còn thao tác.'}</p>
            )}
            <Link
              to={`/employer/messages/${app.id}`}
              className="mt-3 block rounded-lg border border-brand-600 px-3 py-1.5 text-center text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              💬 Nhắn tin với ứng viên
            </Link>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">CV</h3>
            <p className="truncate text-sm text-slate-600" title={app.resumeFileName}>{app.resumeFileName}</p>
            <div className="mt-2 flex gap-3 text-sm">
              {app.resumeIsPdf && <button onClick={() => view.mutate()} className="text-brand-600 hover:underline">{view.isPending ? 'Đang mở…' : 'Xem CV'}</button>}
              <button onClick={() => download.mutate()} className="text-brand-600 hover:underline">{download.isPending ? 'Đang tải…' : 'Tải về'}</button>
            </div>
            {(view.isError || download.isError) && <p className="mt-1 text-sm text-red-600">{errorMessage(view.error ?? download.error)}</p>}
          </section>

          <NoteCard key={app.id} app={app} />
        </aside>
      </div>

      {action && <StatusModal app={app} status={action} onClose={() => setAction(null)} />}

      {pdfUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-2 sm:p-6" onClick={() => setPdfUrl(null)}>
          <div className="mx-auto flex w-full max-w-5xl justify-end gap-2">
            <a href={pdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-t-lg bg-white px-4 py-1 text-sm">Mở tab mới ↗</a>
            <button onClick={() => setPdfUrl(null)} className="rounded-t-lg bg-white px-4 py-1 text-sm">Đóng ×</button>
          </div>
          <iframe src={pdfUrl} title="CV" className="mx-auto h-full w-full max-w-5xl rounded-b-lg rounded-tl-lg bg-white" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
