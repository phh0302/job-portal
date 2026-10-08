# Tài liệu yêu cầu sản phẩm (PRD) – JobPortal

| | |
|---|---|
| **Sản phẩm** | JobPortal – nền tảng tìm việc & tuyển dụng |
| **Phiên bản tài liệu** | 1.0 |
| **Ngày** | 08/10/2026 |
| **Chủ sở hữu** | Ha Pham |
| **Trạng thái** | Đã triển khai MVP (mục 1–8 trong `todo.md`), chờ deploy |
| **Tài liệu liên quan** | [`todo.md`](../todo.md) · [`docs/so-do-trang.md`](so-do-trang.md) · [`docs/trien-khai.md`](trien-khai.md) · Swagger `/api/docs` |

---

## 1. Tổng quan

### 1.1 Vấn đề
- **Ứng viên** mất thời gian lọc tin trên nhiều kênh, khó theo dõi đơn đã nộp, dễ gặp tin lừa đảo (thu phí, đặt cọc).
- **Nhà tuyển dụng (NTD) nhỏ và vừa** quản lý CV qua email/Excel, không biết tin nào hiệu quả, không có quy trình xử lý ứng viên rõ ràng.
- **Đơn vị vận hành** cần kiểm soát chất lượng tin đăng và xử lý vi phạm nhanh.

### 1.2 Mục tiêu sản phẩm
1. Ứng viên tìm được việc phù hợp và nộp hồ sơ trong **dưới 3 phút** kể từ khi vào trang.
2. NTD đăng tin, nhận và xử lý ứng viên **trên một màn hình**, theo quy trình chuẩn (xem → phù hợp → phỏng vấn → offer/từ chối).
3. **100% tin tuyển dụng được kiểm duyệt** trước khi hiển thị; công ty được xác minh bằng giấy phép kinh doanh.
4. Bảo vệ dữ liệu cá nhân: CV chỉ đến đúng NTD được ứng tuyển.

### 1.3 Phạm vi
- Nền tảng web (responsive desktop + mobile), tiếng Việt, thị trường Việt Nam (34 tỉnh/thành theo địa giới 2025).
- 3 vai trò: **Ứng viên**, **Nhà tuyển dụng**, **Quản trị viên** (có cấp super admin).
- Ngoài phạm vi phiên bản này: ứng dụng di động native, cổng thanh toán trực tuyến thật (hiện thanh toán giả lập – admin xác nhận chuyển khoản), đa ngôn ngữ (xem §11).

---

## 2. Người dùng (Personas)

| Persona | Mô tả | Nhu cầu chính | Nỗi đau |
|---|---|---|---|
| **An – Ứng viên đi làm 1–3 năm** | 25 tuổi, lập trình viên Frontend, tìm việc lương tốt hơn | Lọc theo kỹ năng, lương, địa điểm; nộp nhanh bằng CV có sẵn; biết NTD đã xem chưa | Nộp xong không có phản hồi; tin ảo |
| **Bình – Sinh viên mới ra trường** | Tìm thực tập / fresher | Việc không yêu cầu kinh nghiệm, được báo khi có việc mới | Không biết bắt đầu từ đâu |
| **Hà – Chuyên viên HR công ty 50–200 người** | Tuyển 5–10 vị trí/quý | Đăng tin nhanh, lọc ứng viên, gửi thư mời PV/từ chối, xem hiệu quả từng tin | CV rải rác trong email, không đo được hiệu quả |
| **Minh – Quản trị viên nền tảng** | Vận hành & kiểm duyệt | Hàng đợi việc cần xử lý, duyệt nhanh, xử lý vi phạm, lịch sử thao tác | Không có công cụ, không truy vết được ai làm gì |

---

## 3. Phân quyền

| Chức năng | Khách | Ứng viên | NTD | Admin |
|---|:-:|:-:|:-:|:-:|
| Xem / tìm việc làm, công ty, trang tĩnh | ✓ | ✓ | ✓ | ✓ |
| Hồ sơ, CV, ứng tuyển, lưu việc, theo dõi công ty, job alert | | ✓ | | |
| Báo cáo vi phạm | | ✓ | ✓ | ✓ |
| Hồ sơ công ty, đăng tin, quản lý ứng viên, tìm hồ sơ, thống kê | | | ✓ (chỉ dữ liệu công ty mình) | |
| Duyệt tin, xác minh công ty, xử lý báo cáo, quản lý người dùng, danh mục, cấu hình | | | | ✓ |
| Tạo / khóa tài khoản admin | | | | Chỉ super admin |

