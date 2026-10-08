export const JOB_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-slate-100 text-slate-600' },
  PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Đang hiển thị', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Đã đóng', cls: 'bg-slate-200 text-slate-600' },
  EXPIRED: { label: 'Hết hạn', cls: 'bg-orange-100 text-orange-700' },
};

export const VERIFY_STATUS: Record<string, { label: string; cls: string }> = {
  UNVERIFIED: { label: 'Chưa xác minh', cls: 'bg-slate-100 text-slate-600' },
  PENDING: { label: 'Đang chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
  VERIFIED: { label: 'Đã xác minh', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const s = map[value] ?? { label: value, cls: 'bg-slate-100' };
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
