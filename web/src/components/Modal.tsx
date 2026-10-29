import { useEffect, type ReactNode } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="text-2xl leading-none text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
