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
| BUG-09 | [Hồ sơ] Ô Tỉnh/thành hiện "-- Chọn --" sau khi tải lại trang dù đã lưu | Low | P2 | Fixed – đã retest | TC-CAN01-001 |
| BUG-10 | [Đăng tin] "Lưu nháp" đòi đủ trường bắt buộc như "Gửi duyệt" | Low | P3 | Closed – đúng thiết kế (PO giữ hành vi hiện tại) | TC-EMP03-002 |
| BUG-11 | [Hệ thống] Body request quá 1MB trả 500 thay vì 413, không có X-Request-Id | Medium | P2 | Fixed – đã retest | TC-SEC-008 |
| OBS-01 | [Phiên] 2 lần làm mới phiên gửi đồng thời với cùng refresh token đều thành công | Ghi nhận | – | Cần cân nhắc | TC-AUTH06-001 |
| BUG-12 | [Hồ sơ] API nhận ngày sinh ở tương lai (web chặn nhưng API không) | Low | P3 | Fixed – đã retest | TC-CAN01-005 |
| Q-02 | [Tìm việc] Chưa hỗ trợ tìm không dấu ("ke toan" không ra "Kế toán") | Câu hỏi PO | – | Đã làm – tìm không dấu (retest Pass) | TC-CAN05-003 |
| BUG-13 | [Tải file] File quá dung lượng chỉ báo câu chung, không nêu giới hạn | Low | P3 | Fixed – đã retest | TC-CAN01-007, TC-EMP01-007 |
| Q-01 | [Tìm hồ sơ] Ngày sinh ứng viên hiện cho NTD trước khi mở liên hệ | Câu hỏi PO | – | Đã chốt: không ẩn (đúng thiết kế) | TC-EMP14-010 |
| BUG-14 | [Thông báo việc làm / Đăng tin / Công ty] Để trống ô chọn ("Tất cả") làm API trả 500 | High | P1 | Fixed – đã retest | TC-CAN10-001 |
| BUG-15 | [Xác minh email] Link hết hạn không gợi ý gửi lại link mới | Low | P3 | Fixed – đã retest | TC-AUTH03-003 |
| BUG-16 | [Phiên] Đăng nhập tài khoản khác vẫn thấy dữ liệu đã cache của người trước (tới 60 giây) | Medium | P2 | Fixed – đã retest | TC-EMP03-012 (regression) |
| BUG-17 | [Thông báo việc làm] Gạt tắt / bật thông báo báo lỗi 400 "Hãy nhập ít nhất từ khóa…" | Medium | P2 | Fixed – đã retest | TC-CAN10-005 |
| BUG-18 | [Hệ thống] API tắt: trang chi tiết tin báo "Không tìm thấy tin tuyển dụng" | Low | P3 | Fixed – đã retest | TC-CAN19-021 |
| BUG-19 | [Hỗ trợ] Trợ lý trả lời câu hỏi mới bằng FAQ của câu hỏi cũ trong cùng cuộc | Medium | P2 | Fixed – đã retest | TC-ALL01-005 |
| BUG-20 | [Giao diện] Nút ‹ › phân trang không có nhãn cho trình đọc màn hình | Low | P3 | Fixed – đã retest | TC-UI-005 |
| OBS-02 | [API] Một số câu lỗi validate bằng tiếng Anh khi gọi API trực tiếp | Ghi nhận | – | Cần cân nhắc | TC-CAN01-004, TC-EMP03-002, TC-EMP07-004, TC-PERF-003 |

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

## BUG-09 – [Hồ sơ] Ô Tỉnh/thành hiện "-- Chọn --" sau khi tải lại trang dù đã lưu

