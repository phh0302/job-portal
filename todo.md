# Kế hoạch dự án: Job Portal (Trang web tìm việc làm)

> 3 vai trò: **Ứng viên (Candidate)** · **Nhà tuyển dụng (Employer)** · **Quản trị viên (Admin)**
> Ngày lập: 07/10/2026

---

## 0. Công nghệ đề xuất

- [x] Backend: **NestJS** (TypeScript) + **SQL Server** + **TypeORM** (đã chọn)
  - SQL Server không có kiểu `enum` → dùng `simple-enum` của TypeORM (lưu NVARCHAR + CHECK constraint)
  - Dùng `NVARCHAR` cho các cột tiếng Việt, kiểu `DECIMAL` cho mức lương
- [x] Frontend: **React** (Vite) + React Router + TanStack Query + Tailwind CSS
- [x] Xác thực: JWT (access + refresh token), scrypt (có sẵn trong Node) để băm mật khẩu, phân quyền theo role (RBAC)
- [x] Lưu file (CV, logo, avatar): local storage (dev) → S3/Cloudinary (prod) _(đã làm local; S3 khi deploy)_
- [x] Tìm kiếm: `LIKE` + index (giai đoạn đầu, đã làm) → SQL Server Full-Text Search (cần cài thêm tính năng Full-Text) → Elasticsearch/Meilisearch (nếu cần)
- [x] Email: Nodemailer + hàng đợi _(hàng đợi lưu trong SQL Server – bảng `email_outbox`, thay cho BullMQ + Redis; tự thử lại, admin xem & gửi lại)_
- [x] Realtime thông báo _(Server-Sent Events thay cho Socket.IO: không cần thư viện, đi qua proxy HTTP)_
- [x] Môi trường dev: SQL Server cài trên máy (Developer/Express) hoặc Docker image `mcr.microsoft.com/mssql/server`, kèm Redis
- [x] Công cụ quản lý DB: SQL Server Management Studio (SSMS) hoặc Azure Data Studio

---

## 1. Khởi tạo dự án

- [x] Tạo cấu trúc thư mục: `api/` (NestJS), `web/` (React), `docker-compose.yml`
- [x] Cấu hình ESLint, Prettier, `.env.example`, `.gitignore`
- [x] Khởi tạo Git repository, quy ước commit
- [x] Cấu hình Swagger cho API docs
- [x] Viết README hướng dẫn chạy dự án

---

## 2. Thiết kế cơ sở dữ liệu

- [x] `users` — id, email, password_hash, role (CANDIDATE / EMPLOYER / ADMIN), status (active/locked), email_verified, timestamps
- [x] `candidate_profiles` — user_id, họ tên, SĐT, ngày sinh, địa chỉ, avatar, tiêu đề nghề nghiệp, giới thiệu, kinh nghiệm (năm), mức lương mong muốn
- [x] `educations`, `experiences`, `skills`, `candidate_skills`
- [x] `resumes` (CV) — candidate_id, tên file, url, is_default
- [x] `companies` — tên, logo, ảnh bìa, mã số thuế, quy mô, website, địa chỉ, mô tả, trạng thái xác minh
- [x] `employer_profiles` — user_id, company_id, chức vụ
- [x] `categories` (ngành nghề), `locations` (tỉnh/thành)
- [x] `jobs` — company_id, tiêu đề, mô tả, yêu cầu, quyền lợi, lương min/max/thỏa thuận, loại hình (full-time, part-time, remote, thực tập), cấp bậc, kinh nghiệm, số lượng, hạn nộp, trạng thái (DRAFT / PENDING / APPROVED / REJECTED / CLOSED / EXPIRED), lượt xem
- [x] `job_skills`, `job_categories`
- [x] `applications` — job_id, candidate_id, resume_id, thư giới thiệu, trạng thái (SUBMITTED / VIEWED / SHORTLISTED / INTERVIEW / OFFERED / REJECTED / WITHDRAWN), ghi chú NTD
- [x] `saved_jobs`, `followed_companies`
- [x] `job_alerts` — từ khóa, địa điểm, ngành, tần suất gửi
- [x] `notifications`
- [x] `reports` — báo cáo tin tuyển dụng/công ty vi phạm
- [x] `audit_logs` — lịch sử thao tác của admin
- [x] Viết seed dữ liệu mẫu (admin mặc định, 18 ngành nghề, 34 tỉnh/thành, 37 kỹ năng, 2 công ty, 6 job demo) — `npm run seed`
- [x] Tạo migration `InitSchema` từ entities và chạy trên SQL Server (`migration:generate` → `migration:run` → `seed`)

---

## 3. Xác thực & phân quyền (dùng chung)

- [x] Đăng ký (chọn vai trò Ứng viên / Nhà tuyển dụng)
- [x] Đăng nhập, đăng xuất, refresh token
- [x] Xác minh email
- [x] Quên mật khẩu / đặt lại mật khẩu
- [x] Đổi mật khẩu
- [x] Guard phân quyền theo role (`@Roles()`), chặn tài khoản bị khóa
- ~~(Tùy chọn) Đăng nhập Google~~ _(bỏ — không làm theo quyết định 08/10/2026)_
- [x] Rate limit cho các endpoint đăng nhập/đăng ký

