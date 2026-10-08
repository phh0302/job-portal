import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable, Subscriber, interval, map, merge } from 'rxjs';

const HEARTBEAT_MS = 25_000;
const MAX_CONN_PER_USER = 5;

/**
 * Đẩy sự kiện tới trình duyệt theo thời gian thực bằng Server-Sent Events (SSE).
 * - Không cần thư viện ngoài (SSE có sẵn trong Nest + trình duyệt), đi qua proxy HTTP bình thường.
 * - Lưu kết nối trong bộ nhớ: đủ cho 1 instance API. Chạy nhiều instance -> cần Redis pub/sub.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly clients = new Map<number, Set<Subscriber<MessageEvent>>>();

  /** Luồng sự kiện cho 1 kết nối của user */
  stream(userId: number): Observable<MessageEvent> {
    const events = new Observable<MessageEvent>((sub) => {
      const set = this.clients.get(userId) ?? new Set();
      // Giới hạn số tab mở cùng lúc: đóng kết nối cũ nhất
      if (set.size >= MAX_CONN_PER_USER) {
        const oldest = set.values().next().value!;
        oldest.complete();
        set.delete(oldest);
      }
      set.add(sub);
      this.clients.set(userId, set);
      sub.next({ type: 'ready', data: { at: new Date().toISOString() } });
      return () => {
        set.delete(sub);
        if (!set.size) this.clients.delete(userId);
      };
    });
    // Nhịp tim để proxy / trình duyệt không cắt kết nối "im lặng"
    const heartbeat = interval(HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: { t: Date.now() } })));
    return merge(events, heartbeat);
  }

  /** Gửi sự kiện tới mọi tab đang mở của user */
  publish(userId: number, type: string, data: object) {
    const set = this.clients.get(userId);
    if (!set) return;
    for (const sub of set) {
      try {
        sub.next({ type, data });
      } catch (err) {
        this.logger.debug(`Không gửi được tới user#${userId}: ${(err as Error).message}`);
      }
    }
  }

  get connectionCount() {
    let n = 0;
    for (const s of this.clients.values()) n += s.size;
    return n;
  }
}
