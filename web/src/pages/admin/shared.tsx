import { useState, type ReactNode } from 'react';
import Modal from '../../components/Modal';
import { Alert, Button } from '../../components/ui';
import { errorMessage } from '../../lib/api';

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.value || 'all'}
          onClick={() => onChange(t.value)}
          className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${value === t.value ? 'border-brand-600 font-medium text-brand-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
        >
          {t.label}
          {t.count !== undefined && ` (${t.count})`}
        </button>
      ))}
    </div>
  );
}

/** Hộp thoại nhập lý do (từ chối / khóa / gỡ tin…) */
export function ReasonModal({
  open,
  title,
  label,
  confirmText,
  danger,
  pending,
  error,
  onClose,
  onConfirm,
  extra,
  presets = [],
}: {
  open: boolean;
  title: string;
  label: string;
  confirmText: string;
  danger?: boolean;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  extra?: ReactNode;
  presets?: string[];
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason.trim());
        }}
        className="space-y-3"
      >
        {!!error && <Alert type="error">{errorMessage(error)}</Alert>}
        {extra}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p} type="button" onClick={() => setReason(p)} className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs hover:border-brand-600">
                {p}
              </button>
            ))}
          </div>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">{label}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={3} maxLength={500} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={pending} disabled={!reason.trim()} className={danger ? '!bg-red-600 hover:!bg-red-700' : ''}>{confirmText}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{children}</div>;
}