Nguyên tắc: mọi API mặc định **yêu cầu đăng nhập**; dữ liệu luôn được **lọc theo chủ sở hữu** (truy cập tài nguyên không thuộc mình trả về 404, không tiết lộ sự tồn tại).

---

## 4. Yêu cầu chức năng

Mức ưu tiên: **P0** = bắt buộc cho MVP · **P1** = nên có · **P2** = mở rộng. Trạng thái: ✅ đã làm · 🟡 một phần · ⬜ chưa làm.

### 4.1 Tài khoản & xác thực

| ID | Yêu cầu | Ưu tiên | TT |
|---|---|:-:|:-:|
| AUTH-01 | Đăng ký bằng email + mật khẩu, chọn vai trò Ứng viên / NTD (không tự đăng ký Admin) | P0 | ✅ |
| AUTH-02 | Đăng nhập; phiên duy trì 7 ngày bằng refresh token trong cookie httpOnly, access token 15 phút | P0 | ✅ |
| AUTH-03 | Xác minh email qua link (hiệu lực 24 giờ), gửi lại link | P0 | ✅ |
| AUTH-04 | Quên mật khẩu → link đặt lại (30 phút, dùng 1 lần); thông báo giống nhau dù email có tồn tại hay không | P0 | ✅ |
| AUTH-05 | Đổi mật khẩu; đổi/đặt lại mật khẩu sẽ **đăng xuất mọi thiết bị** | P0 | ✅ |
| AUTH-06 | Phát hiện refresh token bị dùng lại (nghi đánh cắp) → thu hồi mọi phiên | P1 | ✅ |
| AUTH-07 | Tài khoản bị khóa bị chặn ngay ở request kế tiếp | P0 | ✅ |
| ~~AUTH-08~~ | ~~Đăng nhập Google~~ — **bỏ khỏi phạm vi** (quyết định 08/10/2026) | – | – |

**Tiêu chí chấp nhận (AUTH-02, AUTH-05)**
- *Cho* người dùng đã đăng nhập, *khi* access token hết hạn, *thì* web tự làm mới phiên mà người dùng không phải đăng nhập lại.
- *Cho* người dùng đổi mật khẩu thành công, *khi* thiết bị khác gọi API, *thì* phiên ở thiết bị đó hết hiệu lực trong tối đa 15 phút và không làm mới được.

### 4.2 Ứng viên

