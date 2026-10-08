/** Khối xám nhấp nháy giữ chỗ khi đang tải */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

export function JobCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Danh sách giữ chỗ */
export function ListSkeleton({ rows = 4, grid = false }: { rows?: number; grid?: boolean }) {
  return (
    <div className={grid ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'} aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6" aria-busy="true" aria-label="Đang tải">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
