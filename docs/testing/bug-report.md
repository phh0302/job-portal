# Bug report – JobPortal

Danh sách lỗi phát hiện khi chạy test case thủ công. Mỗi lỗi theo mẫu ở *Test Plan – mục 7*; có thể chép nguyên khối sang GitHub Issues.
Kết quả chi tiết từng TC: [`job-portal-testcases.xlsx`](job-portal-testcases.xlsx) (sheet *Lần chạy*).

## Tổng hợp

| Mã | Tiêu đề | Mức độ | Ưu tiên | Trạng thái | TC liên quan |
|---|---|---|---|---|---|
| BUG-01 | [Hỗ trợ] Gửi câu hỏi cho trợ lý làm sập toàn trang | High | P1 | Fixed – đã retest | TC-ALL01-004 |
| BUG-02 | [Ứng tuyển 1 chạm] Hồ sơ trống hiện lỗi chung chung thay vì hướng dẫn | Medium | P2 | Fixed – đã retest | TC-CAN17-003 |
| BUG-03 | [Hệ thống] Thời gian do DB tạo lệch 7 giờ khi SQL Server chạy trong Docker | Medium | P1 | Fixed – đã retest | TC-CAN15-002, TC-EMP16-001 |
| BUG-04 | [Kiểm tra CV] Số lượt còn lại không cập nhật sau lỗi 429 / khi admin đổi giới hạn | Low | P3 | Fixed – đã retest | TC-CAN19-011 |
| BUG-05 | [Hỗ trợ] Phím Esc không đóng widget hỗ trợ | Low | P3 | Fixed – đã retest | (ngoài TC) |
| BUG-06 | [Admin] Thiếu trường lý do khi từ chối đánh giá → thông báo lẫn tiếng Anh | Low | P3 | Fixed – đã retest | TC-ADM12-004 |
| BUG-07 | [Đăng nhập] Đăng xuất rồi đăng nhập tài khoản vai trò khác bị đưa vào trang 403 | Medium | P1 | Fixed – đã retest | TC-AUTH02-002 |
| BUG-08 | [Khoá tài khoản] Người bị khoá không bị đăng xuất; trang hiện "chưa có dữ liệu" thay vì báo khoá | Medium | P2 | Fixed – đã retest | TC-AUTH07-001 |
| Q-01 | [Tìm hồ sơ] Ngày sinh ứng viên hiện cho NTD trước khi mở liên hệ | Câu hỏi PO | – | Cần làm rõ | TC-EMP14-010 |

Môi trường chung: Windows, web `localhost:5173` (Vite), API `localhost:3000`, SQL Server 2022 trong Docker (`jobportal-sqlserver`), trình duyệt tích hợp của Claude desktop (Chromium bản mới), chưa có `ANTHROPIC_API_KEY`. Bản build khi phát hiện: `main @ 968dc5f`. Bản sửa: commit `68f5816` (BUG-01…08), retest 29/10/2026 – tất cả Pass. Ngày test: 29/10/2026. Người test: Claude.

---

## BUG-01 – [Hỗ trợ] Gửi câu hỏi cho trợ lý làm sập toàn trang

- **Liên quan:** TC-ALL01-004 · yêu cầu ALL-01
- **Mức độ / Ưu tiên:** High / P1 – chức năng hỗ trợ khách hàng không dùng được trên Chrome mới, người dùng mất cả trang đang xem
- **Tài khoản:** qa.uv01@test.local (ứng viên)
- **Các bước tái hiện:**
  1. Đăng nhập ứng viên, mở bất kỳ trang nào (vd. `/jobs/nhan-vien-kinh-doanh-b2b-4e5mb`).
  2. Bấm nút hỗ trợ góc phải dưới.
  3. Gõ "Làm sao để đặt lại mật khẩu?" → Enter.
