import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../components/Toast';
import { api } from './api';

interface RealtimeNotification {
  type: string;
  title: string;
  message: string | null;
  link: string | null;
}

/** Truy vấn cần làm mới theo loại thông báo */
const INVALIDATE: Record<string, string[][]> = {
  APPLICATION_STATUS: [['candidate', 'applications']],
  NEW_APPLICATION: [['employer', 'applications'], ['employer', 'jobs'], ['employer', 'dashboard']],
  JOB_APPROVED: [['employer', 'jobs']],
  JOB_REJECTED: [['employer', 'jobs']],
  COMPANY_VERIFIED: [['employer', 'me']],
  COMPANY_REJECTED: [['employer', 'me']],
  NEW_MESSAGE: [['messages']],
  SUPPORT: [['support'], ['admin', 'support'], ['admin', 'overview']],
  ORDER_PAID: [['employer', 'billing']],
  ORDER_CANCELLED: [['employer', 'billing']],
  REVIEW_APPROVED: [['reviews']],
  REVIEW_REJECTED: [['reviews']],
  SYSTEM: [['admin']],
};

/**
 * Kết nối thông báo realtime (Server-Sent Events).
 * Tự xin "stream token" ngắn hạn, tự kết nối lại khi mất mạng (chờ 2s → 4s → … tối đa 60s).
 * Trả về true khi đang kết nối.
 */
export function useRealtimeNotifications(enabled: boolean) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped) return;
      retryTimer = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 60_000);
    };

    async function connect() {
      try {
        const { data } = await api.get<{ token: string }>('/notifications/stream-token');
        if (stopped) return;
        const base = import.meta.env.VITE_API_URL ?? '/api';
        es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(data.token)}`);
        es.addEventListener('ready', () => {
          delay = 2000;
          setConnected(true);
        });
        es.addEventListener('notification', (ev) => {
          const n = JSON.parse((ev as MessageEvent<string>).data) as RealtimeNotification;
          qc.invalidateQueries({ queryKey: ['notifications'] });
          (INVALIDATE[n.type] ?? []).forEach((key) => qc.invalidateQueries({ queryKey: key }));
          toast(n.message ? `${n.title}: ${n.message}` : n.title, 'info');
        });
        // Tin nhắn chat: làm mới hộp thư / cuộc trò chuyện đang mở (không toast từng tin)
        es.addEventListener('message', () => {
          qc.invalidateQueries({ queryKey: ['messages'] });
        });
        // Hỗ trợ khách hàng: cập nhật khung chat của người dùng / trang hỗ trợ của admin
        es.addEventListener('support', () => {
          qc.invalidateQueries({ queryKey: ['support'] });
          qc.invalidateQueries({ queryKey: ['admin', 'support'] });
        });
        es.onerror = () => {
          // Token chỉ dùng để mở kết nối -> đóng và xin token mới thay vì để EventSource tự thử lại
          es?.close();
          es = null;
          setConnected(false);
          scheduleReconnect();
        };
      } catch {
        setConnected(false);
        scheduleReconnect();
      }
    }

    void connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      es?.close();
      setConnected(false);
    };
  }, [enabled, qc]);

  return connected;
}
