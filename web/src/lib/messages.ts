import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export type ChatSide = 'employer' | 'candidate';

export interface ChatMessage {
  id: number;
  body: string;
  createdAt: string;
  senderRole: 'EMPLOYER' | 'CANDIDATE';
  senderUserId: number;
  senderName: string;
  mine: boolean;
}

export interface Conversation {
  applicationId: number;
  status: string;
  lastMessageAt: string;
  unread: boolean;
  lastMessage: { body: string; senderRole: 'EMPLOYER' | 'CANDIDATE'; createdAt: string } | null;
  job: { id: number; title: string; slug: string };
  company: { name: string; logoUrl: string | null };
  candidate: { fullName: string; avatarUrl: string | null };
}

export interface ChatThread {
  application: Omit<Conversation, 'applicationId' | 'lastMessageAt' | 'unread' | 'lastMessage'> & { id: number };
  canSend: boolean;
  hint: string | null;
  hasMore: boolean;
  messages: ChatMessage[];
}

export const MESSAGE_MAX = 2000;

/** Mọi truy vấn chat bắt đầu bằng key này → realtime chỉ cần invalidate ['messages'] */
export const messagesKey = (side: ChatSide, ...rest: (string | number)[]) => ['messages', side, ...rest];

/** Số cuộc trò chuyện chưa đọc (badge trên menu) */
export function useUnreadMessages(side: ChatSide, enabled = true) {
  const { data } = useQuery({
    queryKey: messagesKey(side, 'unread'),
    queryFn: async () => (await api.get<{ count: number }>(`/${side}/messages/unread-count`)).data.count,
    enabled,
    refetchInterval: 120_000,
  });
  return data ?? 0;
}