| ID | Yêu cầu | Ưu tiên | TT |
|---|---|:-:|:-:|
| CAN-01 | Hồ sơ: họ tên, SĐT, ngày sinh, địa chỉ, tỉnh/thành, tiêu đề nghề nghiệp, giới thiệu, số năm KN, lương mong muốn, ảnh đại diện | P0 | ✅ |
| CAN-02 | Thêm/sửa/xóa kinh nghiệm làm việc, học vấn; chọn kỹ năng (tối đa 30) | P0 | ✅ |
| CAN-03 | Tải lên CV PDF/DOC/DOCX; số CV và dung lượng tối đa theo cấu hình (mặc định 5 CV, 5MB); đặt CV mặc định; xem/tải/xóa | P0 | ✅ |
| CAN-04 | Bật/tắt "Cho phép NTD tìm thấy hồ sơ" | P1 | ✅ |
| CAN-05 | Tìm việc theo từ khóa (chức danh, công ty, kỹ năng) + lọc địa điểm, ngành, lương, loại hình, cấp bậc, kinh nghiệm; sắp xếp mới nhất / lương / phù hợp; phân trang; bộ lọc lưu trên URL | P0 | ✅ |
| CAN-06 | Trang chi tiết việc làm: thông tin, mô tả có định dạng, công ty, việc tương tự (ưu tiên cùng tỉnh), cảnh báo lừa đảo | P0 | ✅ |
| CAN-07 | Ứng tuyển: chọn CV + thư giới thiệu (≤ 3000 ký tự) | P0 | ✅ |
| CAN-08 | Danh sách đơn đã nộp + trạng thái; rút đơn khi NTD chưa xử lý | P0 | ✅ |
| CAN-09 | Lưu việc làm, theo dõi công ty | P1 | ✅ |
| CAN-10 | Thông báo việc làm qua email (job alert): từ khóa/ngành/địa điểm, hằng ngày/hằng tuần, tối đa 5, gửi thử | P1 | ✅ |
| CAN-11 | Nhận thông báo trong web + email khi trạng thái đơn thay đổi | P0 | ✅ |
| CAN-12 | Báo cáo tin/công ty vi phạm (6 lý do có sẵn) | P1 | ✅ |
| CAN-13 | **Việc làm gợi ý bằng AI**: xếp hạng theo % phù hợp (kỹ năng, chức danh, ngành quan tâm, địa điểm, kinh nghiệm, lương), hiện kỹ năng đã có / còn thiếu, cách tính điểm; nhận xét & gợi ý cải thiện do Claude viết (tùy chọn) | P1 | ✅ |
| CAN-14 | **Tạo CV online** từ hồ sơ: 3 mẫu (Hiện đại / Cổ điển / Tối giản), chọn màu, ảnh, ngày sinh, mục bổ sung (chứng chỉ, ngoại ngữ, sở thích); xem trước PDF, tải PDF, **lưu vào "CV của tôi"** để ứng tuyển | P2 | ✅ |
| CAN-15 | **Tin nhắn** với NTD trong từng đơn ứng tuyển (trả lời khi NTD nhắn trước), realtime, đánh dấu chưa đọc | P2 | ✅ |
| CAN-16 | **Đánh giá công ty**: 1–5 sao, tiêu đề, điểm tốt / chưa tốt, quan hệ với công ty, ẩn danh (mặc định); cần xác minh email; 1 đánh giá / công ty, sửa → duyệt lại | P2 | ✅ |

**Tiêu chí chấp nhận (CAN-07)**
- Chỉ nộp được vào tin **đã duyệt** và **còn hạn**; mỗi ứng viên **1 đơn / 1 tin** (nộp lại → báo "Bạn đã ứng tuyển vị trí này rồi").
- Chỉ chọn được CV **của chính mình**.
- Đơn lưu **bản sao** tên & file CV tại thời điểm nộp: ứng viên xóa CV sau đó, NTD vẫn xem được.
- Sau khi nộp, mọi NTD của công ty nhận thông báo "Có ứng viên mới".

### 4.3 Nhà tuyển dụng

| ID | Yêu cầu | Ưu tiên | TT |
|---|---|:-:|:-:|
| EMP-01 | Tạo/sửa hồ sơ công ty: tên, MST, quy mô, website, địa chỉ, tỉnh/thành, giới thiệu, logo, ảnh bìa | P0 | ✅ |
| EMP-02 | Gửi giấy phép kinh doanh (PDF/JPG/PNG) để xác minh; khi đang chờ / đã xác minh thì khóa tên & MST | P0 | ✅ |
| EMP-03 | Đăng tin: chức danh, loại hình, cấp bậc, KN, số lượng, lương (khoảng hoặc thỏa thuận), hạn nộp, địa điểm, 1–3 ngành, ≤ 15 kỹ năng, mô tả/yêu cầu/quyền lợi có định dạng; **Lưu nháp** hoặc **Gửi duyệt** | P0 | ✅ |
| EMP-04 | Danh sách tin theo trạng thái, kèm lượt xem, số đơn, số đơn mới; xem lý do bị từ chối | P0 | ✅ |
| EMP-05 | Sửa, đóng, mở lại, gia hạn, xóa tin (theo quy tắc §5.1) | P0 | ✅ |
| EMP-06 | Danh sách đơn theo tin / trạng thái / tên; chi tiết đơn: hồ sơ ứng viên, thư giới thiệu, xem CV PDF ngay trên trang, tải CV | P0 | ✅ |
| EMP-07 | Cập nhật trạng thái đơn theo quy trình (§5.2); thư mời phỏng vấn (thời gian, địa điểm) và thư từ chối theo mẫu, có lời nhắn | P0 | ✅ |
| EMP-08 | Ghi chú nội bộ cho từng đơn (ứng viên không thấy) | P1 | ✅ |
| EMP-09 | Tìm hồ sơ ứng viên công khai theo từ khóa, kỹ năng, tỉnh, KN tối thiểu | P2 | ✅ |
| EMP-10 | Tổng quan: tin đang tuyển, lượt xem, tổng đơn, đơn chưa xem, biểu đồ số đơn 30 ngày, phễu chuyển đổi, top 5 tin | P1 | ✅ |
| EMP-11 | Nhiều tài khoản NTD cùng một công ty (mời đồng nghiệp) | P2 | ✅ (chủ/thành viên, mời qua email, link 7 ngày) |
| EMP-12 | **Tin nhắn** với ứng viên trong đơn ứng tuyển (NTD mở cuộc trò chuyện); hộp thư chung cho cả đội tuyển dụng | P2 | ✅ |
| EMP-13 | Xem đánh giá công ty, **phản hồi công khai** (chỉ chủ công ty) | P2 | ✅ |
| EMP-14 | **Gói dịch vụ**: mua gói (thanh toán giả lập: chuyển khoản theo mã đơn, admin xác nhận); dùng lượt **đẩy tin nổi bật** 7 ngày và **mở liên hệ ứng viên** trong "Tìm hồ sơ" | P2 | ✅ |

