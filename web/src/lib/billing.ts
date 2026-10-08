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

export const formatVnd = (n: number) => `${n.toLocaleString('vi-VN')} đ`;
