import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Select from '../../components/Select';
import { Alert, Button, Field } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useCategories, useLocations } from '../../lib/catalog';
import { formatDate } from '../../lib/format';
import { ListSkeleton } from '../../components/Skeleton';

interface JobAlert {
  id: number;
  keyword: string | null;
  locationId: number | null;
  location: string | null;
  categoryId: number | null;
  category: string | null;
  frequency: 'DAILY' | 'WEEKLY';
  isActive: boolean;
  lastSentAt: string | null;
  label: string;
}

const KEY = ['candidate', 'job-alerts'];
const FREQ = [
  { value: 'DAILY', label: 'Hằng ngày' },
  { value: 'WEEKLY', label: 'Hằng tuần' },
];

function AlertForm({ initial, onDone }: { initial?: JobAlert; onDone: () => void }) {
  const qc = useQueryClient();
  const { data: locations } = useLocations();
  const { data: categories } = useCategories();
  const [form, setForm] = useState({
    keyword: initial?.keyword ?? '',
    locationId: initial?.locationId ? String(initial.locationId) : '',
    categoryId: initial?.categoryId ? String(initial.categoryId) : '',
    frequency: initial?.frequency ?? 'DAILY',
  });
  const save = useMutation({
    mutationFn: () => (initial ? api.patch(`/candidate/job-alerts/${initial.id}`, form) : api.post('/candidate/job-alerts', form)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: KEY });
      onDone();
    },
    meta: { successMessage: initial ? 'Đã lưu thông báo việc làm' : 'Đã tạo thông báo việc làm' },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      {save.isError && <div className="sm:col-span-2"><Alert type="error">{errorMessage(save.error)}</Alert></div>}
      <Field label="Từ khóa" value={form.keyword} onChange={set('keyword')} placeholder="VD: ReactJS, kế toán…" maxLength={200} />
      <Select label="Ngành nghề" value={form.categoryId} onChange={set('categoryId')} placeholder="Tất cả" options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))} />
      <Select label="Địa điểm" value={form.locationId} onChange={set('locationId')} placeholder="Tất cả" options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
      <Select label="Tần suất gửi email" value={form.frequency} onChange={set('frequency')} options={FREQ} />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>{initial ? 'Lưu' : 'Tạo thông báo'}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Hủy</Button>
      </div>
    </form>
  );
}

export default function JobAlertsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const { data: alerts, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<JobAlert[]>('/candidate/job-alerts')).data });

  const toggle = useMutation({
    mutationFn: (a: JobAlert) => api.patch(`/candidate/job-alerts/${a.id}`, { isActive: !a.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/candidate/job-alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    meta: { successMessage: 'Đã xóa thông báo việc làm' },
  });
  const test = useMutation({
    mutationFn: async (id: number) => (await api.post<{ count: number; message: string }>(`/candidate/job-alerts/${id}/send-test`)).data,
    onSuccess: (d) => setNotice({ type: d.count ? 'success' : 'info', text: d.message }),
    onError: (e) => setNotice({ type: 'error', text: errorMessage(e) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Thông báo việc làm</h1>
          <p className="text-sm text-slate-500">Nhận email khi có việc làm mới phù hợp (tối đa 5 thông báo).</p>
        </div>
        {editing === null && (alerts?.length ?? 0) < 5 && <Button onClick={() => setEditing('new')}>+ Tạo thông báo</Button>}
      </div>
      {notice && <Alert type={notice.type}>{notice.text}</Alert>}
      {editing === 'new' && <AlertForm onDone={() => setEditing(null)} />}

      {isLoading ? (
        <ListSkeleton />
      ) : alerts && alerts.length ? (
        <div className="space-y-3">
          {alerts.map((a) =>
            editing === a.id ? (
              <AlertForm key={a.id} initial={a} onDone={() => setEditing(null)} />
            ) : (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-slate-500">
                    {FREQ.find((f) => f.value === a.frequency)?.label}
                    {a.lastSentAt && ` · lần kiểm tra gần nhất ${formatDate(a.lastSentAt)}`}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={a.isActive} onChange={() => toggle.mutate(a)} />
                  {a.isActive ? 'Đang bật' : 'Đã tắt'}
                </label>
                <div className="flex gap-3 text-sm">
                  <button disabled={test.isPending} onClick={() => test.mutate(a.id)} className="text-brand-600 hover:underline">Gửi thử</button>
                  <button onClick={() => setEditing(a.id)} className="text-brand-600 hover:underline">Sửa</button>
                  <button onClick={() => window.confirm('Xóa thông báo này?') && remove.mutate(a.id)} className="text-red-600 hover:underline">Xóa</button>
                </div>
              </div>
            ),
          )}
        </div>
      ) : (
        editing === null && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Chưa có thông báo việc làm nào.
          </div>
        )
      )}
    </div>
  );
}
