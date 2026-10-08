export type ReviewRelation = 'CURRENT_EMPLOYEE' | 'FORMER_EMPLOYEE' | 'INTERVIEWED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const RELATION_LABEL: Record<ReviewRelation, string> = {
  CURRENT_EMPLOYEE: 'Nhân viên hiện tại',
  FORMER_EMPLOYEE: 'Nhân viên cũ',
  INTERVIEWED: 'Ứng viên đã phỏng vấn',
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Đã đăng', cls: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
};

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: number[];
}

export interface PublicReview {
  id: number;
  rating: number;
  title: string;
  pros: string;
  cons: string;
  relation: ReviewRelation;
  author: string | null;
  createdAt: string;
  employerReply: string | null;
  repliedAt: string | null;
}

export interface MyReview extends PublicReview {
  status: ReviewStatus;
  rejectReason: string | null;
  isAnonymous: boolean;
  company?: { id: number; name: string; slug: string; logoUrl: string | null };
}
