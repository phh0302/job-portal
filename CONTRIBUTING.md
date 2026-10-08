# Quy ước commit

Dùng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn>
```

| type | Khi nào dùng |
|---|---|
| `feat` | Thêm tính năng |
| `fix` | Sửa lỗi |
| `refactor` | Sửa code, không đổi hành vi |
| `docs` | Tài liệu |
| `style` | Format code |
| `test` | Thêm/sửa test |
| `chore` | Cấu hình, thư viện, build |

scope: `api`, `web`, `db`, `auth`, `job`, `admin`…

Ví dụ: `feat(job): nhà tuyển dụng tạo tin tuyển dụng`

Nhánh: `main` (ổn định) · `develop` · `feature/<tên>` · `fix/<tên>`
