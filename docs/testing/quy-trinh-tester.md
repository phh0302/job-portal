# Quy trình tạo & thực thi test case – JobPortal

> Tài liệu dành cho tester. Đầu vào chính: [`docs/PRD.md`](../PRD.md) (mã yêu cầu AUTH/CAN/EMP/ADM, quy tắc §5, phi chức năng §6) và [`docs/so-do-trang.md`](../so-do-trang.md) (sơ đồ trang).
> Bộ test case đầy đủ (307 TC): [`job-portal-testcases.xlsx`](job-portal-testcases.xlsx) — mẫu rút gọn: [`testcase-mau.csv`](testcase-mau.csv).

```
 ① Phân tích yêu cầu → ② Lập kế hoạch → ③ Thiết kế test case → ④ Chuẩn bị môi trường & dữ liệu
                                                                          ↓
                       ⑥ Báo cáo & đóng vòng test ← ⑤ Thực thi, báo bug, retest, regression
```

Mỗi bước có **Đầu vào → Việc cần làm → Đầu ra → Điều kiện chuyển bước**.

---

## Bước 1 – Phân tích yêu cầu

**Đầu vào:** PRD §3 (phân quyền), §4 (bảng yêu cầu), §5 (quy tắc nghiệp vụ), §6 (phi chức năng); sơ đồ trang.

**Việc cần làm**
1. Đọc từng dòng yêu cầu, ghi lại vào **ma trận truy vết** (sheet `RTM`): mã yêu cầu · mô tả ngắn · mức ưu tiên (P0/P1/P2) · vai trò liên quan · trang/API liên quan.
2. Với mỗi yêu cầu, gạch ra **các điểm kiểm thử** theo checklist:
   - [ ] Luồng chính (happy path)
   - [ ] Validate dữ liệu nhập (bắt buộc, định dạng, độ dài)
   - [ ] Giá trị biên (xem bảng giới hạn §5.5)
   - [ ] Phân quyền: Khách / Ứng viên / NTD (Chủ, Thành viên) / Admin / Super admin
   - [ ] Truy cập dữ liệu của người khác → phải trả **404**, không tiết lộ dữ liệu
   - [ ] Chuyển trạng thái hợp lệ & không hợp lệ (§5.1, §5.2, §5.3)
   - [ ] Thông báo trong web + email (nếu có)
   - [ ] Giao diện: mobile 360px, thông báo lỗi tiếng Việt rõ ràng, trạng thái đang tải
3. Ghi **câu hỏi** cho chỗ PRD mơ hồ vào sheet `Câu hỏi` (mã yêu cầu · câu hỏi · người trả lời · trả lời). Không đoán kết quả mong đợi.

**Đầu ra:** RTM đầy đủ các mã yêu cầu; danh sách câu hỏi.
**Chuyển bước khi:** mọi yêu cầu P0 đã có điểm kiểm thử, câu hỏi về P0 đã được trả lời.

---

## Bước 2 – Lập kế hoạch test

**Phạm vi & loại test**

| Loại | Ai làm | Công cụ / lệnh | Ghi chú |
|---|---|---|---|
| Unit test | Dev (đã có ~90 test) | `cd api && npm test` | Tester chỉ cần chạy để kiểm tra build |
| Test API | Tester | Swagger `http://localhost:3000/api/docs` (chỉ bật ở dev), Postman | Dùng để test phân quyền, validate, biên nhanh hơn UI |
| E2E tự động | Dev + Tester | `cd api && npm run test:e2e` (DB `job_portal_e2e`) | Luồng chính end-to-end |
| Test giao diện thủ công | Tester | Chrome, Edge, Firefox; DevTools chế độ mobile | Theo test case trong file mẫu |
| Bảo mật cơ bản | Tester | Postman, DevTools | Theo §6.1 |
| Hiệu năng | Tester/Dev | k6 hoặc JMeter (tùy chọn) | Mục tiêu p95 < 500 ms (§6.2) |

**Thứ tự ưu tiên module** (theo rủi ro – làm trước thì phát hiện lỗi nặng sớm):
1. Xác thực & phân quyền (AUTH, §3, §6.1)
2. Luồng tuyển dụng cốt lõi: đăng tin → duyệt → tìm → ứng tuyển → xử lý đơn (EMP-03..07, ADM-03, CAN-05..08)
3. Hồ sơ ứng viên & CV (CAN-01..04), công ty & xác minh (EMP-01, 02, ADM-04)
4. Admin: báo cáo vi phạm, người dùng, danh mục, cấu hình (ADM-05..11)
5. Tính năng phụ: lưu việc, theo dõi, job alert, gợi ý AI, đội tuyển dụng (CAN-09..13, EMP-08..11)

