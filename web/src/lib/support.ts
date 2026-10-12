export type SupportStatus = 'BOT' | 'WAITING' | 'OPEN' | 'CLOSED';
export type SupportSender = 'USER' | 'BOT' | 'ADMIN' | 'SYSTEM';

export interface SupportMessage {
  id: number;
  senderType: SupportSender;
  body: string;
  createdAt: string;
  faqIds: number[];
}

export interface SupportTicket {
  id: number;
  status: SupportStatus;
  subject: string;
  createdAt: string;
  lastMessageAt: string;
  escalatedAt: string | null;
  closedAt: string | null;
  unread: boolean;
}

export interface SupportConversation {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  aiEnabled: boolean;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  audience: 'ALL' | 'CANDIDATE' | 'EMPLOYER';
}

export const SUPPORT_STATUS: Record<SupportStatus, { label: string; cls: string }> = {
  BOT: { label: 'Trợ lý tự động', cls: 'bg-slate-100 text-slate-700' },
  WAITING: { label: 'Chờ nhân viên', cls: 'bg-amber-100 text-amber-800' },
  OPEN: { label: 'Đang hỗ trợ', cls: 'bg-blue-100 text-blue-800' },
  CLOSED: { label: 'Đã đóng', cls: 'bg-green-100 text-green-800' },
};

export const SUPPORT_KEY = ['support'];
