/** Hiển thị số sao (chỉ đọc). Có nhãn chữ cho trình đọc màn hình. */
export function Stars({ value, size = 'text-base' }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} leading-none text-amber-500`} role="img" aria-label={`${value} trên 5 sao`}>
      {'★★★★★'.slice(0, full)}
      <span className="text-slate-300">{'★★★★★'.slice(full)}</span>
    </span>
  );
}

/** Chọn số sao (1–5) */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt'];
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Số sao">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao – ${labels[n - 1]}`}
          onClick={() => onChange(n)}
          className={`text-3xl leading-none ${n <= value ? 'text-amber-500' : 'text-slate-300'} hover:scale-110`}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="text-sm text-slate-600">{labels[value - 1]}</span>}
    </div>
  );
}
