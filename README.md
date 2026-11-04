# Case Study 2 – Ứng dụng quản lý và giao công việc nhóm

- **MSSV:** KHMT2411059
- **Họ tên:** Lê Công Hậu
- **Công nghệ:** Flutter · Node.js/Express REST API · MongoDB · Email (SMTP)

## Cấu trúc repo

| Thư mục | Nội dung |
|---|---|
| `api/` | Backend Node.js + Express + MongoDB (Mongoose) |
| `TaskManager/` | Ứng dụng Flutter |

## Chạy backend (`api/`)

Yêu cầu: Node.js 20+ và MongoDB đang chạy (mặc định `mongodb://localhost:27017`).

```bash
cd api
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# mở .env và điền JWT_SECRET (chuỗi ngẫu nhiên dài)
npm start                 # API chạy tại http://localhost:3000/api
npm test                  # chạy test
```

## Chạy ứng dụng Flutter (`TaskManager/`)

```powershell
cd TaskManager
.\setup.ps1               # chỉ cần chạy một lần: tạo thư mục nền tảng + cấu hình mạng cho Android
flutter run               # bật máy ảo Android trước; API phải đang chạy
```

Máy ảo Android gọi tới máy tính qua `10.0.2.2` (đã cấu hình sẵn). Muốn trỏ tới địa chỉ khác:
`flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000/api`

## Các nhánh (mỗi chức năng lớn một nhánh)

| Nhánh | Chức năng |
|---|---|
| `a-xac-thuc` | A. Quản lý tài khoản và xác thực |
| `b-cong-viec` | B. Quản lý công việc |
| `c-giao-viec-chia-se` | C. Giao việc và chia sẻ |
| `d-thong-bao-email` | D. Thông báo qua email và trong ứng dụng |
| `e-thong-ke` | E. Thống kê và tiện ích |
