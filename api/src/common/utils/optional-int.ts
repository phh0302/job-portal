/**
 * @Transform cho trường số nguyên tuỳ chọn gửi từ form (thường là chuỗi).
 * Đọc giá trị gốc (obj[key]) chứ không dùng `value`, vì @Type(() => Number) đổi '' thành 0
 * (0 lọt qua validate rồi vỡ khoá ngoại → 500).
 * - '' / chuỗi trắng / null → null
 * - chuỗi số nguyên → number
 * - giá trị khác giữ nguyên để @IsInt báo lỗi 400
 */
export const toOptionalInt = ({ obj, key }: { obj: Record<string, unknown>; key: string }): unknown => {
  const v = obj[key];
  if (v === undefined || v === null) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return null;
    return /^-?\d+$/.test(t) ? Number(t) : t;
  }
  return v;
};
