# JobPortal – Trang web tìm việc làm

3 vai trò: **Ứng viên** · **Nhà tuyển dụng** · **Admin**. Kế hoạch chi tiết: [todo.md](todo.md).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend (`api/`) | NestJS 11, TypeORM, SQL Server, Swagger |
| Frontend (`web/`) | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4 |
| Hạ tầng dev | SQL Server 2022, Redis (Docker Compose hoặc cài trực tiếp) |

## Yêu cầu

- Node.js 20+ (khuyên dùng 22 LTS)
- SQL Server 2019/2022 (Developer/Express) **hoặc** Docker Desktop
- (Khuyên dùng) SQL Server Management Studio (SSMS)

## Chạy dự án lần đầu

```bash
# 1. Cài thư viện cho root, api, web
npm run install:all

# 2. Tạo file môi trường
copy api\.env.example api\.env        # Windows (macOS/Linux: cp)
copy web\.env.example web\.env

# 3. Khởi động SQL Server
#    Cách A – Docker:   docker compose up -d
#    Cách B – SQL Server cài trên máy: sửa DB_USERNAME / DB_PASSWORD trong api\.env
#    (nhớ bật "SQL Server and Windows Authentication mode" và TCP/IP cổng 1433)

# 4. Tạo database job_portal
npm --prefix api run db:create

# 5. Chạy cả api + web
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- Kiểm tra kết nối: http://localhost:3000/api/health

## Xử lý lỗi kết nối SQL Server (bản Express)

**`Failed to connect to localhost:1433`** – SQL Express mặc định tắt TCP/IP và dùng cổng động.
Chạy PowerShell (Administrator):

```powershell
$id  = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL').SQLEXPRESS
$tcp = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$id\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty $tcp -Name Enabled -Value 1
Set-ItemProperty "$tcp\IPAll" -Name TcpDynamicPorts -Value ''
Set-ItemProperty "$tcp\IPAll" -Name TcpPort -Value '1433'
Restart-Service 'MSSQL$SQLEXPRESS' -Force
```

**`Login failed for user 'sa'`** – bật Mixed Mode và đặt mật khẩu sa (khớp `DB_PASSWORD`):

```powershell
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$id\MSSQLServer" -Name LoginMode -Value 2
Restart-Service 'MSSQL$SQLEXPRESS' -Force
sqlcmd -S localhost\SQLEXPRESS -E -Q "ALTER LOGIN sa ENABLE; ALTER LOGIN sa WITH PASSWORD = '<mat-khau-cua-ban>';"
```

## Xác thực

- Access token (JWT, 15 phút) gửi qua header `Authorization: Bearer …`, web giữ trong bộ nhớ.
- Refresh token (7 ngày) nằm trong cookie httpOnly `jp_rt`, tự xoay vòng mỗi lần refresh.
- Mọi API mặc định yêu cầu đăng nhập; dùng `@Public()` để mở, `@Roles(UserRole.ADMIN)` để giới hạn vai trò.
- Khi chưa cấu hình SMTP, email (xác minh, quên mật khẩu) được **in ra terminal của API** — copy link trong đó để thử.

| Tài khoản (sau `npm run seed`) | Mật khẩu |
|---|---|
| admin@jobportal.local | Admin@123 |
| ntd1@demo.local, ntd2@demo.local (nhà tuyển dụng) | Demo@123 |
| uv1@demo.local, uv2@demo.local (ứng viên) | Demo@123 |

## Migration (từ bước 2)

```bash
cd api
npm run migration:generate --name=TenMigration
npm run migration:run
npm run migration:revert
```

## Kiểm thử

```bash
cd api
npm test            # unit test (không cần database)
npm run test:e2e    # E2E: chạy API thật với SQL Server, database riêng job_portal_e2e (tự tạo, xóa sạch mỗi lần)
```

E2E kiểm tra luồng: NTD đăng ký → tạo công ty → đăng tin → admin duyệt → ứng viên tải CV, ứng tuyển → NTD xem CV, mời phỏng vấn → ứng viên nhận thông báo; kèm phân quyền, quyền sở hữu dữ liệu, link CV có chữ ký, khóa tài khoản.

## Bảo mật (tóm tắt)

- Mọi API mặc định cần đăng nhập; phân quyền theo vai trò; dữ liệu luôn lọc theo chủ sở hữu (NTD chỉ thấy tin/đơn của công ty mình).
- CV & giấy phép KD không có link công khai: chỉ tải qua **link có chữ ký, hết hạn sau 5 phút**, cấp sau khi kiểm tra quyền.
- Helmet, CORS giới hạn domain, rate limit (mặc định 300 request/phút/IP, chặt hơn cho đăng nhập/đăng ký), body tối đa 1MB.
- Kiểm tra dữ liệu bằng class-validator; truy vấn tham số hóa; HTML từ trình soạn thảo được làm sạch (sanitize-html); file upload kiểm tra cả nội dung (magic bytes).
- Mỗi request có `X-Request-Id`; lỗi trả `requestId` để tra log; lỗi 5xx không lộ chi tiết kỹ thuật.

## Triển khai

Xem [docs/trien-khai-sinh-vien.md](docs/trien-khai-sinh-vien.md): triển khai bản trình diễn lên VPS DigitalOcean + tên miền miễn phí (GitHub Student Pack) bằng 1 lệnh `deploy/setup-vps.sh` – Docker + Caddy (HTTPS tự động) + backup hằng ngày. CI chạy lint, test, E2E và build Docker trên GitHub Actions (`.github/workflows/ci.yml`).

## Cấu trúc thư mục

```
job-portal/
├─ api/                 # NestJS
│  └─ src/
│     ├─ config/        # đọc biến môi trường
│     ├─ database/      # TypeORM, data-source, migrations
│     ├─ common/        # filter, guard, decorator dùng chung
│     └─ modules/       # từng module nghiệp vụ (health, auth, jobs…)
├─ web/                 # React + Vite
│  └─ src/
│     ├─ layouts/  pages/  components/  lib/
├─ docker-compose.yml
└─ todo.md
```

Quy ước commit: xem [CONTRIBUTING.md](CONTRIBUTING.md).