**Tiêu chí chấp nhận (EMP-05)**
- Sửa **tiêu đề, mô tả, yêu cầu, quyền lợi, ngành, kỹ năng** của tin đang hiển thị → tin về **Chờ duyệt**. Sửa lương, hạn nộp, số lượng, địa điểm → **không** phải duyệt lại.
- Không xóa được tin đã có người ứng tuyển (gợi ý đóng tin).

### 4.4 Quản trị viên

| ID | Yêu cầu | Ưu tiên | TT |
|---|---|:-:|:-:|
| ADM-01 | Tổng quan: người dùng theo vai trò, công ty, tin, đơn; "việc cần xử lý" (tin chờ duyệt, công ty chờ xác minh, báo cáo mở) hiển thị cả trên menu | P0 | ✅ |
| ADM-02 | Biểu đồ tăng trưởng người dùng / tin / đơn theo ngày (30) hoặc tháng (12) | P1 | ✅ |
| ADM-03 | Duyệt / từ chối tin (bắt buộc lý do, có lý do mẫu); gỡ tin đang hiển thị nếu vi phạm | P0 | ✅ |
| ADM-04 | Xác minh / từ chối / thu hồi xác minh công ty, xem giấy phép | P0 | ✅ |
| ADM-05 | Xử lý báo cáo: chỉ đóng / gỡ tin / cảnh cáo NTD / khóa tài khoản NTD; đóng đồng thời các báo cáo cùng đối tượng; hoặc bỏ qua | P0 | ✅ |
| ADM-06 | Quản lý người dùng: tìm, lọc, xem chi tiết, khóa (bắt buộc lý do) / mở khóa | P0 | ✅ |
| ADM-07 | Super admin tạo admin khác; không ai tự khóa mình hay khóa super admin | P1 | ✅ |
| ADM-08 | CRUD ngành nghề (có ẩn/hiện), kỹ năng, tỉnh/thành; không xóa mục đang được dùng | P1 | ✅ |
| ADM-09 | Sửa trang tĩnh (Giới thiệu, Điều khoản, Chính sách bảo mật); banner trang chủ, thông báo chung | P1 | ✅ |
| ADM-10 | Cấu hình hệ thống không cần sửa code (§5.5) | P1 | ✅ |
| ADM-11 | Nhật ký thao tác admin (ai, lúc nào, IP, chi tiết), lọc theo loại | P1 | ✅ |
| ADM-12 | Duyệt / từ chối / gỡ đánh giá công ty (bắt buộc lý do) | P2 | ✅ |
| ADM-13 | Đơn mua gói: xác nhận đã thanh toán (kích hoạt gói, cộng lượt) / huỷ; sửa giá & quyền lợi gói; doanh thu tháng; cấu hình tài khoản nhận chuyển khoản | P2 | ✅ |

Mọi quyết định kiểm duyệt **gửi thông báo** cho NTD liên quan và **ghi nhật ký**.

---

## 5. Quy tắc nghiệp vụ

### 5.1 Vòng đời tin tuyển dụng

