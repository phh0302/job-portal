import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { ApplicationsService } from './applications.service';

const tomorrow = () => {
  const d = new Date(`${todayVN()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

function setup(o: { job?: Record<string, unknown> | null; exists?: boolean; app?: Record<string, unknown> | null; resumeOk?: boolean } = {}) {
  const job = o.job === undefined ? { id: 5, companyId: 2, title: 'Dev', status: JobStatus.APPROVED, deadline: tomorrow(), company: { name: 'ABC' } } : o.job;
  const apps = {
    existsBy: jest.fn().mockResolvedValue(o.exists ?? false),
    create: (x: object) => x,
    save: jest.fn(async (x: object) => ({ id: 99, createdAt: new Date(), ...x })),
    findOneBy: jest.fn().mockResolvedValue(o.app ?? null),
    update: jest.fn(),
  };
  const candidates = {
    getProfileByUser: jest.fn().mockResolvedValue({ id: 11, fullName: 'An' }),
    ownResume: jest.fn(async () => {
      if (o.resumeOk === false) throw new NotFoundException('Không tìm thấy CV');
      return { id: 3, fileName: 'cv.pdf', fileUrl: 'private/resumes/x.pdf' };
    }),
  };
  const ds = { getRepository: () => ({ find: async () => [{ userId: 50 }, { userId: 51 }] }) };
  const notifications = { create: jest.fn() };
  const service = new ApplicationsService(ds as never, candidates as never, {} as never, notifications as never, apps as never, { findOne: async () => job } as never);
  return { service, apps, notifications, candidates };
}

const dto = { jobId: 5, resumeId: 3, coverLetter: 'Chào' };

describe('ApplicationsService.apply', () => {
  it('ứng tuyển thành công: lưu bản sao CV + báo cho mọi NTD của công ty', async () => {
    const { service, apps, notifications } = setup();
    const r = await service.apply(1, dto);
    expect(r.status).toBe(ApplicationStatus.SUBMITTED);
    expect(apps.save).toHaveBeenCalledWith(expect.objectContaining({ candidateId: 11, resumeFileUrl: 'private/resumes/x.pdf', resumeFileName: 'cv.pdf' }));
    expect(notifications.create.mock.calls[0][0]).toHaveLength(2);
  });
  it('tin chưa duyệt / đã đóng -> 400', async () => {
    for (const status of [JobStatus.PENDING, JobStatus.CLOSED, JobStatus.EXPIRED, JobStatus.DRAFT]) {
      const { service } = setup({ job: { id: 5, status, deadline: tomorrow() } });
      await expect(service.apply(1, dto)).rejects.toThrow(BadRequestException);
    }
  });
  it('quá hạn nộp -> 400', async () => {
    const { service } = setup({ job: { id: 5, status: JobStatus.APPROVED, deadline: '2000-01-01' } });
    await expect(service.apply(1, dto)).rejects.toThrow('hết hạn');
  });
  it('ứng tuyển trùng -> 409', async () => {
    const { service } = setup({ exists: true });
    await expect(service.apply(1, dto)).rejects.toThrow(ConflictException);
  });
  it('dùng CV của người khác -> 404 (kiểm tra quyền sở hữu)', async () => {
    const { service, apps } = setup({ resumeOk: false });
    await expect(service.apply(1, dto)).rejects.toThrow(NotFoundException);
    expect(apps.save).not.toHaveBeenCalled();
  });
  it('tin không tồn tại -> 404', async () => {
    const { service } = setup({ job: null });
    await expect(service.apply(1, dto)).rejects.toThrow(NotFoundException);
  });
});

describe('ApplicationsService.withdraw', () => {
  it('chỉ rút được khi NTD chưa xử lý', async () => {
    const ok = setup({ app: { id: 1, status: ApplicationStatus.VIEWED } });
    await expect(ok.service.withdraw(1, 1)).resolves.toMatchObject({ status: ApplicationStatus.WITHDRAWN });
    const no = setup({ app: { id: 1, status: ApplicationStatus.INTERVIEW } });
    await expect(no.service.withdraw(1, 1)).rejects.toThrow(BadRequestException);
  });
  it('đơn của người khác -> 404', async () => {
    const { service, apps } = setup({ app: null });
    await expect(service.withdraw(1, 999)).rejects.toThrow(NotFoundException);
    expect(apps.findOneBy).toHaveBeenCalledWith({ id: 999, candidateId: 11 });
  });
});
