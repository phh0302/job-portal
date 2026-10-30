# Báo cáo kết thúc vòng test – JobPortal

> Theo *Quy trình tester – Bước 6*. Chi tiết từng TC: [`job-portal-testcases.xlsx`](job-portal-testcases.xlsx) · lỗi: [`bug-report.md`](bug-report.md).

**Đề xuất: PHÁT HÀNH** – đạt đủ tiêu chí kết thúc; không còn bug đang mở; rủi ro còn lại thấp và đã nêu ở mục 5.

## 1. Phạm vi & bản build

| Mục | Nội dung |
|---|---|
| Thời gian | 29/10/2026 – 30/10/2026 |
| Bản build | Bắt đầu `main @ 968dc5f`; P0/P1 kết thúc ở `main @ cc07e22` (BUG-01…16); P2 kết thúc ở nhánh `fix/qa-p2-luot1` (thêm BUG-17…20) |
| Môi trường | Windows · web `localhost:5173` (Vite) · API `localhost:3000` · SQL Server 2022 trong Docker · trình duyệt Chromium tích hợp của Claude desktop · chưa có `ANTHROPIC_API_KEY` |
| Loại test | Thủ công trên giao diện; phân quyền/biên/giới hạn qua API bằng token từng vai trò; responsive 360px; unit + E2E tự động; script `.cmd` cho dữ liệu cần sửa DB, sao lưu/khôi phục, chạy thử bản production |
| Người test | Claude |

## 2. Số liệu

**Theo ưu tiên**

| Ưu tiên | Số TC | Đã chạy | Pass | Fail | Blocked | Chưa chạy | % đã chạy | % Pass / đã chạy |
|---|---|---|---|---|---|---|---|---|
| P0 | 151 | 151 | 151 | 0 | 0 | 0 | 100% | 100% |
| P1 | 172 | 172 | 169 | 0 | 3 | 0 | 100% | 98,3% |
| P2 | 120 | 120 | 116 | 0 | 1 (+3 Skip) | 0 | 100% | 96,7% |
| **Tổng** | **443** | **443** | **436** | **0** | **4 (+3 Skip)** | **0** | **100%** | **98,4%** |

Skip: 3 TC AI cần `ANTHROPIC_API_KEY` (CAN13-005/007/008) – bỏ qua theo quyết định PO 30/10/2026.

**Theo module**

| Module | Số TC | Pass | Blocked | Skip | Fail |
|---|---|---|---|---|---|
| Xác thực | 44 | 44 | 0 | 0 | 0 |
| Ứng viên | 146 | 143 | 0 | 3 | 0 |
| Nhà tuyển dụng | 114 | 114 | 0 | 0 | 0 |
| Admin | 71 | 71 | 0 | 0 | 0 |
| Hỗ trợ (chung) | 15 | 15 | 0 | 0 | 0 |
| Quy tắc trạng thái | 24 | 24 | 0 | 0 | 0 |
| Phi chức năng | 29 | 25 | 4 | 0 | 0 |

Blocked: PERF-001 (50.000 tin + k6), PERF-002 (Lighthouse trên bản production), REL-002 (SMTP sai), COMP-001 (trình duyệt khác Chromium).

**Tự động (30/10/2026):** API unit 29 suite / 163 test Pass · E2E 11/11 Pass · web lint 0 lỗi · web build OK.
**Regression sau đợt sửa P0/P1:** smoke 5/5 + P0 đăng tin, công ty, duyệt tin, tìm việc, ứng tuyển – Pass (sheet *Lần chạy*). Bản sửa BUG-17…20 trong P2 đã retest đúng TC và chạy unit test module liên quan; nên chạy lại `scripts/chay-test-tu-dong.cmd` sau khi merge.
**Kiểm tra vận hành (P2):** sao lưu → RESTORE VERIFYONLY → khôi phục DB tạm, 10 bảng chính khớp số dòng; bản production tắt Swagger (`/api/docs` 404) và từ chối khoá JWT mặc định.

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
| Medium | 8 (BUG-02, 03, 07, 08, 11, 16, 17, 19) | 8 | – | 0 |
| Low | 10 (BUG-04, 05, 06, 09, 10, 12, 13, 15, 18, 20) | 9 | 1 (BUG-10) | 0 |
| **Tổng** | **20** | **19** | **1** | **0** |

Lỗi tìm thấy trong P2: BUG-17 (tắt thông báo việc làm báo lỗi), BUG-18 (API tắt → trang tin báo "không tìm thấy"), BUG-19 (trợ lý hỗ trợ trả lời sai chủ đề), BUG-20 (phân trang thiếu nhãn ARIA).