| Trạng thái hiện tại | Hành động | Ai | Trạng thái mới |
|---|---|---|---|
| Nháp (DRAFT) | Gửi duyệt | NTD | Chờ duyệt |
| Chờ duyệt (PENDING) | Duyệt | Admin | Đang hiển thị |
| Chờ duyệt | Từ chối (kèm lý do) | Admin | Bị từ chối |
| Bị từ chối (REJECTED) | Sửa & gửi lại | NTD | Chờ duyệt |
| Đang hiển thị (APPROVED) | Sửa nội dung (tiêu đề, mô tả, yêu cầu, quyền lợi, ngành, kỹ năng) | NTD | Chờ duyệt |
| Đang hiển thị | Đóng tin | NTD | Đã đóng |
| Đang hiển thị | Gỡ do vi phạm (kèm lý do) | Admin | Bị từ chối |
| Đang hiển thị | Quá hạn nộp (tự động, mỗi giờ) | Hệ thống | Hết hạn |
| Đã đóng (CLOSED) | Mở lại (nếu còn hạn) hoặc gia hạn | NTD | Đang hiển thị |
| Hết hạn (EXPIRED) | Gia hạn | NTD | Đang hiển thị |

- Chỉ tin **APPROVED và hạn nộp ≥ hôm nay** hiển thị công khai, tìm kiếm được, nhận đơn.
- Hạn nộp: từ hôm nay đến tối đa *N* ngày (cấu hình, mặc định 90). Gia hạn phải sau hạn hiện tại.
- Tin đang **PENDING** không sửa được (chờ kết quả duyệt).

### 5.2 Luồng trạng thái đơn ứng tuyển

| Từ \ Sang | Đã xem | Phù hợp | Phỏng vấn | Offer | Từ chối |
|---|:-:|:-:|:-:|:-:|:-:|
| Đã nộp (SUBMITTED) | ✓ (tự động khi NTD mở đơn) | ✓ | ✓ | | ✓ |
| Đã xem (VIEWED) | | ✓ | ✓ | | ✓ |
| Phù hợp (SHORTLISTED) | | | ✓ | ✓ | ✓ |
| Phỏng vấn (INTERVIEW) | | | ✓ (đổi lịch) | ✓ | ✓ |
| Offer (OFFERED) | | | | | ✓ |
| Từ chối (REJECTED) | | ✓ (xem xét lại) | | | |
| Đã rút (WITHDRAWN) | – | – | – | – | – |

- Ứng viên **rút đơn** được khi đơn ở Đã nộp / Đã xem / Phù hợp; rút xong không nộp lại vào tin đó.
- "Phỏng vấn" bắt buộc nhập thời gian + địa điểm/hình thức. Mỗi lần đổi trạng thái: thông báo trong web luôn gửi; email gửi theo lựa chọn của NTD (mặc định có).

### 5.3 Xác minh công ty
`UNVERIFIED → PENDING` (NTD gửi giấy phép, cần có MST) → `VERIFIED` hoặc `REJECTED` (kèm lý do, NTD gửi lại được). Admin có thể thu hồi xác minh. Công ty đã xác minh có dấu ✔ trên tin và trang công ty.

### 5.4 Đề xuất việc làm (CAN-13)

**Bước 1 – Chấm điểm (luôn chạy, miễn phí, < 1 giây):** với 500 tin đang tuyển mới nhất, bỏ tin đã ứng tuyển, tính điểm 0–100:

| Thành phần | Tối đa | Cách tính |
|---|:-:|---|
| Kỹ năng | 40 | Tỷ lệ kỹ năng của tin mà hồ sơ có |
| Chức danh | 15 | Từ khóa chung giữa tiêu đề nghề nghiệp và chức danh tin (bỏ dấu, bỏ từ chung) |
| Ngành quan tâm | 15 | Ngành của các tin đã ứng tuyển (×2) / đã lưu (×1) |
| Địa điểm | 10 | Cùng tỉnh hoặc làm từ xa = 10; không rõ = 5 |
| Kinh nghiệm | 10 | Đủ = 10; thiếu 1 năm = 5; dư > 5 năm = 6 |
| Lương | 10 | Đáp ứng mong muốn = 10; ≥ 85% = 5; thỏa thuận/không rõ = 6 |

Chỉ hiện tin ≥ 25 điểm, tối đa 20 tin; kèm lý do theo quy tắc và gợi ý hoàn thiện hồ sơ.

