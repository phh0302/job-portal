import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

function makeService() {
  const store = new Map<string, string>();
  const repo = {
    find: async () => [...store.entries()].map(([key, value]) => ({ key, value })),
    save: async (r: { key: string; value: string }) => store.set(r.key, r.value),
  };
  return new SettingsService(repo as never);
}

describe('SettingsService', () => {
  it('trả giá trị mặc định khi chưa cấu hình', async () => {
    const s = makeService();
    await s.onModuleInit();
    expect(await s.get('maxResumes')).toBe(5);
    expect(await s.get('jobMaxDays')).toBe(90);
  });

  it('lưu và đọc lại giá trị hợp lệ, bỏ qua key lạ', async () => {
    const s = makeService();
    const v = await s.update({ maxResumes: 8, homeBannerTitle: '  Xin chào  ', hacker: 'x' });
    expect(v.maxResumes).toBe(8);
    expect(v.homeBannerTitle).toBe('Xin chào');
    expect((v as Record<string, unknown>).hacker).toBeUndefined();
  });

  it('từ chối giá trị ngoài giới hạn', async () => {
    const s = makeService();
    await expect(s.update({ maxResumes: 0 })).rejects.toThrow(BadRequestException);
    await expect(s.update({ jobMaxDays: 1.5 })).rejects.toThrow(BadRequestException);
    await expect(s.update({ siteNotice: 'x'.repeat(301) })).rejects.toThrow(BadRequestException);
  });

  it('chỉ public các key cho phép', async () => {
    const s = makeService();
    const pub = await s.publicSettings();
    expect(Object.keys(pub)).toContain('homeBannerTitle');
    expect(Object.keys(pub)).not.toContain('maxJobAlerts');
  });
});
