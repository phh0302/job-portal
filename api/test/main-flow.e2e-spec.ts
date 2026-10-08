/**
 * E2E: chạy API thật + SQL Server thật (database riêng job_portal_e2e).
 * Luồng: NTD đăng ký → tạo công ty → đăng tin → admin duyệt → ứng viên tải CV & ứng tuyển
 *        → NTD xem đơn, mời phỏng vấn → ứng viên thấy trạng thái + thông báo.
 * Kèm các kiểm tra bảo mật: phân quyền theo vai trò, quyền sở hữu dữ liệu, link CV có chữ ký, khóa tài khoản.
 *
 * Chạy: npm run test:e2e
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as sql from 'mssql';
import { AddressInfo } from 'net';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { UserRole } from '../src/common/enums';
import { hashPassword } from '../src/common/utils/password';
import configuration from '../src/config/configuration';
import { Category } from '../src/modules/catalog/entities/category.entity';
import { Location } from '../src/modules/catalog/entities/location.entity';
import { User } from '../src/modules/users/entities/user.entity';

let app: NestExpressApplication;
let base: string;
let catId: number;
let locId: number;

type Res<T = any> = { status: number; body: T; headers: Headers };

async function call<T = any>(method: string, path: string, opts: { token?: string; body?: unknown; form?: FormData } = {}): Promise<Res<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const r = await fetch(base + path, { method, headers, body });
  const text = await r.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* không phải JSON */
  }
  return { status: r.status, body: parsed as T, headers: r.headers };
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 7 * 3600_000).toISOString().slice(0, 10);

async function ensureDatabase() {
  const { db } = configuration();
  const pool = await sql.connect({
    server: db.host,
    port: db.instanceName ? undefined : db.port,
    user: db.username,
    password: db.password,
    database: 'master',
    options: { encrypt: db.encrypt, trustServerCertificate: db.trustServerCertificate, instanceName: db.instanceName },
  });
  await pool.request().query(`IF DB_ID(N'${db.database}') IS NULL CREATE DATABASE [${db.database}] COLLATE Vietnamese_CI_AS;`);
  await pool.close();
}

beforeAll(async () => {
  await ensureDatabase();
  app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: ['error'] });
  configureApp(app);
  await app.init();
  // Xóa sạch & tạo lại toàn bộ bảng theo entities
  const ds = app.get(DataSource);
  await ds.synchronize(true);

  // Dữ liệu nền: admin, 1 ngành, 1 tỉnh
  await ds.getRepository(User).save({
    email: 'admin@e2e.vn',
    passwordHash: await hashPassword('Admin12345'),
    role: UserRole.ADMIN,
    emailVerified: true,
    isSuperAdmin: true,
  });
  catId = (await ds.getRepository(Category).save({ name: 'CNTT', slug: 'cntt' })).id;
  locId = (await ds.getRepository(Location).save({ name: 'Hà Nội', slug: 'ha-noi', sortOrder: 1 })).id;

  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
});

afterAll(async () => {
  await app?.close();
  Logger.flush();
});