**Tiêu chí bắt đầu:** bản build chạy được, đã `migration:run` + `seed`, smoke test (Bước 4) đạt.
**Tiêu chí kết thúc (được phát hành):**
- 100% test case P0 đã chạy, ≥ 95% Pass; ≥ 90% test case P1 đã chạy.
- Không còn bug **Critical/High** đang mở.
- Bug Medium còn mở đã được PO chấp nhận và ghi trong báo cáo.

**Đầu ra:** kế hoạch (bảng trên + lịch theo tuần + người phụ trách từng module).

---

## Bước 3 – Thiết kế test case

### 3.1 Quy ước mã
`TC-<mã yêu cầu>-<số thứ tự 3 chữ số>` – ví dụ `TC-AUTH01-003`, `TC-EMP11-002`. Yêu cầu phi chức năng dùng `TC-SEC-…`, `TC-PERF-…`, `TC-UI-…`.

### 3.2 Cấu trúc một test case (cột trong `testcase-mau.csv`)
| Cột | Nội dung |
|---|---|
| Mã TC | theo quy ước trên |
| Mã yêu cầu | AUTH-01, EMP-11, §5.2… (để truy vết) |
| Module | Xác thực / Ứng viên / NTD / Admin / Phi chức năng |
| Tiêu đề | Ngắn, mô tả 1 tình huống: *"Đăng ký với mật khẩu 7 ký tự bị từ chối"* |
| Tiền điều kiện | Tài khoản, trạng thái dữ liệu cần có |
| Dữ liệu test | Giá trị cụ thể (không ghi "nhập email hợp lệ" mà ghi `uvtest01@demo.local`) |
| Các bước | Đánh số 1, 2, 3… mỗi bước một hành động |
| Kết quả mong đợi | Cụ thể, kiểm chứng được (thông báo gì, trạng thái gì, ai nhận email) |
| Ưu tiên | Bằng ưu tiên của yêu cầu (P0/P1/P2) |
| Loại | Chức năng / Validate / Biên / Phân quyền / Trạng thái / Bảo mật / UI |
| Kết quả thực tế · Trạng thái · Người test · Ngày · Mã bug | Điền khi chạy (Bước 5) |

**Nguyên tắc:** 1 test case = 1 mục tiêu kiểm tra; độc lập (không phụ thuộc test case trước nếu có thể); ai đọc cũng chạy lại được.

### 3.3 Kỹ thuật thiết kế – áp dụng vào dự án

**a) Phân vùng tương đương + giá trị biên** – dùng cho mọi ô nhập có giới hạn. Với giới hạn `[min, max]`, test các giá trị: `min-1`, `min`, `max`, `max+1`.

| Trường | Giới hạn (PRD) | Giá trị cần test |
|---|---|---|
| Mật khẩu | 8–64 ký tự, có chữ và số | 7 · 8 · 64 · 65 ký tự; chỉ chữ; chỉ số |
| Thư giới thiệu (CAN-07) | ≤ 3000 ký tự | 3000 · 3001 |
| CV (CAN-03) | PDF/DOC/DOCX, ≤ 5 MB, ≤ 5 CV | 5 MB · 5,1 MB; file .exe đổi đuôi thành .pdf; CV thứ 6 |
| Ảnh đại diện / logo / ảnh bìa | ≤ 2 MB / 2 MB / 3 MB, JPG/PNG/WEBP | đúng giới hạn · vượt 1 byte; file GIF |
| Kỹ năng hồ sơ | ≤ 30 | 30 · 31 |
| Ngành / kỹ năng của tin (EMP-03) | 1–3 ngành, ≤ 15 kỹ năng | 0 · 1 · 3 · 4 ngành; 15 · 16 kỹ năng |
| Hạn nộp | hôm nay … +90 ngày | hôm qua · hôm nay · +90 · +91 |
| Job alert (CAN-10) | ≤ 5 | alert thứ 5 · thứ 6 |
| Lời mời đội tuyển dụng (EMP-11) | ≤ 20 lời mời chờ, link 7 ngày | lời mời thứ 21; link ngày thứ 8 |
| Cấu hình admin (§5.5) | ví dụ 1–365 | 0 · 1 · 365 · 366 |