**Bước 2 – Nhận xét AI (tùy chọn, khi có `ANTHROPIC_API_KEY`):** gửi 8 tin đứng đầu + hồ sơ **đã ẩn danh** (chỉ tiêu đề, giới thiệu ≤ 600 ký tự, kỹ năng, số năm KN, tỉnh, lương mong muốn – không họ tên/email/SĐT/địa chỉ) cho Claude (`claude-haiku-5-5`), nhận về nhận xét chung + lý do & gợi ý cho từng tin. Kết quả cache 6 giờ, tối đa 10 lần/giờ/người; lỗi AI không ảnh hưởng danh sách. Giao diện ghi rõ nội dung do AI tạo, chỉ mang tính tham khảo.

### 5.5 Giới hạn & cấu hình (admin chỉnh được)

| Cấu hình | Mặc định | Khoảng hợp lệ |
|---|---|---|
| Thời hạn tin mặc định | 30 ngày | 1–365 |
| Hạn nộp tối đa khi đăng/gia hạn | 90 ngày | 7–365 |
| Dung lượng CV tối đa | 5 MB | 1–20 |
| Số CV / ứng viên | 5 | 1–20 |
| Số job alert / ứng viên | 5 | 1–20 |
| Banner trang chủ, thông báo chung | – | ≤ 120 / 200 / 300 ký tự |

Giới hạn cố định: ảnh đại diện/logo ≤ 2MB, ảnh bìa ≤ 3MB (JPG/PNG/WEBP); giấy phép ≤ 5MB; 1–3 ngành, ≤ 15 kỹ năng mỗi tin; mật khẩu 8–64 ký tự gồm chữ và số.

---

## 6. Yêu cầu phi chức năng

### 6.1 Bảo mật & quyền riêng tư (P0)
- Mật khẩu băm **scrypt** (salt ngẫu nhiên); token 1 lần & refresh token chỉ lưu **hash SHA-256**.
- CV và giấy phép **không có URL công khai**: chỉ truy cập qua **link có chữ ký HMAC, hết hạn 5 phút**, cấp sau khi kiểm tra quyền.
- File upload kiểm tra **đuôi + MIME + nội dung (magic bytes)**; chặn path traversal.
- Nội dung có định dạng được làm sạch bằng sanitize-html (chỉ giữ thẻ định dạng, link ép `rel="nofollow noopener"`).
- Validate mọi input (class-validator), truy vấn tham số hóa, Helmet, CORS giới hạn domain, body ≤ 1MB.
- **Rate limit**: mặc định 300 request/phút/IP; đăng ký 5/phút, đăng nhập 10/phút, quên mật khẩu 3/5 phút, báo cáo 5/10 phút…
- Hồ sơ ứng viên chỉ hiện trong tìm kiếm của NTD khi ứng viên **chủ động bật**.
- Production từ chối khởi động nếu khóa JWT yếu; Swagger tắt trên production.

### 6.2 Hiệu năng
- API danh sách/tìm kiếm phản hồi **p95 < 500 ms** với 50.000 tin (có index trên trạng thái, hạn nộp, địa điểm, công ty).
- Trang chủ & danh sách việc làm hiển thị nội dung đầu tiên **< 2,5 giây** trên 4G (LCP).
- Phân trang tối đa 50 bản ghi / request.

### 6.3 Độ tin cậy & vận hành
- Mục tiêu sẵn sàng **99,5%/tháng**.
- Backup database + file upload **hằng ngày**, giữ **14 ngày**, có kiểm tra file backup (RESTORE VERIFYONLY); thử khôi phục định kỳ.
- Mỗi request có `X-Request-Id`; log 4xx/5xx; lỗi 5xx không lộ chi tiết kỹ thuật.
- Migration database tự chạy khi deploy; HTTPS tự cấp/gia hạn (Caddy).

### 6.4 Trải nghiệm & tiếp cận
- Responsive từ 360px; menu mobile; bảng cuộn ngang; modal dạng bottom-sheet trên mobile.
- Trạng thái luôn có **nhãn chữ** (không chỉ màu); skeleton khi tải; empty state có gợi ý hành động; toast khi thao tác thành công.
- Form báo lỗi ngay tại từng ô, khớp quy tắc với API.
- Có liên kết "Bỏ qua tới nội dung", nhãn ARIA cho nút biểu tượng; biểu đồ có bảng số liệu thay thế.

