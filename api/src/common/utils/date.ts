/** Ngày hôm nay dạng YYYY-MM-DD theo giờ Việt Nam (UTC+7) */
export function todayVN(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