**b) Bảng chuyển trạng thái** – dùng cho §5.1 (tin), §5.2 (đơn), §5.3 (xác minh).
- Mỗi ô **✓** → 1 test case *chuyển hợp lệ*.
- Mỗi ô **trống** quan trọng → 1 test case *chuyển không hợp lệ* (phải bị chặn), ví dụ: Offer → Phỏng vấn, rút đơn khi đang Phỏng vấn, sửa tin đang Chờ duyệt.
- Kiểm tra kèm **tác dụng phụ**: thông báo, email, tin có hiện công khai không.

**c) Bảng quyết định / ma trận phân quyền** – dùng cho §3. Mỗi chức năng × mỗi vai trò = 1 ô cần kiểm tra:

| Chức năng | Khách | Ứng viên | NTD Chủ | NTD Thành viên | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Sửa hồ sơ công ty | 401 | 403 | ✓ | 403 | 403 |
| Mời đồng nghiệp | 401 | 403 | ✓ | 403 | 403 |
| Đăng tin / xử lý đơn | 401 | 403 | ✓ | ✓ | 403 |
| Duyệt tin | 401 | 403 | 403 | 403 | ✓ |
| Tạo admin | 401 | 403 | 403 | 403 | chỉ super admin |

Thêm test **IDOR**: đăng nhập `ntd2`, gọi API xem đơn/tin của công ty `ntd1` bằng id thật → phải **404**.

**d) Đoán lỗi (error guessing)** – các chỗ hay lỗi trong dự án này:
- Bấm nút 2 lần liên tiếp (ứng tuyển, gửi duyệt) → không tạo bản ghi trùng.
- Hai tab: đăng xuất ở tab 1, thao tác ở tab 2.
- Admin khóa tài khoản đang đăng nhập → request kế tiếp bị chặn (AUTH-07).
- Đổi mật khẩu → mọi thiết bị khác bị đăng xuất (AUTH-05).
- Link CV hết hạn sau 5 phút; mở link CV khi đã đăng xuất.
- Nội dung có `<script>` trong mô tả tin / thư giới thiệu → không chạy.
- Tiếng Việt có dấu trong tìm kiếm ("ke toan" tìm được "Kế toán"?).

### 3.4 Checklist rà soát test case (trước khi chạy)
- [ ] Mỗi yêu cầu P0/P1 trong RTM có ít nhất 1 test case luồng chính + 1 test case lỗi.
- [ ] Kết quả mong đợi lấy từ PRD, không lấy từ hành vi hiện tại của phần mềm.
- [ ] Dữ liệu test cụ thể, không trùng giữa các test case cần độc lập.
- [ ] Đã có người thứ hai đọc lại (peer review).

**Đầu ra:** file test case + RTM đã liên kết mã TC ↔ mã yêu cầu.

---

## Bước 4 – Chuẩn bị môi trường & dữ liệu

```bash
# tại thư mục gốc dự án
cd api && npm run migration:run && npm run seed && cd ..
npm run dev            # API http://localhost:3000, Web http://localhost:5173
```

**Tài khoản có sẵn** (mật khẩu theo PRD phụ lục):

| Vai trò | Email |
|---|---|
| Super admin | admin@jobportal.local (Admin@123) |
| NTD – chủ công ty | ntd1@demo.local, ntd2@demo.local (Demo@123) |
| NTD – thành viên công ty | ntd3@demo.local (Demo@123) |
| Ứng viên | uv1@demo.local, uv2@demo.local (Demo@123) |

**Dữ liệu tự tạo:** đặt tên có tiền tố `qa` (ví dụ `qa.uv01@test.local`, tin "QA – Kế toán 01") để dễ lọc và dọn. Chuẩn bị sẵn file: PDF 1 KB, PDF đúng 5 MB, PDF 5,1 MB, file .exe đổi đuôi .pdf, ảnh 2 MB / 3 MB.

**Email trong môi trường dev:** khi chưa cấu hình SMTP, nội dung email (kèm link xác minh, đặt lại mật khẩu, lời mời…) được **in ra cửa sổ terminal chạy API**; trạng thái gửi (đã gửi / lỗi / thử lại) xem ở **Admin → Hàng đợi email** (`/admin/emails`).

**Smoke test (≈ 10 phút, chạy mỗi bản build mới):**
1. Mở trang chủ, tìm việc theo từ khóa → có kết quả.
2. Đăng nhập lần lượt `uv1`, `ntd1`, `admin` → vào đúng trang của vai trò.
3. `uv1` mở 1 tin, ứng tuyển bằng CV có sẵn.
4. `ntd1` thấy đơn mới, chuyển sang "Phù hợp".
5. `ntd1` tạo tin, gửi duyệt → `admin` duyệt → tin hiện công khai.

