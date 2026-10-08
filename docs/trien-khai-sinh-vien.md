# Đưa JobPortal lên Internet – hướng dự án sinh viên (VPS + tên miền miễn phí)

Mục tiêu: có một địa chỉ thật dạng `https://jobportal-tenban.me`, chạy bản **trình diễn** (dữ liệu demo), chi phí gần như 0đ nhờ ưu đãi sinh viên.

```
Trình duyệt ──HTTPS──▶ Caddy (tự cấp chứng chỉ) ──▶ web (Nginx) ──/api──▶ api (NestJS) ──▶ SQL Server
                       └──────────────── tất cả chạy bằng Docker trên 1 VPS ────────────────┘
```

> Ưu đãi (số tiền, thời hạn, nhà cung cấp tên miền) thay đổi theo thời gian – hãy xem trang GitHub Education khi đăng ký.

---

## Bước 0 – Chuẩn bị trên máy bạn (Windows)

1. Chạy `scripts\cap-nhat-db.cmd` để **tạo file migration** cho các tính năng mới (server chỉ *chạy* migration, không tự tạo).
   Kiểm tra thư mục `api\src\database\migrations` có file mới nhất.
2. Chạy test lần cuối: `scripts\chay-test-e2e.cmd` → phải **11/11 pass**.
3. Không bao giờ đưa file `.env` lên GitHub (đã có sẵn trong `.gitignore`).

## Bước 1 – Đăng ký GitHub Student Developer Pack

1. Tạo tài khoản GitHub (nếu chưa có), thêm **email trường** vào tài khoản.
2. Vào <https://education.github.com/pack> → *Get student benefits* → chụp thẻ sinh viên / giấy xác nhận.
3. Chờ duyệt (vài giờ đến vài ngày). Khi được duyệt, mở trang Pack để nhận:
   - **DigitalOcean**: tín dụng dùng thuê VPS.
   - **Tên miền miễn phí 1 năm** (ví dụ `.me` qua Namecheap, hoặc nhà cung cấp khác đang có trong Pack).

## Bước 2 – Đưa mã nguồn lên GitHub (repo công khai)

