import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Field } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { PROFILE_KEY, type TimelineItem } from '../types';

export interface TimelineField {
  key: string;
  label: string;
  required?: boolean;
  maxLength?: number;
}

/** Danh sách học vấn / kinh nghiệm: thêm, sửa, xóa tại chỗ */
export default function TimelineCard<T extends TimelineItem>({
  title,
  endpoint,
  items,
  fields,
  titleOf,
  subtitleOf,
  endLabel,
}: {
  title: string;
  endpoint: string;
  items: T[];
  fields: TimelineField[];
  titleOf: (i: T) => string;
  subtitleOf: (i: T) => string;
  endLabel: string;
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {editing === null && (
          <button onClick={() => setEditing('new')} className="text-sm font-medium text-brand-600 hover:underline">
            + Thêm
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {items.length === 0 && editing !== 'new' && <p className="text-sm text-slate-500">Chưa có thông tin.</p>}
        {items.map((it) =>
          editing === it.id ? (
            <ItemForm key={it.id} endpoint={endpoint} fields={fields} item={it} endLabel={endLabel} onDone={() => setEditing(null)} />
          ) : (
            <div key={it.id} className="flex gap-3 border-l-2 border-brand-600/30 pl-3">
              <div className="flex-1">
                <p className="font-medium">{titleOf(it)}</p>
                <p className="text-sm text-slate-600">{subtitleOf(it)}</p>
                <p className="text-xs text-slate-500">
                  {it.startDate ? formatDate(it.startDate) : '?'} – {it.endDate ? formatDate(it.endDate) : endLabel}
                </p>
                {it.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{it.description}</p>}
              </div>
              {editing === null && (
                <div className="flex shrink-0 gap-3 text-sm">
                  <button onClick={() => setEditing(it.id)} className="text-brand-600 hover:underline">Sửa</button>
                  <DeleteButton endpoint={`${endpoint}/${it.id}`} />
                </div>
              )}
            </div>
          ),
        )}
        {editing === 'new' && <ItemForm endpoint={endpoint} fields={fields} endLabel={endLabel} onDone={() => setEditing(null)} />}
      </div>
    </section>
  );
}

function DeleteButton({ endpoint }: { endpoint: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.delete(endpoint),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
  return (
    <button
      disabled={del.isPending}
      onClick={() => window.confirm('Xóa mục này?') && del.mutate()}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      Xóa
    </button>
  );
}

function ItemForm({
  endpoint,
  fields,
  item,
  endLabel,
  onDone,
}: {
  endpoint: string;
  fields: TimelineField[];
  item?: TimelineItem;
  endLabel: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const init: Record<string, string> = {
    startDate: item?.startDate ?? '',
    endDate: item?.endDate ?? '',
    description: item?.description ?? '',
  };
  fields.forEach((f) => (init[f.key] = ((item as unknown as Record<string, string | null>)?.[f.key] ?? '') as string));
  const [form, setForm] = useState(init);

  const save = useMutation({
    mutationFn: () => (item ? api.patch(`${endpoint}/${item.id}`, form) : api.post(endpoint, form)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: PROFILE_KEY });
      onDone();
    },
    meta: { successMessage: 'Đã lưu' },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
      {save.isError && (
        <div className="sm:col-span-2">
          <Alert type="error">{errorMessage(save.error)}</Alert>
        </div>
      )}
      {fields.map((f) => (
        <Field key={f.key} label={f.label + (f.required ? ' *' : '')} value={form[f.key]} onChange={set(f.key)} required={f.required} maxLength={f.maxLength} />
      ))}
      <Field label="Bắt đầu" type="date" value={form.startDate} onChange={set('startDate')} />
      <Field label={`Kết thúc (để trống = ${endLabel.toLowerCase()})`} type="date" value={form.endDate} onChange={set('endDate')} />
      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">Mô tả</span>
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={2000} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={save.isPending}>Lưu</Button>
        <Button type="button" variant="outline" onClick={onDone}>Hủy</Button>
      </div>
    </form>
  );
}