Smoke test lỗi → trả build cho dev, **không** bắt đầu Bước 5.

---

## Bước 5 – Thực thi, báo bug, retest, regression

1. Chạy test case theo thứ tự ưu tiên ở Bước 2; điền **Kết quả thực tế, Trạng thái** (`Pass` / `Fail` / `Blocked` / `Skip`), người test, ngày.
2. Test case `Fail` → tạo bug, ghi mã bug vào cột *Mã bug*.

**Mẫu báo bug**
```
Mã: BUG-<số>            Liên quan: TC-xxx / mã yêu cầu
Tiêu đề: [Module] Hiện tượng – điều kiện   (vd: [Ứng tuyển] Nộp được thư giới thiệu 3001 ký tự)
Môi trường: dev / staging · trình duyệt + phiên bản · thiết bị
Tài khoản: uv1@demo.local
Các bước tái hiện: 1… 2… 3…
Kết quả thực tế:
Kết quả mong đợi: (trích PRD)
Bằng chứng: ảnh / video; với lỗi API: request, response, X-Request-Id
Mức độ (severity):   Ưu tiên (priority):
```

**Mức độ nghiêm trọng**

| Severity | Khi nào | Ví dụ trong dự án |
|---|---|---|
| Critical | Mất/lộ dữ liệu, lỗ hổng bảo mật, chặn luồng chính | NTD xem được CV ứng viên công ty khác; không đăng nhập được |
| High | Chức năng chính sai, không có cách khác | Không gửi duyệt được tin; đổi trạng thái đơn sai quy tắc |
| Medium | Chức năng phụ sai hoặc có cách khác | Job alert không gửi; lọc lương sai |
| Low | Giao diện, chính tả, trải nghiệm | Lệch layout ở 360px, sai chính tả |

**Vòng đời bug:** `New → Assigned → Fixed → Retest → Closed`, hoặc `Reopened` nếu còn lỗi; `Rejected` (không phải lỗi) / `Deferred` (để bản sau) cần ghi lý do.

**Retest:** chạy lại đúng test case đã Fail khi bug ở trạng thái Fixed.
**Regression:** sau mỗi đợt sửa, chạy lại: smoke test + toàn bộ test case P0 của module bị sửa + test case P0 của module phụ thuộc (ví dụ sửa *tin tuyển dụng* → chạy lại *tìm kiếm, ứng tuyển, duyệt tin*). Test case regression nên được chuyển dần sang E2E tự động.

---

## Bước 6 – Báo cáo & đóng vòng test

**Báo cáo cuối vòng** (1 trang):
- Phạm vi & bản build đã test, thời gian.
- Số liệu: tổng test case · đã chạy · Pass / Fail / Blocked, theo module và theo ưu tiên.
- Bug: tổng số theo severity, số còn mở, danh sách Critical/High còn mở (nếu có).
- Độ phủ yêu cầu: % mã yêu cầu trong RTM có test case đã Pass.
- Rủi ro còn lại và **đề xuất: Phát hành / Không phát hành**.
- Bài học: test case cần bổ sung, chỗ PRD cần làm rõ.

Sau mỗi bản phát hành: cập nhật test case theo thay đổi PRD, đánh dấu test case nào đã tự động hóa.

---

## Phụ lục A – Ma trận truy vết (RTM) mẫu

| Mã yêu cầu | Ưu tiên | Test case | Số TC | Đã chạy | Pass | Bug mở |
|---|:-:|---|:-:|:-:|:-:|---|
| AUTH-01 | P0 | TC-AUTH01-001 … 004 | 4 | | | |
| CAN-07 | P0 | TC-CAN07-001 … 003 | 3 | | | |
| §5.2 | P0 | TC-S52-001 … 003 | 3 | | | |
| EMP-11 | P2 | TC-EMP11-001 … 006 | 6 | | | |
| … | | | | | | |

## Phụ lục B – Ước lượng số test case

| Nhóm | Số yêu cầu | Ước lượng TC |
|---|:-:|:-:|
| Xác thực (AUTH-01..07) | 7 | 35–45 |
| Ứng viên (CAN-01..13) | 13 | 70–90 |
| Nhà tuyển dụng (EMP-01..11) | 11 | 60–80 |
| Admin (ADM-01..11) | 11 | 50–70 |
| Quy tắc trạng thái (§5.1–5.3) | 3 bảng | 30–40 |
| Phi chức năng (§6) | – | 25–35 |
| **Tổng** | | **≈ 270–360** |
