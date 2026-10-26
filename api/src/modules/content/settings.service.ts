import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

/** Định nghĩa các cấu hình + giá trị mặc định + giới hạn hợp lệ */
export const SETTING_DEFS = {
  jobDefaultDays: { label: 'Thời hạn tin mặc định (ngày)', type: 'number', default: 30, min: 1, max: 365 },
  jobMaxDays: { label: 'Hạn nộp tối đa khi đăng / gia hạn tin (ngày)', type: 'number', default: 90, min: 7, max: 365 },
  maxResumeMb: { label: 'Dung lượng CV tối đa (MB)', type: 'number', default: 5, min: 1, max: 20 },
  maxResumes: { label: 'Số CV tối đa mỗi ứng viên', type: 'number', default: 5, min: 1, max: 20 },
  aiScreeningPerDay: { label: 'Số lượt AI chấm CV mỗi công ty / ngày (0 = tắt)', type: 'number', default: 20, min: 0, max: 1000 },
  maxJobAlerts: { label: 'Số thông báo việc làm tối đa mỗi ứng viên', type: 'number', default: 5, min: 1, max: 20 },
  homeBannerTitle: { label: 'Tiêu đề banner trang chủ', type: 'string', default: 'Tìm công việc phù hợp với bạn', max: 120 },
  homeBannerSubtitle: { label: 'Dòng phụ banner trang chủ', type: 'string', default: 'Hàng nghìn việc làm từ các nhà tuyển dụng uy tín', max: 200 },
  siteNotice: { label: 'Thông báo chung (hiện trên đầu trang, để trống = ẩn)', type: 'string', default: '', max: 300 },
  paymentBankName: { label: 'Thanh toán – Ngân hàng nhận chuyển khoản', type: 'string', default: 'Vietcombank – CN Hà Nội', max: 100 },
  paymentAccountNo: { label: 'Thanh toán – Số tài khoản', type: 'string', default: '0000000000', max: 30 },
  paymentAccountName: { label: 'Thanh toán – Chủ tài khoản', type: 'string', default: 'CONG TY JOBPORTAL', max: 100 },
  paymentBankCode: { label: 'Thanh toán – Mã ngân hàng cho mã QR VietQR (vd: VCB, MB, TCB, ACB hoặc mã BIN 970436; để trống = không hiện QR)', type: 'string', default: 'VCB', max: 20 },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type Settings = { [K in SettingKey]: (typeof SETTING_DEFS)[K]['default'] extends number ? number : string };
/** Cấu hình được phép trả cho người dùng chưa đăng nhập */
export const PUBLIC_SETTINGS: SettingKey[] = ['homeBannerTitle', 'homeBannerSubtitle', 'siteNotice', 'maxResumeMb', 'maxResumes', 'jobMaxDays', 'jobDefaultDays'];

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: Settings | null = null;

  constructor(@InjectRepository(Setting) private readonly repo: Repository<Setting>) {}

  async onModuleInit() {
    try {
      await this.load();
    } catch {
      // Bảng chưa tồn tại (chưa chạy migration) -> dùng mặc định
      this.cache = defaults();
    }
  }

  async all(): Promise<Settings> {
    return this.cache ?? (await this.load());
  }

  async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    return (await this.all())[key];
  }

  async publicSettings() {
    const all = await this.all();
    return Object.fromEntries(PUBLIC_SETTINGS.map((k) => [k, all[k]]));
  }

  async update(patch: Partial<Record<string, unknown>>) {
    const entries = Object.entries(patch).filter(([k]) => k in SETTING_DEFS) as [SettingKey, unknown][];
    for (const [key, raw] of entries) {
      const def = SETTING_DEFS[key];
      let value: number | string;
      if (def.type === 'number') {
        value = Number(raw);
        if (!Number.isInteger(value) || value < def.min || value > def.max) {
          throw new BadRequestException(`${def.label}: phải là số nguyên từ ${def.min} đến ${def.max}`);
        }
      } else {
        value = String(raw ?? '').trim();
        if (value.length > def.max) throw new BadRequestException(`${def.label}: tối đa ${def.max} ký tự`);
      }
      await this.repo.save({ key, value: JSON.stringify(value) });
    }
    return this.load();
  }

  definitions() {
    return Object.entries(SETTING_DEFS).map(([key, d]) => ({ key, ...d }));
  }

  private async load(): Promise<Settings> {
    const rows = await this.repo.find();
    const s = defaults() as Record<string, unknown>;
    for (const r of rows) {
      if (r.key in SETTING_DEFS) {
        try {
          s[r.key] = JSON.parse(r.value);
        } catch {
          /* bỏ qua giá trị hỏng */
        }
      }
    }
    this.cache = s as Settings;
    return this.cache;
  }
}

function defaults(): Settings {
  return Object.fromEntries(Object.entries(SETTING_DEFS).map(([k, d]) => [k, d.default])) as Settings;
}
