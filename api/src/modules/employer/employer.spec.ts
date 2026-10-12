import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { EmployerApplicationsService } from './applications.service';
import { EmployerJobsService } from './jobs.service';

const inDays = (n: number) => {
  const d = new Date(`${todayVN()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const MY_COMPANY = 2;
const ctx = { company: async () => ({ id: MY_COMPANY, name: 'ABC' }) };

// ================= Tin tuyển dụng =================
function jobsSetup(job: Record<string, unknown> | null, opts: { hasApps?: boolean } = {}) {
  const store = job ? { ...job } : null;
  const jobs = {
    // Chỉ trả tin khi đúng công ty -> mô phỏng WHERE company_id
    findOne: jest.fn(async ({ where }: { where: { id: number; companyId: number } }) =>
      store && store.id === where.id && store.companyId === where.companyId ? { ...store } : null,
    ),
    save: jest.fn(async (j: Record<string, unknown>) => Object.assign(store!, j)),
    update: jest.fn(async (_id: number, patch: Record<string, unknown>) => Object.assign(store!, patch)),
    delete: jest.fn(),
  };
  const ds = { getRepository: () => ({ existsBy: async () => !!opts.hasApps }) };
  const notifications = { notifyAdmins: jest.fn() };
  const settings = { get: async () => 90 };
  const byIds = { findBy: async ({ id }: { id: { _value: number[] } }) => id._value.map((x) => ({ id: x })) };
  const service = new EmployerJobsService(ds as never, ctx as never, notifications as never, settings as never, jobs as never, byIds as never, byIds as never, {} as never);
  return { service, jobs, store, notifications };
}

const approved = () => ({
  id: 1,
  companyId: MY_COMPANY,
  title: 'Dev',
  description: '<p>Mô tả</p>',
  requirements: null,
  benefits: null,
  status: JobStatus.APPROVED,
  deadline: inDays(10),
  salaryMin: '10000000',
  salaryMax: '20000000',
  categories: [{ id: 1 }],
  skills: [{ id: 2 }],
});

describe('EmployerJobsService – quyền sở hữu & vòng đời tin', () => {
  it('không thao tác được tin của công ty khác (404)', async () => {
    const { service } = jobsSetup({ ...approved(), companyId: 999 });
    await expect(service.close(1, 1)).rejects.toThrow(NotFoundException);
    await expect(service.update(1, 1, { title: 'Hack' })).rejects.toThrow(NotFoundException);
    await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
  });

  it('sửa lương / hạn nộp của tin đang hiển thị: KHÔNG phải duyệt lại', async () => {
    const { service, store } = jobsSetup(approved());
    jest.spyOn(service, 'detail').mockResolvedValue({} as never);
    await service.update(1, 1, { salaryMax: 25_000_000, deadline: inDays(20), description: '<p>Mô tả</p>', categoryIds: [1], skillIds: [2] });
    expect(store!.status).toBe(JobStatus.APPROVED);
  });

  it('sửa nội dung tin đang hiển thị: chuyển về chờ duyệt + báo admin', async () => {
    const { service, store, notifications } = jobsSetup(approved());
    jest.spyOn(service, 'detail').mockResolvedValue({} as never);
    await service.update(1, 1, { description: '<p>Nội dung mới</p>' });
    expect(store!.status).toBe(JobStatus.PENDING);
    expect(notifications.notifyAdmins).toHaveBeenCalled();
  });

  it('nội dung độc hại bị làm sạch khi lưu', async () => {
    const { service, store } = jobsSetup({ ...approved(), status: JobStatus.DRAFT });
    jest.spyOn(service, 'detail').mockResolvedValue({} as never);
    await service.update(1, 1, { description: '<p>Hi<script>alert(1)</script></p>' });
    expect(store!.description).toBe('<p>Hi</p>');
  });

  it('mô tả rỗng (chỉ thẻ trống) -> 400', async () => {
    const { service } = jobsSetup({ ...approved(), status: JobStatus.DRAFT });
    await expect(service.update(1, 1, { description: '<p></p>' })).rejects.toThrow('Vui lòng nhập mô tả');
  });

  it('gia hạn quá giới hạn cấu hình -> 400; tin hết hạn được gia hạn thì hiển thị lại', async () => {
    const { service, store } = jobsSetup({ ...approved(), status: JobStatus.EXPIRED, deadline: inDays(-1) });
    jest.spyOn(service, 'detail').mockResolvedValue({} as never);
    await expect(service.extend(1, 1, inDays(200))).rejects.toThrow(BadRequestException);
    await service.extend(1, 1, inDays(30));
    expect(store!.status).toBe(JobStatus.APPROVED);
  });

  it('không xóa được tin đã có người ứng tuyển', async () => {
    const { service } = jobsSetup(approved(), { hasApps: true });
    await expect(service.remove(1, 1)).rejects.toThrow('đã có người ứng tuyển');
  });

  it('chỉ đóng được tin đang hiển thị', async () => {
    const { service } = jobsSetup({ ...approved(), status: JobStatus.DRAFT });
    await expect(service.close(1, 1)).rejects.toThrow(BadRequestException);
  });
});

// ================= Đơn ứng tuyển =================
function appsSetup(app: Record<string, unknown> | null) {
  const store = app ? { ...app } : null;
  const apps = {
    findOne: jest.fn(async () => (store ? { ...store } : null)),
    update: jest.fn(async (_id: number, patch: Record<string, unknown>) => Object.assign(store!, patch)),
    manager: { findOneOrFail: async () => ({ userId: 70, fullName: 'An', user: { email: 'an@x.vn' } }) },
    createQueryBuilder: () => {
      const qb = { update: () => qb, set: () => qb, where: () => qb, execute: async () => Object.assign(store!, { respondedAt: new Date() }) };
      return qb;
    },
  };
  const notifications = { notifyApplicationStatus: jest.fn() };
  const fileTokens = { sign: jest.fn(() => ({ url: '/api/files/signed/x', expiresAt: '' })) };
  const service = new EmployerApplicationsService(ctx as never, {} as never, notifications as never, fileTokens as never, apps as never);
  jest.spyOn(service, 'detail').mockResolvedValue({} as never);
  return { service, store, notifications, fileTokens };
}

const myApp = (status: ApplicationStatus) => ({
  id: 9,
  status,
  candidateId: 11,
  resumeFileUrl: 'private/resumes/a.pdf',
  resumeFileName: 'cv.pdf',
  job: { id: 1, title: 'Dev', companyId: MY_COMPANY, company: { name: 'ABC' } },
});

describe('EmployerApplicationsService – quyền & luồng trạng thái', () => {
  it('NTD công ty khác không xem được đơn / CV (404)', async () => {
    const { service, fileTokens } = appsSetup({ ...myApp(ApplicationStatus.SUBMITTED), job: { id: 1, companyId: 999, company: {} } });
    await expect(service.resumeLink(1, 9)).rejects.toThrow(NotFoundException);
    await expect(service.updateNote(1, 9, 'x')).rejects.toThrow(NotFoundException);
    expect(fileTokens.sign).not.toHaveBeenCalled();
  });

  it('NTD đúng công ty nhận được link CV có chữ ký', async () => {
    const { service, fileTokens } = appsSetup(myApp(ApplicationStatus.VIEWED));
    await service.resumeLink(1, 9);
    expect(fileTokens.sign).toHaveBeenCalledWith({ k: 'private/resumes/a.pdf', n: 'cv.pdf', u: 1 });
  });

  it('mời phỏng vấn: đổi trạng thái + báo ứng viên kèm lịch', async () => {
    const { service, store, notifications } = appsSetup(myApp(ApplicationStatus.VIEWED));
    await service.updateStatus(1, 9, { status: ApplicationStatus.INTERVIEW, interview: { time: '9h', location: 'VP' } });
    expect(store!.respondedAt).toBeInstanceOf(Date);
    expect(store!.status).toBe(ApplicationStatus.INTERVIEW);
    expect(notifications.notifyApplicationStatus).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 70, status: ApplicationStatus.INTERVIEW, interview: { time: '9h', location: 'VP' } }),
    );
  });

  it('không đổi trạng thái đơn đã rút / bước không hợp lệ', async () => {
    const withdrawn = appsSetup(myApp(ApplicationStatus.WITHDRAWN));
    await expect(withdrawn.service.updateStatus(1, 9, { status: ApplicationStatus.SHORTLISTED })).rejects.toThrow('rút đơn');
    const offered = appsSetup(myApp(ApplicationStatus.OFFERED));
    await expect(offered.service.updateStatus(1, 9, { status: ApplicationStatus.VIEWED })).rejects.toThrow(BadRequestException);
  });
});