- **Liên quan:** TC-CAN01-001 · CAN-01 (cùng kiểu form: hồ sơ công ty, đăng tin)
- **Mức độ / Ưu tiên:** Low / P2 – dữ liệu không mất (bấm Lưu vẫn gửi đúng locationId), nhưng người dùng tưởng chưa lưu và chọn lại
- **Các bước:** qa.uv02 chọn Tỉnh/thành Hà Nội → Lưu → tải lại trang (F5) /candidate/profile.
- **Thực tế:** ô hiện "-- Chọn --"; API trả `locationId: 1`.
- **Nguyên nhân:** `<select>` đăng ký bằng `register()` (không controlled) nhận giá trị mặc định khi danh sách tỉnh/thành chưa tải xong (chưa có `<option>` tương ứng); khi danh sách về, react-hook-form không gán lại.
- **Đã sửa:** hook `web/src/lib/useSelectSync.ts` gán lại giá trị khi danh sách đã tải; dùng ở `InfoCard.tsx`, `CompanyPage.tsx`, `JobFormPage.tsx`. Retest: tải lại trang → "Hà Nội".

## BUG-10 – [Đăng tin] "Lưu nháp" đòi đủ trường bắt buộc như "Gửi duyệt"

- **Liên quan:** TC-EMP03-002 · EMP-03
- **Mức độ / Ưu tiên:** Low / P3 – cần PO xác nhận (PRD chỉ ghi "Lưu nháp hoặc Gửi duyệt")
- **Các bước:** /employer/jobs/new → chỉ nhập chức danh → bấm Lưu nháp.
- **Thực tế:** bị chặn: "Chọn ít nhất 1 ngành nghề", "Vui lòng nhập mô tả công việc", lương… (API `POST /employer/jobs` với `submit:false` cũng yêu cầu đủ trường).
- **Mong đợi (theo TC):** lưu được nháp khi mới nhập một phần, chỉ kiểm tra đầy đủ lúc Gửi duyệt.
- **Quyết định (29/10/2026, PO):** giữ như hiện tại – nháp cũng phải đủ trường bắt buộc. Đã sửa TC-EMP03-002 theo thiết kế này (Pass). Đóng.
- **Đề xuất cũ (không áp dụng):** tách validate – nháp chỉ cần chức danh; các ràng buộc còn lại kiểm khi `submit` (web: schema riêng cho nút Lưu nháp; API: DTO nháp với các trường optional, kiểm tra đủ trong `submit()`). Nếu giữ như hiện tại → sửa TC.

## BUG-11 – [Hệ thống] Body request quá 1MB trả 500 thay vì 413, không có X-Request-Id

- **Liên quan:** TC-SEC-008, TC-SEC-012 · §6.1
- **Mức độ / Ưu tiên:** Medium / P2 – chặn đúng (không xử lý body lớn) nhưng trả sai mã, ghi log như lỗi máy chủ, người dùng thấy "Lỗi máy chủ"
- **Các bước:** gửi `POST /api/auth/login` (hoặc PATCH hồ sơ) với body JSON 1,1MB.
- **Thực tế:** 500 "Lỗi máy chủ, vui lòng thử lại sau", không có X-Request-Id.
- **Nguyên nhân:** `express.json({ limit: '1mb' })` ném lỗi kiểu http-errors (`status: 413`, `type: entity.too.large`), không phải `HttpException` của Nest nên `AllExceptionsFilter` coi là 500. X-Request-Id gắn trong middleware Nest – chạy sau body-parser.
- **Đã sửa:** filter nhận lỗi 4xx chuẩn http-errors (`expose: true`) → 413 "Dữ liệu / file vượt quá dung lượng cho phép"; `assignRequestId` chạy đầu tiên trong `configureApp`. Thêm `http-exception.filter.spec.ts`. Retest: 1,1MB → 413 có X-Request-Id; 900KB → xử lý bình thường.

## OBS-01 – [Phiên] 2 lần làm mới phiên gửi đồng thời với cùng refresh token đều thành công

- **Liên quan:** TC-AUTH06-001 · AUTH-06
- **Hiện tại:** gửi lại token cũ *sau* khi đã xoay vòng → 401 và thu hồi mọi phiên (đúng). Nhưng 2 request `/auth/refresh` gửi *cùng lúc* với cùng token đều 200: `refresh()` đọc bản ghi (chưa thu hồi) rồi mới `revokeRefresh` – không nguyên tử.
- **Rủi ro:** thấp – kẻ gian phải dùng token đúng cùng lúc với người dùng. Ngược lại, nhiều tab mở cùng lúc cũng có thể gửi refresh đồng thời; nếu chặn cứng sẽ đăng xuất nhầm người dùng.
- **Gợi ý:** kiểm tra `affected` của câu `UPDATE … WHERE revoked_at IS NULL` (0 dòng = đã bị dùng) kèm khoảng ân hạn vài giây cho trường hợp nhiều tab. Chưa sửa – để quyết định khi rà soát bảo mật.

