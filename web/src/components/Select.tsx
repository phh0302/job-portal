import type { Ref, SelectHTMLAttributes } from 'react';

export default function Select({
  label,
  options,
  placeholder,
  error,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
}) {
  const el = (
    <select
      {...props}
      aria-invalid={!!error}
      className={`w-full rounded-lg border ${error ? 'border-red-400' : 'border-slate-300'} bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 ${props.className ?? ''}`}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return el;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {el}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