---

## 4. Chức năng Ứng viên (Candidate)

### 4.1 Hồ sơ
- [x] Xem/sửa thông tin cá nhân, avatar
- [x] Quản lý học vấn, kinh nghiệm, kỹ năng
- [x] Upload nhiều CV (PDF/DOCX, giới hạn dung lượng), chọn CV mặc định
- [x] Bật/tắt chế độ "Cho phép NTD tìm thấy hồ sơ"

### 4.2 Tìm việc
- [x] Trang danh sách việc làm: tìm theo từ khóa
- [x] Bộ lọc: địa điểm, ngành nghề, mức lương, loại hình, cấp bậc, kinh nghiệm
- [x] Sắp xếp: mới nhất, lương cao, phù hợp nhất
- [x] Phân trang / infinite scroll
- [x] Trang chi tiết việc làm + thông tin công ty + việc làm tương tự
- [x] Trang chi tiết công ty + danh sách job đang tuyển

### 4.3 Ứng tuyển
- [x] Nộp đơn: chọn CV + thư giới thiệu
- [x] Chặn ứng tuyển trùng, chặn job hết hạn/đã đóng
- [x] Xem danh sách việc đã ứng tuyển + trạng thái
- [x] Rút đơn ứng tuyển

### 4.4 Tiện ích
- [x] Lưu việc làm yêu thích
- [x] Theo dõi công ty
- [x] Tạo thông báo việc làm (job alert) qua email
- [x] Nhận thông báo khi trạng thái đơn thay đổi
- [x] Báo cáo tin tuyển dụng vi phạm

---

## 5. Chức năng Nhà tuyển dụng (Employer)

### 5.1 Công ty
- [x] Tạo/cập nhật hồ sơ công ty (logo, ảnh bìa, mô tả, quy mô…)
- [x] Gửi yêu cầu xác minh công ty (giấy phép kinh doanh) → chờ admin duyệt
- [x] (Tùy chọn) Nhiều tài khoản NTD cùng 1 công ty _(trang /employer/team + /join-company; vai trò Chủ/Thành viên)_

### 5.2 Tin tuyển dụng
- [x] Tạo tin (lưu nháp / gửi duyệt)
- [x] Sửa, đóng, mở lại, gia hạn, xóa tin
- [x] Danh sách tin của tôi + lọc theo trạng thái
- [x] Xem lý do bị từ chối (nếu admin reject)
- [x] Tự động chuyển EXPIRED khi quá hạn (cron job)

### 5.3 Quản lý ứng viên
- [x] Danh sách đơn ứng tuyển theo từng tin
- [x] Xem hồ sơ + tải/xem CV ứng viên
- [x] Cập nhật trạng thái đơn (pipeline: Đã xem → Phù hợp → Phỏng vấn → Offer / Từ chối)
- [x] Ghi chú nội bộ cho từng ứng viên
- [x] Gửi email mời phỏng vấn / thư từ chối (mẫu email)
- [x] (Tùy chọn) Tìm kiếm hồ sơ ứng viên công khai

### 5.4 Dashboard
- [x] Thống kê: số tin đang tuyển, lượt xem, số đơn, tỷ lệ chuyển đổi theo trạng thái
- [x] Biểu đồ số đơn theo thời gian

---

## 6. Chức năng Admin

### 6.1 Dashboard
- [x] Tổng quan: số người dùng (theo role), số công ty, số job, số đơn ứng tuyển
- [x] Biểu đồ tăng trưởng theo ngày/tháng
- [x] Danh sách việc cần xử lý (job chờ duyệt, công ty chờ xác minh, báo cáo mới)

### 6.2 Quản lý người dùng
- [x] Danh sách + tìm kiếm + lọc theo role/trạng thái
- [x] Xem chi tiết, khóa/mở khóa tài khoản
- [x] Tạo tài khoản admin khác (super admin)

### 6.3 Kiểm duyệt
- [x] Duyệt / từ chối tin tuyển dụng (kèm lý do)
- [x] Xác minh / từ chối công ty
- [x] Xử lý báo cáo vi phạm (ẩn tin, cảnh cáo, khóa tài khoản)

### 6.4 Danh mục & cấu hình
- [x] CRUD ngành nghề, kỹ năng, tỉnh/thành
- [x] Quản lý banner/trang tĩnh (Giới thiệu, Điều khoản, Chính sách bảo mật)
- [x] Cấu hình hệ thống (thời hạn tin mặc định, giới hạn upload…)
- [x] Xem audit log

---

## 7. Giao diện (Frontend)