- **Kết quả thực tế:** API `POST /api/support/messages` trả 201 nhưng trang chuyển sang màn hình lỗi của React Router: `Unexpected Application Error! TypeError: destroy is not a function` (component `<Chat>`).
- **Kết quả mong đợi:** Câu hỏi và câu trả lời của trợ lý hiện trong widget (PRD ALL-01).
- **Nguyên nhân:** `web/src/components/support/SupportWidget.tsx` dòng 95: `useEffect(() => bottomRef.current?.scrollIntoView(...), [...])` – arrow function trả về giá trị của `scrollIntoView()`. Chromium bản mới cho hàm này trả về Promise; React coi giá trị trả về của effect là hàm dọn dẹp và gọi nó → lỗi.
- **Cách sửa (đã áp dụng):** viết effect trong `{ }` để không trả về gì. Đã rà toàn bộ `web/src`: chỉ chỗ này bị.
- **Retest:** sau khi sửa, gửi câu hỏi → trợ lý trả lời đúng nội dung FAQ, các TC ALL01-006/011 và ADM14-002 Pass.
- **Đề xuất thêm:** khai báo `errorElement` cho route gốc để lỗi bất ngờ không hiện màn hình dành cho developer.

## BUG-02 – [Ứng tuyển 1 chạm] Hồ sơ trống hiện lỗi chung chung thay vì hướng dẫn

- **Liên quan:** TC-CAN17-003 · yêu cầu CAN-17
- **Mức độ / Ưu tiên:** Medium / P2 – người dùng mới không biết phải làm gì
- **Tài khoản:** qa.uv01@test.local – chưa có CV, hồ sơ chưa có tiêu đề, kỹ năng, kinh nghiệm
- **Các bước tái hiện:**
  1. Mở tin "Chuyên viên Digital Marketing".
  2. Bấm "⚡ Ứng tuyển 1 chạm".
- **Kết quả thực tế:** Hiện "Đã có lỗi xảy ra, vui lòng thử lại" + link "Tạo CV online". Các request `GET /candidate/resumes`, `/profile`, `/cv-settings` đều 200.
- **Kết quả mong đợi:** "Hồ sơ còn trống nên chưa tạo được CV. Hãy bổ sung tiêu đề nghề nghiệp, kỹ năng hoặc kinh nghiệm, hoặc tải CV lên." kèm link Tạo CV online.
- **Nguyên nhân:** `web/src/lib/quickApply.ts` ném `new Error('Hồ sơ còn trống…')` nhưng `errorMessage()` (`web/src/lib/api.ts`) chỉ đọc lỗi từ response axios, mọi lỗi khác trả về câu mặc định.
- **Đề xuất sửa:** trong `errorMessage()`, thêm `if (err instanceof Error && err.message) return err.message;` sau nhánh axios.

## BUG-03 – [Hệ thống] Thời gian do DB tạo lệch 7 giờ khi SQL Server chạy trong Docker

- **Liên quan:** TC-CAN15-002, TC-CAN15-003, TC-EMP16-001 · ảnh hưởng mọi cột có mặc định `GETDATE()`
- **Mức độ / Ưu tiên:** Medium / P1 – sai thời gian hiển thị, sai thứ tự/khoảng thời gian (tin nhắn, thông báo, chấm CV, đánh giá, chỉ số phản hồi tính theo giờ)
- **Các bước tái hiện:**
  1. Chạy DB bằng `docker compose up -d` (container `jobportal-sqlserver`), API chạy trên Windows giờ Việt Nam.
  2. ntd1 gửi tin nhắn cho ứng viên lúc 16:24 (giờ VN).
  3. Ứng viên mở Tin nhắn.
- **Kết quả thực tế:** Tin vừa gửi hiện "7 giờ trước", giờ tin "09:24"; API trả `createdAt: 2026-10-29T02:24:22Z` trong khi lúc gửi là `09:24Z`. Kết quả chấm CV hiện "09:37:07" thay vì 16:37.
- **Kết quả mong đợi:** Hiện "vừa xong", giờ 16:24.
- **Nguyên nhân:** Container SQL Server dùng múi giờ UTC nên `GETDATE()` trả giờ UTC; API (TypeORM `useUTC: false`) hiểu giá trị đó là giờ địa phương (+7). Trước đây dùng SQL Express cài trên Windows (cùng múi giờ với API) nên không lộ lỗi. Cảnh báo lệch múi giờ lúc khởi động API (`timezone-check.ts`) là dấu hiệu.
- **Đề xuất sửa:** thêm `TZ: Asia/Ho_Chi_Minh` vào `environment` của service `sqlserver` trong `docker-compose.yml` (và `deploy/` nếu có), khởi động lại container. Dữ liệu tạo trong lúc lệch giờ sẽ vẫn lệch 7 giờ – seed lại DB demo.

