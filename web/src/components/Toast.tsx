import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

const ToastCtx = createContext<(text: string, type?: ToastType) => void>(() => undefined);

/** Bắn toast từ ngoài React (vd. MutationCache) */
let externalPush: ((text: string, type?: ToastType) => void) | null = null;
export function toast(text: string, type: ToastType = 'success') {
  externalPush?.(text, type);
}

export function useToast() {
  return useContext(ToastCtx);
}

const STYLE: Record<ToastType, string> = {
  success: 'border-green-200 bg-white text-green-800',
  error: 'border-red-200 bg-white text-red-700',
  info: 'border-blue-200 bg-white text-blue-800',
};
const ICON: Record<ToastType, string> = { success: '✓', error: '!', info: 'i' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (text: string, type: ToastType = 'success') => {
      const id = Date.now() + Math.random();
      setItems((l) => [...l.slice(-3), { id, type, text }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove],
  );
  useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${STYLE[t.type]}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{ICON[t.type]}</span>
            <span className="flex-1">{t.text}</span>
            <button onClick={() => remove(t.id)} aria-label="Đóng" className="text-slate-400 hover:text-slate-600">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
