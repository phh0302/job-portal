import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatBytes } from '../../lib/format';
import type { Resume } from '../../lib/types';

export default function ApplyModal({
  open,
  onClose,
  jobId,
  jobTitle,
  slug,
}: {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  slug: string;
}) {
  const qc = useQueryClient();
  const { data: resumes, isLoading } = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: async () => (await api.get<Resume[]>('/candidate/resumes')).data,
    enabled: open,
  });
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const selected = resumeId ?? resumes?.find((r) => r.isDefault)?.id ?? resumes?.[0]?.id ?? null;

  const apply = useMutation({
    mutationFn: () => api.post('/candidate/applications', { jobId, resumeId: selected, coverLetter }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', slug] });
      qc.invalidateQueries({ queryKey: ['candidate', 'applications'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (selected) apply.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Ứng tuyển: ${jobTitle}`}>
      {apply.isSuccess ? (
        <div className="space-y-4">
          <Alert type="success">Nộp hồ sơ thành công! Nhà tuyển dụng sẽ liên hệ nếu bạn phù hợp.</Alert>
          <div className="flex justify-end gap-2">
            <Link to="/candidate/applications" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              Xem việc đã ứng tuyển
            </Link>
            <Button onClick={onClose}>Đóng</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {apply.isError && <Alert type="error">{errorMessage(apply.error)}</Alert>}
          <div>
            <p className="mb-2 text-sm font-medium">Chọn CV</p>
            {isLoading ? (
              <p className="text-sm text-slate-500">Đang tải…</p>
            ) : resumes && resumes.length > 0 ? (
              <div className="space-y-2">
                {resumes.map((r) => (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${selected === r.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}
                  >
                    <input type="radio" name="resume" checked={selected === r.id} onChange={() => setResumeId(r.id)} />
                    <span className="min-w-0 flex-1 truncate">{r.fileName}</span>
                    <span className="text-xs text-slate-500">{formatBytes(r.sizeBytes)}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Alert type="info">
                Bạn chưa có CV nào.{' '}
                <Link to="/candidate/resumes" className="font-medium underline">
                  Tải CV lên
                </Link>{' '}
                rồi quay lại ứng tuyển.
              </Alert>
            )}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Thư giới thiệu (không bắt buộc)</span>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={3000}
              rows={5}
              placeholder="Giới thiệu ngắn về bản thân và lý do bạn phù hợp…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600"
            />
            <span className="text-xs text-slate-400">{coverLetter.length}/3000</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={apply.isPending} disabled={!selected}>
              Nộp hồ sơ
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
