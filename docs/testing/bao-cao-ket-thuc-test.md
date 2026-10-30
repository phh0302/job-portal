# Báo cáo kết thúc vòng test – JobPortal

> Theo *Quy trình tester – Bước 6*. Chi tiết từng TC: [`job-portal-testcases.xlsx`](job-portal-testcases.xlsx) · lỗi: [`bug-report.md`](bug-report.md).

**Đề xuất: PHÁT HÀNH** – đạt đủ tiêu chí kết thúc; không còn bug đang mở; rủi ro còn lại thấp và đã nêu ở mục 5.

## 1. Phạm vi & bản build

| Mục | Nội dung |
|---|---|
| Thời gian | 29/10/2026 – 30/10/2026 |
| Bản build | Bắt đầu `main @ 968dc5f`; kết thúc nhánh `fix/qa-round4` (đã gồm bản sửa BUG-01…16) |
| Môi trường | Windows · web `localhost:5173` (Vite) · API `localhost:3000` · SQL Server 2022 trong Docker · trình duyệt Chromium tích hợp của Claude desktop · chưa có `ANTHROPIC_API_KEY` |
| Loại test | Thủ công trên giao diện; phân quyền/biên/giới hạn qua API bằng token từng vai trò; responsive 360px; unit + E2E tự động |
| Người test | Claude |

## 2. Số liệu

**Theo ưu tiên**

| Ưu tiên | Số TC | Đã chạy | Pass | Fail | Blocked | Chưa chạy | % đã chạy | % Pass / đã chạy |
|---|---|---|---|---|---|---|---|---|
| P0 | 151 | 151 | 151 | 0 | 0 | 0 | 100% | 100% |
| P1 | 172 | 172 | 169 | 0 | 3 | 0 | 100% | 98,3% |
| P2 | 120 | 0 | 0 | 0 | 0 | 120 | 0% | – |
| **Tổng** | **443** | **323** | **320** | **0** | **3** | **120** | **72,9%** | **99,1%** |

**Theo module** (P2 chưa chạy nên % đã chạy dưới 100%)

| Module | Số TC | Đã chạy | Pass | Blocked | Chưa chạy (P2) |
|---|---|---|---|---|---|
| Xác thực | 44 | 43 | 43 | 0 | 1 |
| Ứng viên | 146 | 111 | 111 | 0 | 35 |
| Nhà tuyển dụng | 114 | 74 | 74 | 0 | 40 |
| Admin | 71 | 47 | 47 | 0 | 24 |
| Hỗ trợ (chung) | 15 | 5 | 5 | 0 | 10 |
| Quy tắc trạng thái | 24 | 24 | 24 | 0 | 0 |
| Phi chức năng | 29 | 19 | 16 | 3 | 10 |

**Tự động (30/10/2026):** API unit 29 suite / 163 test Pass · E2E 11/11 Pass · web lint 0 lỗi · web build OK.
**Regression sau đợt sửa cuối:** smoke 5/5 + P0 đăng tin, công ty, duyệt tin, tìm việc, ứng tuyển – Pass (sheet *Lần chạy*).

## 3. Tiêu chí kết thúc

| Tiêu chí | Yêu cầu | Kết quả | Đạt |
|---|---|---|---|
| P0 đã chạy / Pass | 100% / ≥ 95% | 100% / 100% | ✔ |
| P1 đã chạy | ≥ 90% | 100% (169 Pass, 3 Blocked) | ✔ |
| Bug Critical/High đang mở | 0 | 0 | ✔ |
| Bug Medium đang mở | PO chấp nhận | 0 | ✔ |

## 4. Bug

| Mức độ | Số lượng | Đã sửa + retest | Đóng (đúng thiết kế) | Đang mở |
|---|---|---|---|---|
| Critical | 0 | – | – | 0 |
| High | 2 (BUG-01, 14) | 2 | – | 0 |
| Medium | 6 (BUG-02, 03, 07, 08, 11, 16) | 6 | – | 0 |
| Low | 8 (BUG-04, 05, 06, 09, 10, 12, 13, 15) | 7 | 1 (BUG-10) | 0 |
| **Tổng** | **16** | **15** | **1** | **0** |

Ghi nhận: **OBS-01** – 2 lần làm mới phiên đồng thời với cùng refresh token đều thành công (chưa phải lỗi chức năng). Câu hỏi PO: Q-01 (giữ hiện ngày sinh) và Q-02 (đã làm tìm không dấu) – đã đóng.

## 5. Độ phủ yêu cầu & rủi ro còn lại

- **Độ phủ (RTM, 66 mã yêu cầu):** 62/66 (94%) có ít nhất 1 TC Pass; 27/66 phủ toàn bộ TC (phần còn lại chỉ thiếu TC P2). Chưa có TC Pass: EMP-11 (toàn P2), §6.5 (P2), §6.2 hiệu năng và §6.6 tương thích (Blocked).
- **Rủi ro còn lại:**
  - TC-PERF-001 (p95 < 500 ms với 50.000 tin) chưa đo – cần script sinh dữ liệu + k6. Rủi ro: chậm khi dữ liệu lớn.
  - TC-REL-002 (gửi lại email lỗi) chưa thử với SMTP sai – cơ chế đã có unit test `mail-queue.worker.spec`.
  - TC-COMP-001 chỉ thử trên Chromium – nên chạy smoke trên Firefox, Safari/iOS trước khi công bố rộng.
  - OBS-01 – nên sửa nếu yêu cầu bảo mật phiên chặt.
  - 120 TC P2 chưa chạy (tính năng phụ, giao diện chi tiết).
  - Tính năng AI (gợi ý, kiểm tra CV) chỉ test nhánh không có API key.

## 6. Bài học

- Lỗi dễ lọt nhất nằm ở **ranh giới web ↔ API**: web gửi chuỗi rỗng / chuỗi số (BUG-14), lỗi dạng khác của body-parser (BUG-11), ràng buộc chỉ có ở một phía (BUG-12). Nên thêm E2E gửi đúng payload của form.
- **Cache phía client** cần xoá khi đổi người dùng (BUG-16); thêm TC "đăng xuất A → đăng nhập B trong 60 giây" vào bộ P1.
- Nên bổ sung TC: ô chọn "Tất cả" ở mọi form có select tuỳ chọn; thông báo lỗi tiếng Việt khi gọi API với kiểu dữ liệu sai (hiện `salaryMin: "abc"` trả câu tiếng Anh – chỉ gặp khi gọi API trực tiếp).
- Môi trường: SQL Server trong Docker cần `TZ` (BUG-03); script `.cmd` một-chạm giúp giả lập hết hạn token / lấy link email nhanh.

## 7. Dữ liệu test phát sinh

Tài khoản `qa.uv64`, `qa.ntd13` (+ công ty "QA Company 13"); tin #3005 "QA Regression 30/10" (đã đóng, có đơn #2004 của uv1 – Phù hợp), #3006 (bị từ chối), #3007 của qa.ntd12 (nháp); email test trong outbox. Dọn bằng seed lại DB nếu cần.