describe('Luồng chính: đăng tin → duyệt → ứng tuyển → xử lý đơn', () => {
  const s: Record<string, any> = {};

  it('NTD đăng ký, tạo công ty, đăng tin gửi duyệt', async () => {
    const reg = await call('POST', '/api/auth/register', {
      body: { email: 'ntd@e2e.vn', password: 'Ntd123456', fullName: 'Nhà Tuyển Dụng', role: 'EMPLOYER' },
    });
    expect(reg.status).toBe(201);
    expect(reg.headers.get('set-cookie')).toMatch(/jp_rt=.*HttpOnly/i);
    s.emp = reg.body.accessToken;

    const company = await call('POST', '/api/employer/company', { token: s.emp, body: { name: 'Công ty E2E', taxCode: '0101234567', locationId: locId } });
    expect(company.status).toBe(201);

    const job = await call('POST', '/api/employer/jobs', {
      token: s.emp,
      body: {
        title: 'Lập trình viên NestJS',
        description: '<p>Phát triển API <script>alert(1)</script></p>',
        jobType: 'FULL_TIME',
        level: 'JUNIOR',
        deadline: inDays(10),
        salaryMin: 15_000_000,
        salaryMax: 25_000_000,
        locationId: locId,
        categoryIds: [catId],
        submit: true,
      },
    });
    expect(job.status).toBe(201);
    expect(job.body.status).toBe('PENDING');
    expect(job.body.description).not.toMatch(/script/);
    s.jobId = job.body.id;
    s.slug = job.body.slug;
  });

  it('Tin chưa duyệt không hiển thị công khai', async () => {
    expect((await call('GET', `/api/jobs/${s.slug}`)).status).toBe(404);
  });

  it('Phân quyền: NTD không vào được API admin, chưa đăng nhập bị 401', async () => {
    expect((await call('GET', '/api/admin/jobs', { token: s.emp })).status).toBe(403);
    expect((await call('GET', '/api/admin/jobs')).status).toBe(401);
  });

  it('Admin duyệt tin → tin hiển thị, NTD nhận thông báo', async () => {
    const login = await call('POST', '/api/auth/login', { body: { email: 'admin@e2e.vn', password: 'Admin12345' } });
    expect(login.status).toBe(200);
    s.admin = login.body.accessToken;
    expect((await call('POST', `/api/admin/jobs/${s.jobId}/approve`, { token: s.admin })).status).toBe(200);

    const pub = await call('GET', `/api/jobs/${s.slug}`);
    expect(pub.status).toBe(200);
    const list = await call('GET', '/api/jobs?q=NestJS');
    expect(list.body.total).toBe(1);
    const noti = await call('GET', '/api/notifications', { token: s.emp });
    expect(noti.body.items.some((n: any) => n.type === 'JOB_APPROVED')).toBe(true);
  });

  it('Ứng viên đăng ký, tải CV, ứng tuyển (không nộp trùng)', async () => {
    const reg = await call('POST', '/api/auth/register', {
      body: { email: 'uv@e2e.vn', password: 'Uv1234567', fullName: 'Ứng Viên', role: 'CANDIDATE' },
    });
    s.cand = reg.body.accessToken;

    // File giả đuôi .pdf nhưng nội dung không phải PDF -> bị từ chối
    const fake = new FormData();
    fake.append('file', new Blob(['MZ-not-a-pdf'], { type: 'application/pdf' }), 'virus.pdf');
    expect((await call('POST', '/api/candidate/resumes', { token: s.cand, form: fake })).status).toBe(400);

    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4\n% e2e test cv\n'], { type: 'application/pdf' }), 'CV Ứng Viên.pdf');
    const up = await call('POST', '/api/candidate/resumes', { token: s.cand, form });
    expect(up.status).toBe(201);
    s.resumeId = up.body.id;

    const apply = await call('POST', '/api/candidate/applications', { token: s.cand, body: { jobId: s.jobId, resumeId: s.resumeId, coverLetter: 'Xin chào' } });
    expect(apply.status).toBe(201);
    s.appId = apply.body.id;
    expect((await call('POST', '/api/candidate/applications', { token: s.cand, body: { jobId: s.jobId, resumeId: s.resumeId } })).status).toBe(409);

    const detail = await call('GET', `/api/jobs/${s.slug}`, { token: s.cand });
    expect(detail.body.myApplication.status).toBe('SUBMITTED');
  });

  it('Quyền sở hữu: NTD công ty khác không xem/sửa được đơn & tin', async () => {
    const reg = await call('POST', '/api/auth/register', {
      body: { email: 'ntd2@e2e.vn', password: 'Ntd123456', fullName: 'NTD khác', role: 'EMPLOYER' },
    });
    s.emp2 = reg.body.accessToken;
    await call('POST', '/api/employer/company', { token: s.emp2, body: { name: 'Công ty khác' } });
    expect((await call('GET', `/api/employer/applications/${s.appId}`, { token: s.emp2 })).status).toBe(404);
    expect((await call('GET', `/api/employer/applications/${s.appId}/resume-link`, { token: s.emp2 })).status).toBe(404);
    expect((await call('PATCH', `/api/employer/jobs/${s.jobId}`, { token: s.emp2, body: { title: 'Hack' } })).status).toBe(404);
    expect((await call('GET', '/api/employer/applications', { token: s.emp2 })).body.total).toBe(0);
    // Ứng viên không gọi được API của NTD
    expect((await call('GET', '/api/employer/applications', { token: s.cand })).status).toBe(403);
  });

  it('NTD xem đơn (tự chuyển "Đã xem"), xem CV qua link có chữ ký', async () => {
    const d = await call('GET', `/api/employer/applications/${s.appId}`, { token: s.emp });
    expect(d.status).toBe(200);
    expect(d.body.status).toBe('VIEWED');
    expect(d.body.candidate.email).toBe('uv@e2e.vn');

    const link = await call('GET', `/api/employer/applications/${s.appId}/resume-link`, { token: s.emp });
    expect(link.body.url).toMatch(/^\/api\/files\/signed\//);
    const file = await fetch(base + link.body.url);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toMatch(/pdf/);
    expect(file.headers.get('cache-control')).toMatch(/no-store/);
    expect(await file.text()).toContain('%PDF-1.4');

    // Sửa 1 ký tự chữ ký -> 403
    const tampered = link.body.url.slice(0, -2) + (link.body.url.endsWith('AA') ? 'BB' : 'AA');
    expect((await fetch(base + tampered)).status).toBe(403);
  });

  it('NTD mời phỏng vấn → ứng viên thấy trạng thái mới + thông báo', async () => {
    const r = await call('PATCH', `/api/employer/applications/${s.appId}/status`, {
      token: s.emp,
      body: { status: 'INTERVIEW', interview: { time: '9:00 thứ Hai', location: 'Văn phòng' }, message: 'Mang CV bản cứng' },
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('INTERVIEW');

    // Thiếu thông tin phỏng vấn -> 400
    expect((await call('PATCH', `/api/employer/applications/${s.appId}/status`, { token: s.emp, body: { status: 'INTERVIEW' } })).status).toBe(400);

    const mine = await call('GET', '/api/candidate/applications', { token: s.cand });
    expect(mine.body.items[0].status).toBe('INTERVIEW');
    expect(mine.body.items[0].canWithdraw).toBe(false);
    const noti = await call('GET', '/api/notifications', { token: s.cand });
    expect(noti.body.items[0].type).toBe('APPLICATION_STATUS');
  });

  it('Dashboard NTD đếm đúng', async () => {
    const d = await call('GET', '/api/employer/dashboard', { token: s.emp });
    expect(d.body.jobs.open).toBe(1);
    expect(d.body.applications.total).toBe(1);
    expect(d.body.funnel.find((f: any) => f.key === 'interview').count).toBe(1);
  });

  it('Admin khóa ứng viên → token cũ bị chặn ngay, không đăng nhập lại được', async () => {
    const users = await call('GET', '/api/admin/users?q=uv@e2e.vn', { token: s.admin });
    const id = users.body.items[0].id;
    expect((await call('POST', `/api/admin/users/${id}/lock`, { token: s.admin, body: { reason: 'Spam' } })).status).toBe(200);
    expect((await call('GET', '/api/candidate/applications', { token: s.cand })).status).toBe(403);
    expect((await call('POST', '/api/auth/login', { body: { email: 'uv@e2e.vn', password: 'Uv1234567' } })).status).toBe(403);
    const audit = await call('GET', '/api/admin/audit-logs?action=USER_LOCK', { token: s.admin });
    expect(audit.body.total).toBe(1);
  });

  it('Lỗi trả về có requestId để tra log', async () => {
    const r = await call('GET', '/api/jobs/khong-ton-tai');
    expect(r.status).toBe(404);
    expect(r.body.requestId).toBe(r.headers.get('x-request-id'));
  });
});
