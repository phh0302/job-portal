import { AlertFrequency, UserStatus } from '../../common/enums';
import { alertLabel } from './engagement.service';
import { JobAlertRunner } from './job-alert.runner';

const HOUR = 3600_000;
const mkAlert = (id: number, frequency: AlertFrequency, hoursAgo: number, status = UserStatus.ACTIVE) => ({
  id,
  userId: id,
  frequency,
  isActive: true,
  keyword: 'react',
  locationId: null,
  categoryId: null,
  lastSentAt: new Date(Date.now() - hoursAgo * HOUR),
  user: { email: `u${id}@x.vn`, status },
  location: null,
  category: null,
});

describe('JobAlertRunner', () => {
  it('chỉ xử lý alert đến hạn, bỏ qua tài khoản bị khóa', async () => {
    const alerts = [
      mkAlert(1, AlertFrequency.DAILY, 25), // đến hạn
      mkAlert(2, AlertFrequency.DAILY, 5), // chưa
      mkAlert(3, AlertFrequency.WEEKLY, 24 * 8), // đến hạn
      mkAlert(4, AlertFrequency.DAILY, 30, UserStatus.LOCKED), // bị khóa
    ];
    const updated: number[] = [];
    const repo = {
      find: async () => alerts,
      update: async (id: number) => updated.push(id),
      manager: { findOne: async () => ({ fullName: 'An' }) },
    };
    const search = jest.fn().mockResolvedValue({
      total: 1,
      items: [{ title: 'React Dev', slug: 'react-dev', salaryMin: 15e6, salaryMax: 25e6, salaryNegotiable: false, company: { name: 'ABC' } }],
    });
    const sendJobAlert = jest.fn();
    const create = jest.fn();
    const runner = new JobAlertRunner(
      { get: () => 'http://web' } as never,
      { search } as never,
      { sendJobAlert } as never,
      { create } as never,
      repo as never,
    );
    await runner.runDue();
    expect(updated.sort()).toEqual([1, 3]);
    expect(sendJobAlert).toHaveBeenCalledTimes(2);
    expect(sendJobAlert.mock.calls[0][3][0]).toMatchObject({ title: 'React Dev', salary: '15 – 25 triệu', url: 'http://web/jobs/react-dev' });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('alertLabel', () => {
    expect(alertLabel({ keyword: 'java', location: { name: 'Hà Nội' }, category: null })).toBe('"java" · Hà Nội');
    expect(alertLabel({ keyword: null })).toBe('Tất cả việc làm');
  });
});