## BUG-12 – [Hồ sơ] API nhận ngày sinh ở tương lai

- **Liên quan:** TC-CAN01-005 · CAN-01
- **Mức độ / Ưu tiên:** Low / P3 – giao diện đã chặn, chỉ lọt khi gọi API trực tiếp
- **Các bước:** `PATCH /api/candidate/profile` với `dateOfBirth` = ngày mai.
- **Thực tế:** 200, lưu 2026-10-30. Web chặn bằng zod (1940-01-01 … hôm nay) nhưng DTO API chỉ kiểm tra định dạng YYYY-MM-DD.
- **Đã sửa:** thêm `BirthDateRule` (1940-01-01 … hôm nay giờ VN) vào `dateOfBirth` của DTO hồ sơ ứng viên. Retest: ngày mai / 1939-12-31 → 400 "Ngày sinh không hợp lệ"; 2000-05-20 → 200.

## Q-02 – [Tìm việc] Chưa hỗ trợ tìm không dấu

- **Liên quan:** TC-CAN05-003 · CAN-05
- **Hiện tại:** tìm "ke toan" → 0 kết quả; "kế toán" → có tin. TC ghi "nếu không hỗ trợ, ghi nhận để PO quyết định".
- **Quyết định (30/10/2026, PO):** làm. Đã thêm `api/src/common/utils/search.ts` (`aiLike` + `searchKeyword`: collation `Latin1_General_100_CI_AI`, đổi đ→d) cho tìm việc (tiêu đề, công ty, kỹ năng) và tìm công ty. Retest: "ke toan", "KE TOAN", "phuong nam", "lap trinh" đều ra kết quả; ký tự đặc biệt vẫn được escape.
- **Câu hỏi ban đầu:** có cần hỗ trợ tìm không dấu không? Người dùng Việt hay gõ không dấu trên điện thoại. Nếu cần: thêm cột tiêu đề/kỹ năng đã bỏ dấu (hoặc collation `Vietnamese_CI_AI` cho cột tìm kiếm) và bỏ dấu từ khoá trước khi so khớp.

## BUG-13 – [Tải file] File quá dung lượng chỉ báo câu chung, không nêu giới hạn

- **Liên quan:** TC-CAN01-007, TC-EMP01-007, TC-EMP02-003
- **Mức độ / Ưu tiên:** Low / P3
- **Thực tế (trước khi sửa):** ảnh đại diện 2,1MB, logo 2,1MB, ảnh bìa 3,1MB → 413 "Dữ liệu / file vượt quá dung lượng cho phép" – người dùng không biết giới hạn là bao nhiêu.
- **Đã sửa:** `api/src/common/upload.ts` – interceptor tải file dùng chung đổi lỗi vượt dung lượng thành "File tối đa {n}MB"; `AllExceptionsFilter` giữ nguyên câu tiếng Việt cụ thể cho 413. Retest: ảnh đại diện / logo "File tối đa 2MB", ảnh bìa "File tối đa 3MB", giấy phép "File tối đa 5MB".

## Q-01 – [Tìm hồ sơ] Ngày sinh ứng viên hiện cho NTD trước khi mở liên hệ

- **Liên quan:** TC-EMP14-010 · EMP-09, EMP-14
- **Hiện tại:** trang `/employer/candidates/:id` hiện "Ngày sinh: 20/5/2000" cho mọi NTD, trong khi email/SĐT phải mở bằng lượt liên hệ.
- **Câu hỏi:** ngày sinh có được coi là thông tin cá nhân cần ẩn (giống liên hệ) không? PRD chưa nêu rõ.
- **Quyết định (29/10/2026, PO):** không ẩn – giữ như hiện tại. Đóng câu hỏi.

## BUG-14 – [Thông báo việc làm / Đăng tin / Công ty] Để trống ô chọn ("Tất cả") làm API trả 500