- [x] Thiết kế wireframe các trang chính — `docs/so-do-trang.md`
- [x] Layout công khai: Header, Footer, trang chủ (ô tìm kiếm, ngành nổi bật, việc mới, công ty hàng đầu)
- [x] Layout dashboard riêng cho Candidate / Employer / Admin (sidebar)
- [x] Route guard theo role, trang 403/404
- [x] Form validation (React Hook Form + Zod)
- [x] Rich text editor cho mô tả công việc
- [x] Responsive mobile
- [x] Toast thông báo, loading skeleton, empty state
- [x] SEO cơ bản cho trang job/công ty (title, meta, slug thân thiện)

---

## 8. Bảo mật & chất lượng

- [x] Validate DTO (class-validator), chống SQL injection/XSS (sanitize rich text)
- [x] Kiểm tra quyền sở hữu tài nguyên (NTD chỉ sửa job của công ty mình, ứng viên chỉ xem đơn của mình)
- [x] Bảo vệ file CV: chỉ chủ sở hữu và NTD nhận đơn mới truy cập được (signed URL)
- [x] Helmet, CORS, rate limit
- [x] Logging + xử lý lỗi tập trung
- [x] Unit test service quan trọng (auth, application, job)
- [x] E2E test các luồng chính (đăng ký → đăng tin → duyệt → ứng tuyển → cập nhật trạng thái) _(11/11 pass – 08/10/2026)_

---

## 9. Triển khai

- [x] Dockerfile cho api và web
- [x] CI (GitHub Actions): lint + test + build
- [ ] Deploy: API + SQL Server trên VPS (Windows/Linux) hoặc Azure SQL Database; web trên Vercel/Netlify _(hướng dự án sinh viên: DigitalOcean qua GitHub Student Pack – hướng dẫn `docs/trien-khai-sinh-vien.md`, script `deploy/setup-vps.sh`; chờ tạo VPS)_
- [ ] Cấu hình domain, HTTPS _(tên miền miễn phí từ Student Pack; Caddy tự cấp HTTPS)_
- [ ] Backup database định kỳ _(trên VPS: `setup-vps.sh` tự đặt cron backup 2:00 hằng ngày)_

---

## 10. Lộ trình (milestones)

| Giai đoạn | Nội dung | Thời gian ước tính |
|---|---|---|
| **M1** | Mục 0–3: khởi tạo, database, auth | 1–2 tuần |
| **M2** | Mục 5.1–5.2 + 6.3: NTD đăng tin, admin duyệt | 2 tuần |
| **M3** | Mục 4.1–4.3: ứng viên tìm việc & ứng tuyển | 2 tuần |
| **M4** | Mục 5.3–5.4: NTD quản lý ứng viên, dashboard | 1–2 tuần |
| **M5** | Mục 6 còn lại: admin dashboard, quản lý user, danh mục | 1 tuần |
| **M6** | Mục 4.4: lưu job, job alert, thông báo, email | 1 tuần |
| **M7** | Mục 7–9: hoàn thiện UI, test, bảo mật, deploy | 1–2 tuần |

**MVP** = M1 → M3 (đăng ký, đăng tin, duyệt tin, tìm việc, ứng tuyển).

---

## 11. Ý tưởng mở rộng (sau MVP)

- [x] Gợi ý việc làm phù hợp dựa trên kỹ năng ứng viên — trang "Việc làm gợi ý" (chấm điểm + nhận xét AI Claude)
- [x] Tạo CV online từ mẫu, xuất PDF _(3 mẫu, pdfmake; lưu thẳng vào "CV của tôi")_
- [x] Chat giữa NTD và ứng viên _(theo đơn ứng tuyển, NTD nhắn trước, realtime SSE)_
- [x] Gói dịch vụ trả phí cho NTD (tin nổi bật, tìm hồ sơ) + thanh toán _(thanh toán giả lập: admin xác nhận chuyển khoản)_
- [x] Đánh giá công ty _(admin duyệt, chủ công ty phản hồi)_
- [x] Chỉ số phản hồi của NTD (tỉ lệ, thời gian TB, nhãn "⚡ Phản hồi nhanh", bộ lọc, nhắc hồ sơ chờ > 3 ngày)
- [x] Ứng tuyển 1 chạm (CV mặc định; chưa có CV → tự tạo từ hồ sơ)
- [x] Hỗ trợ khách hàng: trợ lý tự động (AI Claude / FAQ) trả lời trước, chuyển nhân viên (admin) chat trực tiếp
- [x] AI sàng lọc CV: điểm phù hợp, đối chiếu yêu cầu, điểm mạnh/thiếu, câu hỏi phỏng vấn; chấm hàng loạt; giới hạn lượt/ngày
- [x] Ứng viên kiểm tra CV với JD bằng AI: % tương thích, việc cần cải thiện, gợi ý viết lại CV, từ khoá thiếu; cache 24h; giới hạn lượt/ngày
- [ ] Chạy `scripts\cap-nhat-db.cmd` để tạo bảng `cv_screenings`, `cv_job_checks`
- [ ] Đa ngôn ngữ (Việt / Anh)
