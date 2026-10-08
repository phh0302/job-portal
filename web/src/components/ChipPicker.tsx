import { useMemo, useState } from 'react';
import type { Option } from '../lib/types';

/** Chọn nhiều mục dạng chip + ô lọc */
export default function ChipPicker({
  label,
  options,
  value,
  onChange,
  max,
}: {
  label: string;
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  max: number;
}) {
  const [filter, setFilter] = useState('');
  const selected = options.filter((o) => value.includes(o.id));
  const rest = useMemo(() => {
    const kw = filter.trim().toLowerCase();
    return options.filter((o) => !value.includes(o.id) && (!kw || o.name.toLowerCase().includes(kw))).slice(0, 15);
  }, [options, value, filter]);

  return (
    <div className="text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {label} <span className="font-normal text-slate-400">({value.length}/{max})</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {selected.map((o) => (
          <span key={o.id} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-brand-700">
            {o.name}
            <button type="button" aria-label={`Bỏ ${o.name}`} onClick={() => onChange(value.filter((v) => v !== o.id))} className="hover:text-red-600">×</button>
          </span>
        ))}
      </div>
      {value.length < max && (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Gõ để lọc…"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:border-brand-600"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rest.map((o) => (
              <button key={o.id} type="button" onClick={() => onChange([...value, o.id])} className="rounded-full border border-slate-300 px-2.5 py-0.5 hover:border-brand-600 hover:text-brand-600">
                + {o.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