- **Liên quan:** TC-CAN10-001 · CAN-10 (ảnh hưởng cả EMP-01, EMP-03)
- **Mức độ / Ưu tiên:** High / P1 – người dùng không tạo được thông báo việc làm nếu để "Ngành nghề" hoặc "Địa điểm" là "Tất cả".
- **Bước tái hiện:** uv1 → /candidate/job-alerts → Tạo thông báo → từ khoá "ReactJS", Địa điểm Hà Nội, Ngành nghề để "Tất cả" → Tạo thông báo.
- **Thực tế (trước khi sửa):** `POST /api/candidate/job-alerts` → 500 "Lỗi máy chủ, vui lòng thử lại sau". Gửi `{locationId:'', categoryId:''}` qua API cũng 500.
- **Nguyên nhân:** DTO dùng `@Transform(emptyToNull)` + `@Type(() => Number)`; class-transformer đổi `''` thành `0` trước khi `emptyToNull` chạy → `0` lọt qua validate (`validateAlert` bỏ qua vì falsy) rồi vỡ khoá ngoại khi lưu. Cùng mẫu có ở `locationId` của công ty, `salaryMin`/`salaryMax`/`locationId` của tin tuyển dụng.
- **Đã sửa:** thêm `api/src/common/utils/optional-int.ts` (`toOptionalInt` đọc giá trị gốc: `''` → null, chuỗi số → number, giá trị khác giữ nguyên để `@IsInt` báo 400) + unit test; thay ở `engagement.dto.ts`, `company.dto.ts`, `job.dto.ts`.
- **Retest:** `''` → 201 (locationId null), `'1'` → 201 (locationId 1), `'abc'` → 400; tạo trên giao diện → alert "ReactJS · Hà Nội" xuất hiện trong danh sách.

## BUG-15 – [Xác minh email] Link hết hạn không gợi ý gửi lại link mới

- **Liên quan:** TC-AUTH03-003
- **Mức độ / Ưu tiên:** Low / P3
- **Thực tế (trước khi sửa):** mở link xác minh đã quá hạn → "Link xác minh không hợp lệ hoặc đã hết hạn" + nút "Đăng nhập"/"Về trang chủ", không có gợi ý gửi lại như TC mong đợi.
- **Đã sửa:** `web/src/pages/auth/VerifyEmailPage.tsx` – khi lỗi: chưa đăng nhập → "Đăng nhập để gửi lại link xác minh mới."; đã đăng nhập mà chưa xác minh → nút "Gửi lại link xác minh" (gọi `/auth/resend-verification`).
- **Retest:** khách thấy câu gợi ý; qa.ntd11 bấm nút → "Đã gửi lại email xác minh", email mới #20005 trong /admin/emails.

## BUG-16 – [Phiên] Đăng nhập tài khoản khác vẫn thấy dữ liệu đã cache của người trước

- **Liên quan:** TC-EMP03-012 (phát hiện khi chạy regression), AUTH-02
- **Mức độ / Ưu tiên:** Medium / P2 – trên máy dùng chung, người đăng nhập sau có thể thấy dữ liệu của người trước; giao diện hiện sai trạng thái.
- **Bước tái hiện:** ntd1 đăng nhập, mở /employer/jobs → đăng xuất → trong vòng 60 giây đăng nhập qa.ntd13 (NTD mới, chưa có công ty) → mở /employer/jobs/new.
- **Thực tế (trước khi sửa):** hiện form đăng tin như đã có công ty (dữ liệu `/employer/me` của ntd1 còn trong cache react-query, `staleTime` 60 giây nên không tải lại). Mong đợi: hướng dẫn "Hãy tạo hồ sơ công ty để bắt đầu đăng tin tuyển dụng."
- **Nguyên nhân:** `AuthContext` không xoá cache của `queryClient` khi đổi người dùng.
- **Đã sửa:** `web/src/auth/AuthContext.tsx` gọi `queryClient.clear()` khi đăng nhập/đăng ký, đăng xuất, hết phiên và bị khoá tài khoản.
- **Retest:** chạy lại đúng chuỗi trên → /employer/jobs/new hiện ngay hướng dẫn tạo công ty; ntd1 đăng nhập lại thấy đủ 18 tin của mình.

