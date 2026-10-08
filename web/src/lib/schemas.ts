import { z } from 'zod';

/** Các schema Zod dùng chung cho form (khớp với quy tắc kiểm tra của API) */

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
export const PASSWORD_MSG = 'Mật khẩu 8–64 ký tự, gồm cả chữ và số';
const PHONE_RE = /^[0-9+\-\s().]{8,20}$/;
const todayVN = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

/** Chuỗi số không âm hoặc rỗng */
const optionalNumber = (label: string, max: number, opts: { int?: boolean } = {}) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= max && (!opts.int || Number.isInteger(Number(v)))), {
      message: `${label} phải là số${opts.int ? ' nguyên' : ''} từ 0 đến ${max.toLocaleString('vi-VN')}`,
    });

const email = z.string().trim().toLowerCase().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ'));
const password = z.string().regex(PASSWORD_RE, PASSWORD_MSG);

// ===== Xác thực =====
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const registerSchema = z
  .object({
    role: z.enum(['CANDIDATE', 'EMPLOYER']),
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150, 'Tối đa 150 ký tự'),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp' });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp' });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'), password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp' })
  .refine((v) => v.password !== v.current, { path: ['password'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });

// ===== Hồ sơ ứng viên =====
export const candidateInfoSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(150),
  headline: z.string().trim().max(200, 'Tối đa 200 ký tự'),
  phone: z.string().trim().refine((v) => v === '' || PHONE_RE.test(v), 'Số điện thoại không hợp lệ'),
  dateOfBirth: z.string().refine((v) => v === '' || (v >= '1940-01-01' && v <= todayVN()), 'Ngày sinh không hợp lệ'),
  address: z.string().trim().max(255),
  locationId: z.string(),
  yearsOfExperience: optionalNumber('Số năm kinh nghiệm', 50, { int: true }),
  expectedSalary: optionalNumber('Mức lương', 10_000),
  summary: z.string().max(5000, 'Tối đa 5000 ký tự'),
});

// ===== Công ty =====
export const companySchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên công ty').max(200),
  taxCode: z.string().trim().refine((v) => v === '' || /^\d{10}(-\d{3})?$/.test(v), 'Mã số thuế gồm 10 số (hoặc 10 số-3 số)'),
  size: z.string(),
  website: z.string().trim().refine((v) => v === '' || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), 'Website phải bắt đầu bằng http:// hoặc https://'),
  address: z.string().trim().max(255),
  locationId: z.string(),
  description: z.string().max(10000, 'Tối đa 10.000 ký tự'),
});

// ===== Tin tuyển dụng =====
export const makeJobSchema = (maxDays: number) =>
  z
    .object({
      title: z.string().trim().min(1, 'Vui lòng nhập chức danh').max(200, 'Tối đa 200 ký tự'),
      jobType: z.string().min(1),
      level: z.string().min(1),
      experienceYears: optionalNumber('Kinh nghiệm', 30, { int: true }),
      quantity: z
        .string()
        .trim()
        .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 1000, 'Số lượng từ 1 đến 1000'),
      salaryMin: optionalNumber('Lương', 10_000),
      salaryMax: optionalNumber('Lương', 10_000),
      salaryNegotiable: z.boolean(),
      deadline: z
        .string()
        .min(1, 'Vui lòng chọn hạn nộp')
        .refine((v) => v >= todayVN(), 'Hạn nộp phải từ hôm nay trở đi')
        .refine((v) => v <= addDays(todayVN(), maxDays), `Hạn nộp tối đa ${maxDays} ngày kể từ hôm nay`),
      locationId: z.string(),
      workAddress: z.string().trim().max(255),
      description: z
        .string()
        .refine((v) => textOf(v).length > 0, 'Vui lòng nhập mô tả công việc')
        .refine((v) => v.length <= 20000, 'Mô tả quá dài'),
      requirements: z.string().refine((v) => v.length <= 20000, 'Nội dung quá dài'),
      benefits: z.string().refine((v) => v.length <= 20000, 'Nội dung quá dài'),
      categoryIds: z.array(z.number()).min(1, 'Chọn ít nhất 1 ngành nghề').max(3, 'Tối đa 3 ngành nghề'),
      skillIds: z.array(z.number()).max(15, 'Tối đa 15 kỹ năng'),
    })
    .superRefine((v, ctx) => {
      if (v.salaryNegotiable) return;
      const min = v.salaryMin === '' ? null : Number(v.salaryMin);
      const max = v.salaryMax === '' ? null : Number(v.salaryMax);
      if (min === null && max === null) {
        ctx.addIssue({ code: 'custom', path: ['salaryMin'], message: 'Nhập mức lương hoặc chọn "Lương thỏa thuận"' });
      }
      if (min !== null && max !== null && min > max) {
        ctx.addIssue({ code: 'custom', path: ['salaryMax'], message: 'Lương tối đa phải lớn hơn lương tối thiểu' });
      }
    });

export type JobFormValues = z.infer<ReturnType<typeof makeJobSchema>>;