### 6.5 SEO
- Title/description/Open Graph riêng mỗi trang; URL thân thiện (`/jobs/lap-trinh-vien-reactjs-a1b2c3`).
- Dữ liệu cấu trúc **schema.org/JobPosting** (Google for Jobs); `sitemap.xml`; `robots.txt` chặn khu vực quản lý.
- Hạn chế đã biết: preview khi chia sẻ Facebook/Zalo chỉ hiện thẻ mặc định (cần SSR/prerender – §11).

### 6.6 Tương thích
Chrome, Edge, Firefox, Safari 2 phiên bản gần nhất; iOS Safari / Android Chrome. Node.js ≥ 20.19, SQL Server 2019+ / Azure SQL.

---

## 7. Mô hình dữ liệu (tóm tắt)

32 bảng trên SQL Server, quản lý bằng TypeORM migration:

- **Tài khoản:** `users`, `refresh_tokens`, `user_tokens`
- **Ứng viên:** `candidate_profiles`, `educations`, `experiences`, `candidate_skills`, `resumes`
- **Công ty:** `companies`, `employer_profiles`, `company_invitations`, `company_reviews`
- **Tuyển dụng:** `jobs`, `job_categories`, `job_skills`, `applications`
- **Danh mục:** `categories`, `skills`, `locations`
- **Tương tác:** `saved_jobs`, `followed_companies`, `job_alerts`, `notifications`, `reports`, `application_messages`
- **Gói dịch vụ:** `service_plans`, `plan_orders`, `candidate_unlocks`
- **Vận hành:** `audit_logs`, `static_pages`, `settings`, `email_outbox`

Chi tiết cột: `api/src/modules/*/entities/*.entity.ts`.

---

## 8. Tích hợp

| Tích hợp | Mục đích | Trạng thái |
|---|---|---|
| SMTP (Nodemailer) | Email xác minh, đặt lại mật khẩu, thư mời PV/từ chối, job alert | ✅ (dev: in ra console; production: cấu hình `SMTP_*`) |
| Lưu file | CV, logo, giấy phép | ✅ ổ đĩa / volume Docker · ⬜ S3/Cloudinary |
| Google for Jobs | Hiển thị tin trên Google | ✅ JobPosting JSON-LD |
| Claude API (Anthropic) | Nhận xét & lý do cho việc làm gợi ý | ✅ tùy chọn (`ANTHROPIC_API_KEY`) |
| Hàng đợi email | Gửi email nền, tự thử lại (1→5→30→120→360 phút), admin xem & gửi lại | ✅ bảng `email_outbox` trong SQL Server (an toàn khi chạy nhiều instance) |
| Realtime (Server-Sent Events) | Chuông thông báo cập nhật tức thì + toast | ✅ (1 instance; nhiều instance cần Redis pub/sub) |

---

## 9. Chỉ số thành công (KPI)

| Chỉ số | Định nghĩa | Mục tiêu 3 tháng sau ra mắt |
|---|---|---|
| Tỷ lệ chuyển đổi xem → ứng tuyển | Số đơn / lượt xem tin | ≥ 5% |
| Thời gian phản hồi của NTD | Trung vị từ lúc nộp đến khi đơn được xem | ≤ 48 giờ |
| Tỷ lệ đơn được xử lý | Đơn rời trạng thái "Đã nộp" / tổng đơn | ≥ 70% |
| Thời gian duyệt tin | Trung vị từ gửi duyệt đến kết quả | ≤ 24 giờ |
| Tin vi phạm | Báo cáo được xác nhận / tin đã duyệt | < 1% |
| Ứng viên quay lại | Ứng viên hoạt động lại trong 30 ngày | ≥ 30% |
| Hồ sơ công khai | Ứng viên bật "cho phép NTD tìm thấy" | ≥ 40% |

Nguồn số liệu: dashboard NTD & admin; các chỉ số thời gian lấy từ `applications.status_changed_at` và `audit_logs`.

---

## 10. Phát hành

