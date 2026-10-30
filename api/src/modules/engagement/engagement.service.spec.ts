import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { JobAlertDto } from './dto/engagement.dto';
import { EngagementService } from './engagement.service';

describe('EngagementService.updateAlert', () => {
  const alert = { id: 9, userId: 1, keyword: 'ReactJS', locationId: null, categoryId: null, isActive: true };
  const build = () => {
    const alerts = {
      findOne: jest.fn().mockResolvedValue({ ...alert, location: null, category: null }),
      update: jest.fn(),
    };
    const svc = new EngagementService(
      {} as never, {} as never, {} as never, {} as never, {} as never,
      alerts as never, {} as never, {} as never,
      { existsBy: jest.fn().mockResolvedValue(true) } as never,
      { existsBy: jest.fn().mockResolvedValue(true) } as never,
    );
    return { svc, alerts };
  };

  it('chỉ gửi isActive (bật/tắt) không bị báo thiếu từ khoá (BUG-17)', async () => {
    const { svc, alerts } = build();
    const dto = plainToInstance(JobAlertDto, { isActive: false });
    await svc.updateAlert(1, 9, dto);
    expect(alerts.update).toHaveBeenCalledWith(9, { isActive: false });
  });

  it('vẫn báo lỗi khi xoá hết từ khoá, địa điểm, ngành', async () => {
    const { svc } = build();
    const dto = plainToInstance(JobAlertDto, { keyword: '' });
    await expect(svc.updateAlert(1, 9, dto)).rejects.toThrow('Hãy nhập ít nhất từ khóa, địa điểm hoặc ngành nghề');
  });
});
