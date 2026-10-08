import { MessageEvent } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { NotificationsStreamController } from './stream.controller';

describe('RealtimeService (SSE)', () => {
  it('chỉ gửi sự kiện tới đúng user, mọi tab đang mở', () => {
    const rt = new RealtimeService();
    const a1: MessageEvent[] = [];
    const a2: MessageEvent[] = [];
    const b: MessageEvent[] = [];
    const s1 = rt.stream(1).subscribe((e) => a1.push(e));
    const s2 = rt.stream(1).subscribe((e) => a2.push(e));
    const s3 = rt.stream(2).subscribe((e) => b.push(e));
    rt.publish(1, 'notification', { title: 'Có ứng viên mới' });
    expect(a1.map((e) => e.type)).toEqual(['ready', 'notification']);
    expect(a2.map((e) => e.type)).toEqual(['ready', 'notification']);
    expect(b.map((e) => e.type)).toEqual(['ready']);
    expect(rt.connectionCount).toBe(3);
    [s1, s2, s3].forEach((s) => s.unsubscribe());
    expect(rt.connectionCount).toBe(0);
  });

  it('giới hạn 5 kết nối / user: đóng kết nối cũ nhất', () => {
    const rt = new RealtimeService();
    const subs = Array.from({ length: 6 }, () => rt.stream(1).subscribe());
    expect(rt.connectionCount).toBe(5);
    subs.forEach((s) => s.unsubscribe());
  });
});

describe('Stream token', () => {
  const ctrl = new NotificationsStreamController(new RealtimeService(), { getOrThrow: () => 'secret_secret_secret_secret_secret_12' } as never);
  it('token hợp lệ trả về userId; token sửa / rác bị từ chối', () => {
    const { token } = ctrl.token({ id: 42 } as never);
    expect(ctrl.verify(token)).toBe(42);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 1, e: 9e9 })).toString('base64url');
    expect(ctrl.verify(`${forged}.${sig}`)).toBeNull();
    expect(ctrl.verify(`${body}.x`)).toBeNull();
    expect(ctrl.verify('')).toBeNull();
    expect(() => ctrl.stream('rac')).toThrow('không hợp lệ');
  });
});