| Đợt | Nội dung | Trạng thái |
|---|---|---|
| **MVP** | Xác thực; ứng viên tìm việc & ứng tuyển; NTD đăng tin & xử lý ứng viên; admin kiểm duyệt | ✅ Hoàn thành code + test |
| **v1.0 – Ra mắt** | Deploy VPS + HTTPS + backup; SMTP thật; E2E xanh trên CI; đổi mật khẩu admin | ⏳ Chờ VPS/tên miền |
| **v1.1** | Nhiều NTD/công ty ✅, chat ✅, đánh giá công ty ✅, CV online ✅, gói dịch vụ (thanh toán giả lập) ✅; lưu file S3 ⬜ | ⏳ |
| **v2** | Các mục §11 | ⬜ |

**Điều kiện ra mắt (Definition of Done v1.0):** toàn bộ P0 ✅; unit test + E2E xanh trên CI; kiểm tra sau deploy trong `docs/trien-khai.md` hoàn tất; backup đã thử khôi phục thành công.

---

## 11. Ngoài phạm vi / Hướng mở rộng

- Gợi ý việc làm nâng cao: embedding ngữ nghĩa, học từ hành vi (click, ứng tuyển, kết quả tuyển); hiển thị % phù hợp trên trang chi tiết tin, trang chủ, email hằng tuần.
- Lịch phỏng vấn đồng bộ Google Calendar; gửi file trong chat; email nhắc tin nhắn chưa đọc.
- Cổng thanh toán thật (VNPay / MoMo) thay cho xác nhận chuyển khoản thủ công; xuất hoá đơn điện tử.
- Thêm mẫu CV, kéo thả sắp xếp mục.
- Đa ngôn ngữ (Việt/Anh); ứng dụng di động.
- SSR/prerender cho trang tin & công ty để preview mạng xã hội đẹp.
- Tìm kiếm nâng cao (SQL Server Full-Text / Meilisearch) khi dữ liệu lớn.

---

## 12. Rủi ro & giả định

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Tin lừa đảo lọt kiểm duyệt | Mất niềm tin ứng viên | Kiểm duyệt trước, xác minh công ty, nút báo cáo + cảnh báo trên trang tin, khóa tài khoản vi phạm |
| Lộ dữ liệu cá nhân (CV) | Pháp lý (Nghị định 13/2023/NĐ-CP), uy tín | Link có chữ ký, kiểm tra quyền sở hữu, ứng viên chủ động công khai hồ sơ; cần bổ sung quy trình xóa dữ liệu theo yêu cầu |
| SQL Server Express giới hạn 10GB/DB | Không mở rộng được khi lớn | Theo dõi dung lượng; chuyển bản Standard hoặc Azure SQL |
| Email vào spam | Ứng viên không nhận thư mời PV | Dùng SMTP có SPF/DKIM; luôn có thông báo trong web |
| AI nhận xét sai / chi phí API tăng | Ứng viên hiểu nhầm, tốn tiền | Chỉ dùng AI để giải thích (xếp hạng do thuật toán), chỉ nhận jobId hợp lệ, nhãn "tham khảo", cache 6h + giới hạn 10 lần/giờ; tắt bằng cách bỏ API key |
| Một instance API (rate limit, realtime, job alert trong bộ nhớ) | Không scale ngang | Chuyển rate limit & realtime sang Redis khi cần nhiều instance (hàng đợi email đã an toàn) |

**Giả định:** người dùng có email hợp lệ; NTD tự chịu trách nhiệm nội dung tin; nền tảng miễn phí ở v1.0.

---

## 13. Câu hỏi mở

1. Có cần quy trình **xóa tài khoản / xuất dữ liệu cá nhân** theo yêu cầu người dùng trước khi ra mắt không?
2. Thời gian lưu CV của ứng viên không còn hoạt động (đề xuất: 24 tháng)?
3. NTD chưa xác minh có được đăng tin không, hay bắt buộc xác minh trước? (Hiện tại: được đăng, admin xem trạng thái công ty khi duyệt.)
4. Mô hình doanh thu cho v2 (gói tin nổi bật, phí tìm hồ sơ, hay quảng cáo)?

---

## Phụ lục – Tài khoản demo (môi trường dev, sau `npm run seed`)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Super admin | admin@jobportal.local | Admin@123 |
| Nhà tuyển dụng | ntd1@demo.local, ntd2@demo.local | Demo@123 |
| Nhà tuyển dụng (thành viên công ty của ntd1) | ntd3@demo.local | Demo@123 |
| Ứng viên | uv1@demo.local, uv2@demo.local | Demo@123 |
