/** Ngày hôm nay dạng YYYY-MM-DD theo giờ Việt Nam (UTC+7) */
export function todayVN(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Biểu thức SQL đổi một cột datetime (lưu theo GIỜ MÁY CHỦ, xem typeorm.config useUTC=false)
 * sang giờ Việt Nam – đúng cả khi máy chủ chạy giờ VN (Windows) hay UTC (Docker / Azure).
 */
export function sqlToVN(column: string): string {
  return `DATEADD(minute, 420 - DATEDIFF(minute, GETUTCDATE(), GETDATE()), ${column})`;
}
