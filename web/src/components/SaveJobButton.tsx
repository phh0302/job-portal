import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useSavedJobIds, useToggleSaveJob } from '../lib/engagement';
import { toast } from './Toast';

export default function SaveJobButton({ jobId, withLabel = false }: { jobId: number; withLabel?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: ids } = useSavedJobIds();
  const toggle = useToggleSaveJob();

  if (user && user.role !== 'CANDIDATE') return null;
  const saved = ids?.has(jobId) ?? false;

  function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    toggle.mutate(
      { jobId, save: !saved },
      {
        onSuccess: () => toast(saved ? 'Đã bỏ lưu việc làm' : 'Đã lưu việc làm'),
        onError: () => toast('Không lưu được, vui lòng thử lại', 'error'),
      },
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      title={saved ? 'Bỏ lưu' : 'Lưu việc làm'}
      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-sm transition ${
        saved ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500'
      }`}
    >
      <span aria-hidden>{saved ? '♥' : '♡'}</span>
      {withLabel && <span>{saved ? 'Đã lưu' : 'Lưu'}</span>}
    </button>
  );
}
