/** Quy ước "phản hồi ứng viên" – dùng chung cho API và runner */

/** Trạng thái được coi là NTD đã phản hồi (VIEWED chỉ là đã xem, chưa tính) */
export const RESPONSE_STATUSES = ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED'] as const;

/** Số hồ sơ tối thiểu để hiện chỉ số công khai */
export const MIN_RESPONSE_SAMPLE = 5;

/** Hồ sơ chờ quá số ngày này mà chưa phản hồi → nhắc NTD */
export const RESPONSE_REMIND_DAYS = 3;

export interface ResponseInfo {
  /** % hồ sơ được phản hồi */
  rate: number;
  /** Thời gian phản hồi trung bình (giờ) */
  avgHours: number | null;
  /** Đạt chuẩn "Phản hồi nhanh": ≥ 80% hồ sơ, trung bình ≤ 3 ngày */
  fast: boolean;
}

export function responseInfo(c: { responseRate: number | null; avgResponseHours: number | null; responseSample: number }): ResponseInfo | null {
  if (c.responseRate === null || c.responseSample < MIN_RESPONSE_SAMPLE) return null;
  return {
    rate: c.responseRate,
    avgHours: c.avgResponseHours,
    fast: c.responseRate >= 80 && c.avgResponseHours !== null && c.avgResponseHours <= 72,
  };
}
