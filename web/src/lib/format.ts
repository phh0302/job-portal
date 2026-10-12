export const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  REMOTE: 'Làm từ xa',
  INTERNSHIP: 'Thực tập',
  CONTRACT: 'Hợp đồng',
};

export const LEVEL_LABEL: Record<string, string> = {
  INTERN: 'Thực tập sinh',
  FRESHER: 'Mới đi làm',
  JUNIOR: 'Nhân viên',
  MIDDLE: 'Chuyên viên',
  SENIOR: 'Chuyên viên cao cấp',
  LEAD: 'Trưởng nhóm',
  MANAGER: 'Quản lý',
  DIRECTOR: 'Giám đốc',
};

export const APPLICATION_STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Đã nộp', cls: 'bg-slate-100 text-slate-700' },
  VIEWED: { label: 'NTD đã xem', cls: 'bg-blue-100 text-blue-700' },
  SHORTLISTED: { label: 'Phù hợp', cls: 'bg-indigo-100 text-indigo-700' },
  INTERVIEW: { label: 'Mời phỏng vấn', cls: 'bg-amber-100 text-amber-800' },
  OFFERED: { label: 'Nhận offer', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Chưa phù hợp', cls: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'Đã rút', cls: 'bg-slate-100 text-slate-500' },
};

export const COMPANY_SIZE_LABEL: Record<string, string> = {
  '1-10': '1–10 nhân viên',
  '11-50': '11–50 nhân viên',
  '51-200': '51–200 nhân viên',
  '201-500': '201–500 nhân viên',
  '501-1000': '501–1000 nhân viên',
  '1000+': 'Trên 1000 nhân viên',
};

const million = (n: number) => {
  const v = n / 1_000_000;
  return Number.isInteger(v) ? `${v}` : v.toFixed(1).replace('.', ',');
};

export function formatSalary(min: number | null, max: number | null, negotiable: boolean): string {
  if (negotiable || (min === null && max === null)) return 'Thỏa thuận';
  if (min !== null && max !== null) return `${million(min)} – ${million(max)} triệu`;
  if (min !== null) return `Từ ${million(min)} triệu`;
  return `Đến ${million(max!)} triệu`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString('vi-VN');
}

/** Số ngày còn lại tới hạn nộp (YYYY-MM-DD) */
export function daysLeft(deadline: string): number {
  const end = new Date(`${deadline}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function timeAgo(value: string | null): string {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} phút trước`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 30 * 86_400) return `${Math.floor(diff / 86_400)} ngày trước`;
  return formatDate(value);
}

/** "trong 5 giờ" / "trong 2 ngày" */
export function responseTimeText(hours: number | null): string {
  if (hours === null) return '';
  if (hours < 24) return `trong ${Math.max(1, hours)} giờ`;
  return `trong ${Math.round(hours / 24)} ngày`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
