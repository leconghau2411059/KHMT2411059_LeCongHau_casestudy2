# API quản lý và giao công việc nhóm

Node.js 20+ · Express 5 · MongoDB (Mongoose) · JWT · Nodemailer.
Địa chỉ gốc: `http://localhost:3000/api`

## Cài đặt và chạy

```bash
npm install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
# điền JWT_SECRET (bắt buộc), MONGODB_URI, và SMTP_* nếu muốn gửi email thật
npm start
```

Không có `SMTP_HOST` thì email chỉ được ghi ra console (vẫn có nhật ký trong `email_logs`).
**Không commit file `.env`** (đã nằm trong `.gitignore`).

## Cấu trúc

```
src/
  config/       env.js, database.js, email.js
  models/       User, Task, TaskShare, Notification, EmailLog, TaskActivity
  middleware/   authenticate, kiểm tra quyền công việc, validate, xử lý lỗi
  validators/   kiểm tra dữ liệu vào (trả {value, errors})
  services/     taskService (quyền, lọc, sắp xếp), assignment, email, notification, reminder, statistics
  controllers/  routes/  utils/
tests/          node --test
```

## Phân quyền

| Vai trò | Xem | Sửa / đổi trạng thái | Xóa | Giao việc / chia sẻ |
|---|---|---|---|---|
| Người tạo (owner) | ✔ | ✔ | ✔ | ✔ |
| Người được giao hoặc chia sẻ quyền `editor` | ✔ | ✔ | ✘ | ✘ |
| Chia sẻ quyền `viewer` | ✔ | ✘ | ✘ | ✘ |
| Người khác | 404 (không lộ việc có tồn tại) | | | |

Quyền được kiểm tra ở backend cho mọi API công việc.

## Endpoint

Tất cả (trừ đăng ký/đăng nhập) cần header `Authorization: Bearer <token>`.

| Nhóm | Endpoint |
|---|---|
| Xác thực | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me`, `PUT /auth/change-password` |
| Người dùng | `GET /users/search?q=`, `GET /users/:id` |
| Công việc | `GET/POST /tasks`, `GET/PUT/DELETE /tasks/:id`, `PATCH /tasks/:id/status`, `GET /tasks/:id/activities` |
| Lọc danh sách | `scope=created\|assigned\|shared`, `status`, `priority`, `q`, `assigneeId`, `sortBy=createdAt\|dueDate\|priority`, `order=asc\|desc`, `page`, `limit` |
| Giao việc | `GET/POST /tasks/:id/assignees`, `PATCH/DELETE /tasks/:id/assignees/:userId` |
| Chia sẻ | `GET/POST /tasks/:id/shares`, `PATCH/DELETE /tasks/:id/shares/:shareId` |
| Thông báo | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Email | `GET /tasks/:id/email-logs`, `POST /email-logs/:id/retry` |
| Thống kê | `GET /statistics/tasks`, `/statistics/assignments`, `/statistics/deadlines?days=7` |

Lỗi trả về dạng `{ "message": "...", "errors": { "truong": "..." } }`; lỗi máy chủ chỉ trả thông báo chung, chi tiết ghi ở log server.

## Email và nhắc việc

- Gửi email khi: được giao việc, được chia sẻ hoặc đổi/thu hồi quyền, đổi hạn, hoàn thành, và nhắc việc sắp đến hạn (mặc định trước 24 giờ, kiểm tra mỗi 15 phút).
- Email gửi nền; mỗi email có một bản ghi trong `email_logs` (`pending/sending/sent/failed`, số lần thử, lỗi).
- Chỉ người tạo công việc được gửi lại email lỗi, tối đa `EMAIL_MAX_ATTEMPTS` lần; email đã gửi thành công không thể gửi lại (tránh gửi trùng).
- Mỗi công việc chỉ được nhắc hạn một lần; đổi hạn thì được nhắc lại.

## Kiểm thử

```bash
npm test
```

Các test không cần database chạy ngay. Test tích hợp (`*.integration.test.js`) cần MongoDB và sẽ tự bỏ qua nếu chưa đặt biến:

```bash
MONGODB_URI_TEST=mongodb://localhost:27017/task_manager_test npm test
# PowerShell: $env:MONGODB_URI_TEST="mongodb://localhost:27017/task_manager_test"; npm test
```

Tên database **phải kết thúc bằng `_test`** vì test sẽ xóa toàn bộ dữ liệu của database đó.