## BUG-17 – [Thông báo việc làm] Gạt tắt / bật thông báo báo lỗi 400

- **Liên quan:** TC-CAN10-005 · CAN-10
- **Mức độ / Ưu tiên:** Medium / P2 – không tạm dừng được thông báo việc làm; cách khác duy nhất là xoá.
- **Bước tái hiện:** uv1 có thông báo "QA P2 alert" → /candidate/job-alerts → gạt công tắc "Đang bật".
- **Thực tế (trước khi sửa):** `PATCH /api/candidate/job-alerts/:id` body `{ isActive: false }` → 400 "Hãy nhập ít nhất từ khóa, địa điểm hoặc ngành nghề"; trạng thái không đổi.
- **Nguyên nhân:** DTO sau khi chuyển đổi có sẵn các trường `keyword/locationId/categoryId = undefined`; `updateAlert` trộn `{ ...alert, ...dto }` nên ghi đè giá trị cũ bằng `undefined` rồi báo thiếu điều kiện.
- **Đã sửa:** `engagement.service.ts` bỏ các trường `undefined` trước khi kiểm tra và cập nhật; thêm `engagement.service.spec.ts`.
- **Retest:** gạt tắt → "Đã tắt" (isActive false); đổi Hằng tuần, Xóa đều đúng.

## BUG-18 – [Hệ thống] API tắt: trang chi tiết tin báo "Không tìm thấy tin tuyển dụng"

- **Liên quan:** TC-CAN19-021
- **Mức độ / Ưu tiên:** Low / P3
- **Thực tế (trước khi sửa):** API ngừng (proxy trả 500 không có nội dung) → mở /jobs/<slug> báo "Không tìm thấy tin tuyển dụng", người dùng tưởng tin đã bị xoá.
- **Đã sửa:** `web/src/lib/api.ts` – `errorMessage` trả "Không kết nối được máy chủ, vui lòng thử lại sau" cho lỗi 5xx không có nội dung, thay vì câu mặc định của từng trang.
- **Retest:** API tắt → trang tin và cửa sổ kiểm tra CV hiện câu mới (cửa sổ có nút Thử lại); bật API, Thử lại → tải được.

## OBS-02 – [API] Một số câu lỗi validate bằng tiếng Anh khi gọi API trực tiếp

- **Liên quan:** TC-CAN01-004, TC-EMP03-002, TC-EMP07-004
- **Hiện tượng:** `message` 3001 ký tự khi đổi trạng thái đơn → "message must be shorter than or equal to 3000 characters"; `fullName` 151 ký tự → "fullName must be shorter than or equal to 150 characters"; `salaryMin: "abc"` → "salaryMin must be an integer number…". Giao diện đã chặn trước (maxlength, kiểm tra form) nên người dùng thường không gặp.
- **Đề xuất:** thêm `message` tiếng Việt cho các decorator `MaxLength/IsInt/Min/Max` còn thiếu.

## BUG-19 – [Hỗ trợ] Trợ lý trả lời câu hỏi mới bằng FAQ của câu hỏi cũ trong cùng cuộc

- **Liên quan:** TC-ALL01-005 · ALL-01
- **Mức độ / Ưu tiên:** Medium / P2 – người dùng nhận câu trả lời sai chủ đề, dễ hiểu nhầm là đã được giải đáp.
- **Bước tái hiện:** uv1 có cuộc hỗ trợ từng hỏi "Làm sao đổi mật khẩu?" (vài giờ trước) → hỏi "Công ty ABC có cho làm từ xa không?".
- **Thực tế (trước khi sửa):** trợ lý trả lại nguyên FAQ "Đổi mật khẩu". Mong đợi: báo chưa có câu trả lời và gợi ý "Gặp nhân viên".
- **Nguyên nhân:** `SupportBotService.reply` luôn ghép 2 câu hỏi gần nhất để tìm FAQ (hỗ trợ câu hỏi nối tiếp); từ khoá của câu cũ ("đổi mật khẩu") đủ điểm vượt ngưỡng.
- **Đã sửa:** ưu tiên câu hỏi mới nhất; chỉ ghép câu trước khi câu mới ngắn (≤ 5 từ) và tự nó chưa khớp FAQ đủ chắc. Thêm 2 unit test (khác chủ đề / hỏi nối tiếp ngắn).
- **Retest:** cùng câu hỏi → "Mình chưa chắc đã hiểu đúng câu hỏi…" + gợi ý "Gặp nhân viên".