Ghi nhận: **OBS-01** – 2 lần làm mới phiên đồng thời với cùng refresh token đều thành công (chưa phải lỗi chức năng). **OBS-02** – một số câu lỗi validate bằng tiếng Anh khi gọi API trực tiếp (giao diện đã chặn trước). Câu hỏi PO: Q-01 (giữ hiện ngày sinh) và Q-02 (đã làm tìm không dấu) – đã đóng.

## 5. Độ phủ yêu cầu & rủi ro còn lại

- **Độ phủ (RTM, 66 mã yêu cầu):** 66/66 đã chạy hết TC; 62/66 (94%) phủ toàn bộ (mọi TC Pass). 4 mã còn thiếu: CAN-13 (3 TC AI Skip), §6.2 hiệu năng (PERF-001/002 Blocked), §6.3 (REL-002 Blocked), §6.6 tương thích (COMP-001 Blocked).
- **Rủi ro còn lại:**
  - TC-PERF-001 (p95 < 500 ms với 50.000 tin) chưa đo – cần script sinh dữ liệu + k6. Rủi ro: chậm khi dữ liệu lớn.
  - TC-REL-002 (gửi lại email lỗi) chưa thử với SMTP sai – cơ chế đã có unit test `mail-queue.worker.spec`.
  - TC-COMP-001 chỉ thử trên Chromium – nên chạy smoke trên Firefox, Safari/iOS trước khi công bố rộng.
  - TC-PERF-002 (LCP < 2,5 s) chưa đo – cần build production web + API và chạy Lighthouse.
  - OBS-01 – nên sửa nếu yêu cầu bảo mật phiên chặt.
  - OBS-02 – câu lỗi API tiếng Anh, chỉ ảnh hưởng khi gọi API trực tiếp.
  - Tính năng AI (nhận xét gợi ý, kiểm tra CV, chấm CV, trợ lý hỗ trợ) chỉ test chế độ không có API key (so khớp từ khoá / FAQ); 3 TC cần key đã Skip.

## 6. Bài học

- Lỗi dễ lọt nhất nằm ở **ranh giới web ↔ API**: web gửi chuỗi rỗng / chuỗi số (BUG-14), lỗi dạng khác của body-parser (BUG-11), ràng buộc chỉ có ở một phía (BUG-12). Nên thêm E2E gửi đúng payload của form.
- **Cache phía client** cần xoá khi đổi người dùng (BUG-16); thêm TC "đăng xuất A → đăng nhập B trong 60 giây" vào bộ P1.
- Nên bổ sung TC: ô chọn "Tất cả" ở mọi form có select tuỳ chọn; thông báo lỗi tiếng Việt khi gọi API với kiểu dữ liệu sai (hiện `salaryMin: "abc"` trả câu tiếng Anh – chỉ gặp khi gọi API trực tiếp).
- **Trạng thái gộp theo thời gian:** PATCH chỉ gửi 1 trường vẫn bị trộn `undefined` (BUG-17); trợ lý ghép câu hỏi cũ từ nhiều giờ trước (BUG-19) – nên có unit test cho mọi chỗ "trộn dữ liệu cũ + mới".
- Lỗi hạ tầng (API tắt, 5xx không có nội dung) cần câu báo chung thay vì câu mặc định của từng trang (BUG-18).
- Nên sửa 2 TC cho khớp thiết kế: ADM09-002 (không có nút Xóa trang, chỉ ẩn) và ALL01-014 (không có nút "Thử lại" riêng, nội dung được giữ để Gửi lại).
- Môi trường: SQL Server trong Docker cần `TZ` (BUG-03); script `.cmd` một-chạm giúp giả lập hết hạn token / lấy link email / sửa dữ liệu nhanh; bộ đếm giới hạn tần suất nằm trong bộ nhớ API nên khởi động lại API sẽ đặt lại.

## 7. Dữ liệu test phát sinh

- Tài khoản: `qa.uv64`, `qa.ntd13` (+ công ty "QA Company 13"), `qa.ntd02`, `qa.ntd14` (đã rời / bị gỡ khỏi Sao Việt).
- Tin: #3005 "QA Regression 30/10" (đóng, đơn #2004 của uv1 – Nhận offer), #3006 (bị từ chối), #3007 của qa.ntd12 (đóng), #3008 "QA – Kiểm tra kỹ năng CV" (đóng, có đơn của uv1); tin #3004 đang nổi bật tới 13/11.
- Gói dịch vụ: thêm đơn đã thanh toán cho Sao Việt và QA NTD 01; các đơn huỷ thử.
- uv2 thêm 3 CV test; qa.uv01 có ảnh đại diện và ngày sinh; đánh giá #1 của uv1 đã bị gỡ; vài cuộc hỗ trợ và báo cáo vi phạm của tài khoản QA; email test trong outbox.
- Đã khôi phục: cấu hình hệ thống, giá gói, vai trò ntd3, ngày tạo đơn #2005/#2006, các lời mời giả. Dọn hết bằng seed lại DB nếu cần.
