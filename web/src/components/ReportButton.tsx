import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api, errorMessage } from '../lib/api';
import Modal from './Modal';
import { Alert, Button } from './ui';

export default function ReportButton({ targetType, targetId, label }: { targetType: 'JOB' | 'COMPANY'; targetId: number; label: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const { data: reasons } = useQuery({
    queryKey: ['report-reasons'],
    queryFn: async () => (await api.get<string[]>('/reports/reasons')).data,
    enabled: open,
    staleTime: Infinity,
  });
  const send = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>('/reports', { targetType, targetId, reason, details })).data,
  });

  function onOpen() {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    send.reset();
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send.mutate();
  }

  return (
    <>
      <button onClick={onOpen} className="text-sm text-slate-500 hover:text-red-600">
        ⚑ Báo cáo {targetType === 'JOB' ? 'tin này' : 'công ty'}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Báo cáo: ${label}`}>
        {send.isSuccess ? (
          <div className="space-y-4">
            <Alert type="success">{send.data.message}</Alert>
            <div className="text-right">
              <Button onClick={() => setOpen(false)}>Đóng</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {send.isError && <Alert type="error">{errorMessage(send.error)}</Alert>}
            {(reasons ?? []).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Mô tả thêm (không bắt buộc)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button type="submit" loading={send.isPending} disabled={!reason}>Gửi báo cáo</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
