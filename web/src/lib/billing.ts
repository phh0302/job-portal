export interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  featuredCredits: number;
  contactCredits: number;
  isActive: boolean;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Order {
  id: number;
  code: string;
  planName: string;
  amount: number;
  durationDays: number;
  featuredCredits: number;
  contactCredits: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  cancelReason: string | null;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Đã thanh toán', cls: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã huỷ', cls: 'bg-slate-200 text-slate-600' },
};

/**
 * Ảnh mã QR chuyển khoản chuẩn VietQR (quét được bằng app của hầu hết ngân hàng VN).
 * Dùng dịch vụ tạo ảnh công khai img.vietqr.io – điền sẵn số tiền và nội dung = mã đơn.
 */
export function vietQrUrl(bank: { bankCode: string; accountNo: string; accountName: string }, amount: number, content: string) {
  if (!bank.bankCode.trim() || !bank.accountNo.trim()) return null;
  const params = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: content, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankCode.trim())}-${encodeURIComponent(bank.accountNo.trim())}-compact2.png?${params}`;
}

export const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;
