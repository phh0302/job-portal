import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, NotificationType, UserRole } from '../../common/enums';
import { MessagesService } from './messages.service';

type App = {
  id: number;
  status: ApplicationStatus;
  candidateId: number;
  lastMessageAt: Date | null;
  employerReadAt: Date | null;
  candidateReadAt: Date | null;
  job: { id: number; title: string; slug: string; companyId: number; company: { name: string; logoUrl: null } };
  candidate: { userId: number; fullName: string; avatarUrl: null };
};

function setup(over: Partial<App> = {}) {
  const app: App = {
    id: 1,
    status: ApplicationStatus.VIEWED,
    candidateId: 7,
    lastMessageAt: null,
    employerReadAt: null,
    candidateReadAt: null,
    job: { id: 3, title: 'Dev', slug: 'dev', companyId: 5, company: { name: 'ABC', logoUrl: null } },
    candidate: { userId: 70, fullName: 'Ứng viên A', avatarUrl: null },
    ...over,
  };
  const employerProfiles = [
    { userId: 10, companyId: 5, fullName: 'NTD 1' },
    { userId: 11, companyId: 5, fullName: 'NTD 2' },
    { userId: 20, companyId: 9, fullName: 'Công ty khác' },
  ];
  let nextId = 100;
  const messages = {
    create: (x: object) => x,
    save: jest.fn(async (x: object) => ({ id: nextId++, createdAt: new Date(), ...x })),
    find: async () => [],
  };
  const qbExec = jest.fn(async () => ({ affected: 1 }));
  const qb = { update: () => qb, set: () => qb, where: () => qb, execute: qbExec };
  const apps = {
    createQueryBuilder: () => qb,
    findOne: async () => app,
    update: jest.fn(async (_id: number, patch: Partial<App>) => Object.assign(app, patch)),
  };
  const employers = {
    findOneBy: async (w: { userId: number }) => employerProfiles.find((p) => p.userId === w.userId) ?? null,
    find: async (o: { where: { companyId?: number } }) =>
      o.where.companyId ? employerProfiles.filter((p) => p.companyId === o.where.companyId) : employerProfiles.filter((p) => p.companyId === 5),
  };
  const candidates = { findOne: async (o: { where: { userId: number } }) => (o.where.userId === 70 ? { id: 7 } : { id: 8 }) };
  const notifications = { create: jest.fn() };
  const realtime = { publish: jest.fn() };
  const storage = { publicUrl: () => null };
  const svc = new MessagesService(
    messages as never,
    apps as never,
    employers as never,
    candidates as never,
    notifications as never,
    realtime as never,
    storage as never,
  );
  return { svc, app, messages, apps, notifications, realtime, qbExec };
}

describe('MessagesService', () => {
  it('ứng viên không nhắn trước được khi NTD chưa mở cuộc trò chuyện', async () => {
    const { svc } = setup();
    await expect(svc.send('CANDIDATE', 70, 1, 'Xin chào')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('NTD nhắn trước: lưu tin, realtime tới ứng viên + cả đội, thông báo ứng viên', async () => {
    const { svc, app, messages, realtime, notifications } = setup();
    const m = await svc.send('EMPLOYER', 10, 1, 'Chào bạn');
    expect(m.mine).toBe(true);
    expect(messages.save).toHaveBeenCalledWith(expect.objectContaining({ senderRole: UserRole.EMPLOYER, body: 'Chào bạn' }));
    expect(app.lastMessageAt).toBeInstanceOf(Date);
    expect(app.employerReadAt).toEqual(app.lastMessageAt);
    expect(realtime.publish.mock.calls.map((c) => c[0]).sort()).toEqual([10, 11, 70]);
    expect(notifications.create).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 70, type: NotificationType.NEW_MESSAGE, link: '/candidate/messages/1' }),
    ]);
  });

  it('tin nhắn đầu của NTD được tính là đã phản hồi ứng viên', async () => {
    const { svc, qbExec } = setup();
    await svc.send('EMPLOYER', 10, 1, 'Chào bạn');
    expect(qbExec).toHaveBeenCalledTimes(1);
  });

  it('không tạo thông báo lặp khi người nhận còn tin chưa đọc', async () => {
    const { svc, notifications } = setup();
    await svc.send('EMPLOYER', 10, 1, 'Tin 1');
    await svc.send('EMPLOYER', 10, 1, 'Tin 2');
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('ứng viên trả lời được sau khi NTD đã nhắn; thông báo tới mọi NTD của công ty', async () => {
    const { svc, notifications } = setup({ lastMessageAt: new Date(), employerReadAt: new Date() });
    await svc.send('CANDIDATE', 70, 1, 'Dạ em chào anh/chị');
    expect(notifications.create).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 10, link: '/employer/messages/1' }),
      expect.objectContaining({ userId: 11 }),
    ]);
  });

  it('NTD công ty khác / ứng viên khác → 404', async () => {
    const { svc } = setup({ lastMessageAt: new Date() });
    await expect(svc.send('EMPLOYER', 20, 1, 'x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.thread('CANDIDATE', 71, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('đơn đã rút: không gửi được', async () => {
    const { svc } = setup({ status: ApplicationStatus.WITHDRAWN, lastMessageAt: new Date() });
    await expect(svc.send('EMPLOYER', 10, 1, 'x')).rejects.toThrow('Đơn đã rút');
  });

  it('mở cuộc trò chuyện chưa đọc → đánh dấu đã đọc', async () => {
    const at = new Date();
    const { svc, apps } = setup({ lastMessageAt: at, candidateReadAt: null });
    const t = await svc.thread('CANDIDATE', 70, 1);
    expect(t.canSend).toBe(true);
    expect(apps.update).toHaveBeenCalledWith(1, { candidateReadAt: at });
  });
});
