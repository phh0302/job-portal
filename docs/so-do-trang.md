# Sơ đồ trang & wireframe – JobPortal

## 1. Sơ đồ trang (sitemap)

```
/                         Trang chủ
├─ /jobs                  Danh sách việc làm (tìm kiếm + bộ lọc)
│  └─ /jobs/:slug         Chi tiết việc làm (ứng tuyển, lưu, báo cáo)
├─ /companies             Danh sách công ty
│  └─ /companies/:slug    Chi tiết công ty (theo dõi, việc đang tuyển)
├─ /pages/:slug           Trang tĩnh (giới thiệu, điều khoản, bảo mật)
├─ /login /register /forgot-password /reset-password /verify-email
├─ /notifications         Thông báo (mọi vai trò)
├─ /account/change-password
│
├─ /candidate             ỨNG VIÊN (sidebar)
│  ├─ profile             Hồ sơ: thông tin, avatar, kỹ năng, kinh nghiệm, học vấn
│  ├─ resumes             CV của tôi
│  ├─ applications        Việc đã ứng tuyển
│  ├─ saved-jobs          Việc đã lưu
│  ├─ followed-companies  Công ty theo dõi
│  └─ job-alerts          Thông báo việc làm qua email
│
├─ /employer              NHÀ TUYỂN DỤNG (sidebar)
│  ├─ (index)             Tổng quan + biểu đồ
│  ├─ jobs, jobs/new, jobs/:id/edit
│  ├─ applications, applications/:id
│  ├─ candidates, candidates/:id   Tìm hồ sơ công khai
│  ├─ company             Hồ sơ công ty + xác minh
│  └─ account
│
└─ /admin                 QUẢN TRỊ (sidebar, badge việc cần xử lý)
   ├─ (index)             Tổng quan + tăng trưởng
   ├─ jobs                Duyệt tin
   ├─ companies           Xác minh công ty
   ├─ reports             Báo cáo vi phạm
   ├─ users               Người dùng / tạo admin
   ├─ catalog             Ngành nghề, kỹ năng, tỉnh/thành
   ├─ content             Trang tĩnh + cấu hình hệ thống
   └─ audit               Nhật ký thao tác
```

## 2. Wireframe các trang chính

### Trang chủ
```
┌──────────────────────────────────────────────────────────────┐
│ JobPortal        Việc làm  Công ty   [🔔] [Tên] [Đăng xuất]  │  ← header dính, mobile: nút ☰
├──────────────────────────────────────────────────────────────┤
│        Tìm công việc phù hợp với bạn  (chỉnh trong admin)    │
│   [ Vị trí, kỹ năng, công ty…        ][Tỉnh/thành ▾][Tìm]    │
├──────────────────────────────────────────────────────────────┤
│ Việc làm mới nhất                              Xem tất cả →  │
│ ┌─────────────┐ ┌─────────────┐   (2 cột desktop, 1 cột mobile)
│ │Logo Tiêu đề♡│ │Logo Tiêu đề♡│                              │
│ │Công ty      │ │Công ty      │                              │
│ │[Lương][HN]..│ │[Lương][HCM] │                              │
│ └─────────────┘ └─────────────┘                              │
│ Công ty hàng đầu  [logo][logo][logo][logo][logo][logo]       │
│ Ngành nghề        [IT][Kinh doanh][Marketing]…               │
├──────────────────────────────────────────────────────────────┤
│ Giới thiệu · Điều khoản · Bảo mật           © JobPortal      │
└──────────────────────────────────────────────────────────────┘
```

### Danh sách việc làm
```
[ Từ khóa…                                    ][Tìm]
┌ Bộ lọc ─────────┐  Tìm thấy 128 việc làm        [Sắp xếp ▾]
│ Địa điểm ▾      │  ┌ JobCard ───────────────────────────┐
│ Ngành nghề ▾    │  └────────────────────────────────────┘
│ Mức lương ▾     │  ┌ JobCard ───────────────────────────┐
│ Loại hình ▾     │  └────────────────────────────────────┘
│ Cấp bậc ▾       │            ‹ 1 2 3 … 13 ›
│ Kinh nghiệm ▾   │
└─────────────────┘  (mobile: bộ lọc nằm trên danh sách)
```

### Chi tiết việc làm
```
┌ Tiêu đề, đăng x ngày trước · lượt xem ─────┐ ┌ Công ty ───────┐
│ Lương | Địa điểm | KN | Cấp bậc | …        │ │ Logo  Tên ✔    │
│ [Ứng tuyển ngay] [♡ Lưu]                    │ │ Quy mô, địa chỉ│
└─────────────────────────────────────────────┘ └────────────────┘
┌ Kỹ năng · Mô tả · Yêu cầu · Quyền lợi ─────┐ ┌ Cảnh báo lừa đảo│
└─────────────────────────────────────────────┘ │ ⚑ Báo cáo      │
Việc làm tương tự (2 cột)                        └────────────────┘
```

### Khu vực quản lý (ứng viên / NTD / admin)
```
┌ Sidebar ──────┐ ┌ Nội dung ──────────────────────────────────┐
│ Mục 1   (3)   │ │ Tiêu đề trang                 [+ Hành động] │
│ Mục 2         │ │ [Tab trạng thái …]                          │
│ …             │ │ Bảng / danh sách / form                     │
└───────────────┘ └─────────────────────────────────────────────┘
(mobile: sidebar chuyển thành thanh tab cuộn ngang ở trên)
```

## 3. Nguyên tắc giao diện

- Màu chính `brand-600` (#2563eb); trạng thái dùng nhãn màu + chữ (không chỉ dựa vào màu).
- Đang tải: skeleton; danh sách rỗng: khung viền đứt + gợi ý hành động.
- Thao tác thành công: toast góc dưới; lỗi form: hiển thị ngay trong form.
- Mọi bảng có cuộn ngang trên mobile; modal trượt từ dưới lên trên mobile.