## BUG-04 – [Kiểm tra CV] Số lượt còn lại không cập nhật sau lỗi 429 / khi admin đổi giới hạn

- **Liên quan:** TC-CAN19-011 · yêu cầu CAN-19
- **Mức độ / Ưu tiên:** Low / P3 – server vẫn chặn đúng, chỉ hiển thị sai
- **Các bước tái hiện:**
  1. uv1 mở cửa sổ Kiểm tra CV với JD (đang "Còn 14/20").
  2. Admin đổi `aiCvCheckPerDay` = 5 (uv1 đã dùng 6).
  3. uv1 chọn CV khác, bấm Kiểm tra.
- **Kết quả thực tế:** Hiện lỗi "Bạn đã dùng hết 5 lượt…" nhưng dòng số lượt vẫn "Còn 14/20", nút vẫn bấm được. Tải lại trang thì mới hiện "Còn 0/5" và khoá nút.
- **Kết quả mong đợi:** Sau lỗi 429 (hoặc khi mở lại cửa sổ), số lượt cập nhật ngay và nút bị khoá.
- **Nguyên nhân:** `CvCheckModal.tsx` chỉ `invalidateQueries(CV_CHECK_QUOTA_KEY)` khi thành công; `staleTime` mặc định 60 giây nên mở lại cửa sổ vẫn dùng số cũ.
- **Đề xuất sửa:** gọi `invalidateQueries` trong `onError` của mutation (hoặc `onSettled`), và `refetchOnMount: 'always'` cho query quota.

## BUG-05 – [Hỗ trợ] Phím Esc không đóng widget hỗ trợ

- **Mức độ / Ưu tiên:** Low / P3 – trải nghiệm, khả năng truy cập bằng bàn phím
- **Các bước:** mở widget hỗ trợ → nhấn Esc.
- **Thực tế:** widget vẫn mở, che nội dung bên dưới (và che nút bấm phía sau).
- **Mong đợi:** Esc đóng widget như các modal khác trong app.

## BUG-06 – [Admin] Thiếu trường lý do khi từ chối đánh giá → thông báo lẫn tiếng Anh

- **Liên quan:** TC-ADM12-004
- **Mức độ / Ưu tiên:** Low / P3
- **Các bước:** gọi `POST /api/admin/reviews/:id/reject` với body `{}` (không có `reason`).
- **Thực tế:** 400 với `["reason must be shorter than or equal to 500 characters", "Vui lòng nhập lý do", "reason must be a string"]`.
- **Mong đợi:** chỉ "Vui lòng nhập lý do" (tiếng Việt). Khi `reason: ""` thì đã đúng.
- **Đề xuất:** thêm `message` tiếng Việt cho `@IsString()`/`@MaxLength()` của DTO (hoặc dùng `@IsNotEmpty` trước, `stopAtFirstError`).

## BUG-07 – [Đăng nhập] Đăng xuất rồi đăng nhập tài khoản vai trò khác bị đưa vào trang 403

- **Liên quan:** TC-AUTH02-002 · AUTH-02
- **Mức độ / Ưu tiên:** Medium / P1 – dùng chung máy (văn phòng, phòng máy) là tình huống thường gặp; người dùng tưởng tài khoản mình bị chặn
- **Tài khoản:** uv1@demo.local → ntd1@demo.local (cũng tái hiện với qa.ntd11 → uv1)
- **Các bước tái hiện:**
  1. Đăng nhập uv1, vào `/candidate/profile`.
  2. Menu → Đăng xuất (về `/login`).
  3. Đăng nhập ntd1 ngay trên trang đó.
