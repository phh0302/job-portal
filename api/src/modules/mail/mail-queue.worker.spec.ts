import { EmailStatus } from './entities/email-outbox.entity';
import { MAX_ATTEMPTS, MailQueueWorker, nextRetryAt } from './mail-queue.worker';

function setup(deliver: jest.Mock, claimOk = true) {
  const updates: Record<string, unknown>[] = [];
  const repo = {
    update: jest.fn(async (where: Record<string, unknown> | string, patch: Record<string, unknown>) => {
      updates.push({ where, patch });
      // lần update đầu là "giữ chỗ" PENDING -> SENDING
      return { affected: typeof where === 'object' && 'status' in where ? (claimOk ? 1 : 0) : 1 };
    }),
  };
  const worker = new MailQueueWorker({ deliver } as never, repo as never);
  return { worker, updates };
}
const mail = (attempts = 0) => ({ id: '7', to: 'a@b.vn', subject: 'S', html: '<p>x</p>', attempts }) as never;

describe('MailQueueWorker', () => {
  it('gửi thành công -> SENT', async () => {
    const deliver = jest.fn().mockResolvedValue(undefined);
    const { worker, updates } = setup(deliver);
    await worker.process(mail());
    expect(deliver).toHaveBeenCalledWith({ to: 'a@b.vn', subject: 'S', html: '<p>x</p>' });
    expect(updates[1].patch).toMatchObject({ status: EmailStatus.SENT, attempts: 1 });
  });

  it('lỗi -> quay lại PENDING, hẹn thử lại; hết lượt -> FAILED', async () => {
    const deliver = jest.fn().mockRejectedValue(new Error('SMTP timeout'));
    const first = setup(deliver);
    await first.worker.process(mail(0));
    expect(first.updates[1].patch).toMatchObject({ status: EmailStatus.PENDING, attempts: 1, lastError: 'SMTP timeout' });

    const last = setup(deliver);
    await last.worker.process(mail(MAX_ATTEMPTS - 1));
    expect(last.updates[1].patch).toMatchObject({ status: EmailStatus.FAILED, attempts: MAX_ATTEMPTS });
  });

  it('worker khác đã giữ chỗ -> không gửi trùng', async () => {
    const deliver = jest.fn();
    const { worker } = setup(deliver, false);
    await worker.process(mail());
    expect(deliver).not.toHaveBeenCalled();
  });

  it('thời gian chờ tăng dần: 1, 5, 30, 120, 360 phút', () => {
    const now = 0;
    expect([1, 2, 3, 4, 5].map((a) => (nextRetryAt(a, now)!.getTime() - now) / 60_000)).toEqual([1, 5, 30, 120, 360]);
    expect(nextRetryAt(MAX_ATTEMPTS, now)).toBeNull();
  });
});
