export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  const btn = 'min-w-9 rounded-lg border px-3 py-1.5 text-sm';
  return (
    <nav aria-label="Phân trang" className="mt-6 flex flex-wrap items-center justify-center gap-1">
      <button className={`${btn} border-slate-300 disabled:opacity-40`} aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-label={`Trang ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={`${btn} ${p === page ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        ),
      )}
      <button className={`${btn} border-slate-300 disabled:opacity-40`} aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </nav>
  );
}
