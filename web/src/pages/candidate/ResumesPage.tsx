import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/format';
import { openSignedFile } from '../../lib/files';
import { usePublicSettings } from '../../lib/settings';
import type { Resume } from '../../lib/types';
import { ListSkeleton } from '../../components/Skeleton';

const KEY = ['candidate', 'resumes'];

const fileEndpoint = (r: Resume) => `/candidate/resumes/${r.id}/link`;

export default function ResumesPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: settings } = usePublicSettings();
  const MAX = settings?.maxResumes ?? 5;
  const { data: resumes, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<Resume[]>('/candidate/resumes')).data });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/candidate/resumes', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    meta: { successMessage: 'Đã tải CV lên' },
  });
  const setDefault = useMutation({
    mutationFn: async (id: number) => (await api.patch<Resume[]>(`/candidate/resumes/${id}/default`)).data,
    onSuccess: (data) => qc.setQueryData(KEY, data),
    meta: { successMessage: 'Đã đặt CV mặc định' },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/candidate/resumes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    meta: { successMessage: 'Đã xóa CV' },
  });

  const err = upload.error ?? setDefault.error ?? remove.error;
  const full = (resumes?.length ?? 0) >= MAX;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CV của tôi</h1>
          <p className="text-sm text-slate-500">PDF, DOC, DOCX · tối đa {settings?.maxResumeMb ?? 5}MB · lưu tối đa {MAX} CV</p>
          <p className="text-sm text-slate-500">
            Chưa có CV?{' '}
            <Link to="/candidate/cv-builder" className="text-brand-600 hover:underline">Tạo CV online từ hồ sơ</Link>
          </p>
        </div>
        <Button onClick={() => fileRef.current?.click()} loading={upload.isPending} disabled={full}>
          + Tải CV lên
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = '';
          }}
        />
      </div>

      {err && <Alert type="error">{errorMessage(err)}</Alert>}
      {full && <Alert type="info">Bạn đã đạt tối đa {MAX} CV. Xóa bớt để tải CV mới.</Alert>}

      {isLoading ? (
        <ListSkeleton />
      ) : resumes && resumes.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {resumes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold uppercase text-red-600">{r.fileName.split('.').pop()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.fileName}
                  {r.isDefault && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Mặc định</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(r.sizeBytes)} · tải lên {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                {r.fileName.toLowerCase().endsWith('.pdf') && (
                  <button onClick={() => openSignedFile(fileEndpoint(r), 'view').catch(() => undefined)} className="text-brand-600 hover:underline">Xem</button>
                )}
                <button onClick={() => openSignedFile(fileEndpoint(r), 'download').catch(() => undefined)} className="text-brand-600 hover:underline">Tải về</button>
                {!r.isDefault && (
                  <button onClick={() => setDefault.mutate(r.id)} className="text-brand-600 hover:underline">Đặt mặc định</button>
                )}
                <button
                  onClick={() => window.confirm(`Xóa CV "${r.fileName}"?`) && remove.mutate(r.id)}
                  className="text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Bạn chưa có CV nào. Tải CV lên để bắt đầu ứng tuyển.
        </div>
      )}
    </div>
  );
}
