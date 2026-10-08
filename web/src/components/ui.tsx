import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref } from 'react';

export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; ref?: Ref<HTMLInputElement> }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        {...props}
        aria-invalid={!!error}
        className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Button({
  loading,
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'outline' }) {
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-brand-600 text-brand-600 hover:bg-brand-50';
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`rounded-lg px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${props.className ?? ''}`}
    >
      {loading ? 'Đang xử lý…' : children}
    </button>
  );
}

export function Alert({ type, children }: { type: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }[type];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Kiểm tra mật khẩu giống quy tắc của API */
export const isStrongPassword = (p: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(p);
export const PASSWORD_HINT = 'Mật khẩu 8–64 ký tự, gồm cả chữ và số';