Dễ nhất bằng **GitHub Desktop** (<https://desktop.github.com>):
*File → Add local repository* → chọn `D:\job-portal` → *Commit to main* (ghi "Phiên bản đầu") → *Publish repository* → **bỏ tích "Keep this code private"** (repo công khai – tiện nộp đồ án, giảng viên xem được).

> Repo công khai: ai cũng đọc được mã nguồn, nên **tuyệt đối không commit** file `.env`, `deploy/.env.prod`, thư mục `uploads/`, `backups/` (đã chặn sẵn trong `.gitignore`). Bật *GitHub → Settings → Emails → Keep my email addresses private* để email cá nhân không hiện trong lịch sử commit.

Hoặc dòng lệnh (PowerShell tại `D:\job-portal`):
```powershell
git add -A
git commit -m "Phiên bản đầu"
git branch -M main
git remote add origin https://github.com/<ten-ban>/job-portal.git
git push -u origin main
```

## Bước 3 – Tạo VPS trên DigitalOcean

1. Kích hoạt ưu đãi DigitalOcean từ trang Pack → đăng nhập DigitalOcean.
2. *Create → Droplets*:
   - **Region**: Singapore (gần Việt Nam nhất).
   - **Image**: Ubuntu 24.04 LTS (x64).
   - **Size**: Basic → Regular → **4 GB RAM / 2 vCPU** (khoảng 24 USD/tháng, trừ vào tín dụng).
     ⚠️ Không chọn gói 2 GB: SQL Server yêu cầu tối thiểu 2 GB RAM *thật*, máy 2 GB thường báo thiếu và không khởi động.
   - **Authentication**: chọn *Password* (đặt mật khẩu mạnh) – hoặc SSH key nếu bạn đã quen.
   - Hostname: `jobportal`.
3. Tạo xong, ghi lại **địa chỉ IP** của droplet (vd `128.199.x.x`).

## Bước 4 – Lấy tên miền và trỏ về VPS

1. Nhận tên miền miễn phí từ Pack (vd `jobportal-tenban.me`).
2. Vào trang quản lý DNS của tên miền (Namecheap: *Domain List → Manage → Advanced DNS*), thêm:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | IP của VPS | Automatic |
| A Record | `www` | IP của VPS | Automatic |

3. Chờ 5–30 phút. Kiểm tra trên Windows: `nslookup jobportal-tenban.me` → phải ra đúng IP VPS.

## Bước 5 – Cài đặt trên VPS (1 lệnh)

Mở PowerShell trên máy bạn:
```powershell
ssh root@<IP-VPS>
```
Trên VPS:
```bash
apt-get update && apt-get install -y git
git clone https://github.com/<ten-ban>/job-portal.git
cd job-portal
sudo bash deploy/setup-vps.sh
```
> Repo công khai nên `git clone` không cần mật khẩu. (Nếu sau này chuyển sang riêng tư: dùng **Personal access token** làm mật khẩu.)

Script sẽ hỏi: tên miền, email của bạn, email admin, có tạo dữ liệu demo không (**chọn Y**). Sau đó tự làm:
- tạo swap, bật tường lửa (chỉ mở 22, 80, 443), cài Docker;
- sinh **mật khẩu ngẫu nhiên** cho database, khoá JWT, tài khoản admin (lưu ở `/root/jobportal-admin.txt`);
- build và chạy toàn bộ hệ thống, tự chạy migration + seed;
- đặt lịch **backup hằng ngày 2:00**.

Xem mật khẩu admin: `cat /root/jobportal-admin.txt`

## Bước 6 – Kiểm tra sau khi chạy

- [ ] `https://<tên-miền>` mở được, có ổ khoá HTTPS; `http://` và `www.` tự chuyển về `https://<tên-miền>`.
- [ ] Đăng nhập admin bằng mật khẩu trong file → **đổi mật khẩu ngay** → `rm /root/jobportal-admin.txt`.
- [ ] Đăng nhập `uv1@demo.local` / `ntd1@demo.local` (mật khẩu `Demo@123`) → tìm việc, ứng tuyển, nhắn tin được.
- [ ] Tạo CV online → tải PDF được.
- [ ] `https://<tên-miền>/api/health` trả về trạng thái ok.
- [ ] `https://<tên-miền>/api/docs` **không** mở được (Swagger tắt trên production).

## Bước 7 – Thiết lập "dự án sinh viên"

Đăng nhập admin → **Trang & cấu hình**:
- **Thông báo chung**: `Đồ án sinh viên – dữ liệu demo, không phải dịch vụ tuyển dụng thật. Tài khoản thử: uv1@demo.local / ntd1@demo.local – mật khẩu Demo@123`
- **Thanh toán – Ngân hàng / Số tài khoản / Chủ tài khoản**: để thông tin minh hoạ (thanh toán là **giả lập**, admin tự bấm xác nhận).
- Trang **Giới thiệu**: ghi tên đề tài, trường, thành viên nhóm, giảng viên hướng dẫn, link GitHub.
- Trang **Chính sách bảo mật**: ghi rõ đây là bản trình diễn, khuyên người dùng **không nhập thông tin cá nhân thật**, liên hệ để xoá tài khoản.

Tuỳ chọn:
- Email thật (xác minh tài khoản, quên mật khẩu): đăng ký gói miễn phí của Brevo/Mailgun → điền `SMTP_*` trong `deploy/.env.prod` → chạy lệnh cập nhật ở Bước 8.
- Nhận xét AI ở trang "Việc làm gợi ý": điền `ANTHROPIC_API_KEY`.

## Bước 8 – Vận hành hằng ngày

Trên VPS, trong thư mục `job-portal`:

```bash
# Biến tắt cho gọn (thêm vào ~/.bashrc nếu muốn)
alias jp='docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod'

jp ps                    # trạng thái các container
jp logs -f api           # xem log API (Ctrl+C để thoát)
git pull && jp up -d --build    # cập nhật code mới (sau khi push từ máy bạn)
jp restart api           # khởi động lại API
bash scripts/backup/backup-docker.sh   # backup ngay
ls deploy/backups        # các bản backup (giữ 14 ngày)
```

Quy trình cập nhật tính năng: sửa code trên máy → chạy `cap-nhat-db.cmd` (nếu có đổi database) → test → commit & push → trên VPS `git pull && jp up -d --build` (migration tự chạy).

## Chi phí & thời hạn

| Khoản | Chi phí |
|---|---|
| VPS 4 GB | Trừ vào tín dụng DigitalOcean của Pack |
| Tên miền | Miễn phí năm đầu (gia hạn năm sau có phí) |
| HTTPS | Miễn phí (Let's Encrypt qua Caddy) |
| Email, AI | Tuỳ chọn |

Khi hết tín dụng / hết dùng: **Destroy droplet** để không bị tính tiền (nhớ tải các file trong `deploy/backups` về trước).

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Trình duyệt báo không an toàn / không có HTTPS | DNS chưa trỏ đúng IP hoặc chưa cập nhật xong → kiểm tra `nslookup`, đợi rồi `jp restart caddy`; xem `jp logs caddy` |
| `sqlserver` khởi động lại liên tục | Thường do thiếu RAM: `jp logs sqlserver`; nâng droplet lên 4 GB (*Resize*) |
| API báo không kết nối được database | Đợi SQL Server khởi động (1–2 phút lần đầu); `jp logs api` |
| Build web/api bị "Killed" | Thiếu RAM khi build → kiểm tra swap: `swapon --show` |
| Quên mật khẩu admin | Dùng "Quên mật khẩu" (cần SMTP) hoặc nhờ Claude hướng dẫn đặt lại bằng lệnh |