## BUG-20 – [Giao diện] Nút ‹ › phân trang không có nhãn cho trình đọc màn hình

- **Liên quan:** TC-UI-005 · §6.4
- **Mức độ / Ưu tiên:** Low / P3
- **Thực tế (trước khi sửa):** nút trang trước/sau chỉ có ký tự "‹" "›", không có `aria-label`; trình đọc màn hình đọc ký hiệu.
- **Đã sửa:** `web/src/components/Pagination.tsx` – `nav aria-label="Phân trang"`, nút "Trang trước" / "Trang sau", số trang "Trang n" + `aria-current="page"`.
- **Retest:** quét các trang /, /jobs, /admin, /admin/support, /admin/reviews, trang công ty – không còn nút/link biểu tượng thiếu nhãn.

---

## Lịch sử

| Ngày | Mã | Thay đổi |
|---|---|---|
| 29/10/2026 | BUG-01…06, Q-01 | Tạo mới từ lượt test P1 tính năng mới; BUG-01 sửa trong lượt test (retest Pass) |
| 29/10/2026 | BUG-07, BUG-08 | Thêm từ lượt test P0 Xác thực + Quy tắc trạng thái (43/43 TC, 41 Pass / 2 Fail) |
| 29/10/2026 | BUG-01…08 | Sửa trong commit 68f5816; retest trên trình duyệt: 8/8 Fixed (TC AUTH02-002, AUTH07-001, CAN17-003, CAN19-011, ADM12-004, ALL01-004 chuyển Pass). BUG-03 cần tạo lại container (`docker compose up -d`); dữ liệu cũ vẫn lệch 7 giờ |
| 29/10/2026 | BUG-09, BUG-10, Q-01 | Lượt P0 còn lại (99 TC: 97 Pass, 1 Fail, 1 Blocked). BUG-09 sửa + retest Pass; BUG-10 chờ PO; Q-01 chốt không ẩn ngày sinh |
| 29/10/2026 | BUG-10 | PO giữ hành vi hiện tại → Closed (đúng thiết kế); sửa TC-EMP03-002 |
| 29/10/2026 | BUG-11, OBS-01 | P1 lượt 1 (bảo mật & quy tắc trạng thái, 22 TC Pass). BUG-11 sửa + retest; OBS-01 ghi nhận |
| 29/10/2026 | BUG-12, Q-02 | P1 lượt 2 (Ứng viên, 31 TC Pass). BUG-12 sửa + retest; Q-02 chờ PO |
| 30/10/2026 | BUG-13, Q-02 | P1 lượt 3 (NTD + Admin, 37 TC Pass). BUG-13 sửa + retest; Q-02 làm tìm không dấu |
| 30/10/2026 | BUG-14, BUG-15 | P1 lượt 4 (26 TC). BUG-14 (500 khi để trống ô chọn) và BUG-15 sửa + retest Pass |
| 30/10/2026 | BUG-16 | Regression sau lượt 4 (smoke + P0 đăng tin, công ty, duyệt tin, tìm việc, ứng tuyển) + unit/E2E Pass. BUG-16 sửa + retest; AUTH04-005 Pass |
| 30/10/2026 | BUG-17, BUG-18, OBS-02 | P2 lượt 1 – Ứng viên + AUTH (36 TC: 33 Pass, 3 Skip AI). BUG-17, BUG-18 sửa + retest |
| 30/10/2026 | – | P2 lượt 2 – Nhà tuyển dụng (40/40 Pass), không có lỗi mới; OBS-02 thêm trường hợp lời nhắn đổi trạng thái |
| 30/10/2026 | BUG-19, BUG-20 | P2 lượt 3 – Admin + Hỗ trợ + Phi chức năng (44 TC: 43 Pass, 1 Blocked). BUG-19, BUG-20 sửa + retest. Kết thúc chạy P2 |