- **Kết quả thực tế:** chuyển tới `/403` "Bạn không có quyền truy cập trang này". `history.state` của trang login sau khi đăng xuất là `{"from":"/candidate/profile"}`.
- **Kết quả mong đợi:** ntd1 vào `/employer` (khu vực của vai trò mới).
- **Nguyên nhân:** khi đăng xuất, `RequireAuth` thấy `user = null` nên `<Navigate to="/login" state={{ from: location.pathname }}>` – ghi lại trang của người cũ. `LoginPage` sau đó `navigate(state?.from ?? ROLE_HOME[role])` mà không kiểm tra `from` có thuộc vai trò mới không.
- **Đề xuất sửa:** (a) nút Đăng xuất điều hướng thẳng `navigate('/login', { replace: true })` không kèm state; và/hoặc (b) trong `LoginPage` chỉ dùng `from` khi nó thuộc khu vực của vai trò vừa đăng nhập (vd. `/candidate*` cho CANDIDATE, `/employer*` cho EMPLOYER, `/admin*` cho ADMIN, hoặc trang công khai), ngược lại dùng `ROLE_HOME[role]`.

## BUG-08 – [Khoá tài khoản] Người bị khoá không bị đăng xuất; trang hiện "chưa có dữ liệu" thay vì báo khoá

- **Liên quan:** TC-AUTH07-001 · ADM-02
- **Mức độ / Ưu tiên:** Medium / P2 – phía API đã chặn đúng (không lộ dữ liệu), lỗi ở trải nghiệm và thông tin sai cho người dùng
- **Tài khoản:** uv2@demo.local (đã mở khoá lại sau test)
- **Các bước tái hiện:**
  1. Trình duyệt A: đăng nhập uv2.
  2. Admin khoá uv2 (`POST /api/admin/users/5/lock`).
  3. Trình duyệt A: bấm menu "Việc đã ứng tuyển".
- **Kết quả thực tế:** API `GET /api/candidate/applications` trả **403 "Tài khoản của bạn đã bị khóa"**, nhưng giao diện vẫn giữ trạng thái đăng nhập và hiện "Bạn chưa ứng tuyển việc nào. Tìm việc ngay" (sai sự thật). Không có thông báo khoá.
- **Kết quả mong đợi:** người dùng bị đăng xuất / chuyển về trang đăng nhập với thông báo "Tài khoản của bạn đã bị khóa…".
- **Nguyên nhân:** interceptor `web/src/lib/api.ts` chỉ xử lý 401; 403 "bị khóa" đi thẳng về component. `ApplicationsPage` (và có thể các trang danh sách khác) coi lỗi như danh sách rỗng.
- **Đề xuất sửa:** API trả mã lỗi riêng (vd. `code: "ACCOUNT_LOCKED"`) hoặc 401 cho tài khoản bị khoá; interceptor gặp mã này → `onSessionExpired()` + chuyển `/login` với `state.notice`. Các trang danh sách hiện `Alert` khi `isError` thay vì trạng thái rỗng.

## Q-01 – [Tìm hồ sơ] Ngày sinh ứng viên hiện cho NTD trước khi mở liên hệ

- **Liên quan:** TC-EMP14-010 · EMP-09, EMP-14
- **Hiện tại:** trang `/employer/candidates/:id` hiện "Ngày sinh: 20/5/2000" cho mọi NTD, trong khi email/SĐT phải mở bằng lượt liên hệ.
- **Câu hỏi:** ngày sinh có được coi là thông tin cá nhân cần ẩn (giống liên hệ) không? PRD chưa nêu rõ. Nếu cần ẩn → đổi thành lỗi Medium.

---

## Lịch sử

| Ngày | Mã | Thay đổi |
|---|---|---|
| 29/10/2026 | BUG-01…06, Q-01 | Tạo mới từ lượt test P1 tính năng mới; BUG-01 sửa trong lượt test (retest Pass) |
| 29/10/2026 | BUG-07, BUG-08 | Thêm từ lượt test P0 Xác thực + Quy tắc trạng thái (43/43 TC, 41 Pass / 2 Fail) |
| 29/10/2026 | BUG-01…08 | Sửa trong commit 68f5816; retest trên trình duyệt: 8/8 Fixed (TC AUTH02-002, AUTH07-001, CAN17-003, CAN19-011, ADM12-004, ALL01-004 chuyển Pass). BUG-03 cần tạo lại container (`docker compose up -d`); dữ liệu cũ vẫn lệch 7 giờ |
