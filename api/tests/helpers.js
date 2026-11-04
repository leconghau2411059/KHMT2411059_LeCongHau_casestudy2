// Thiết lập biến môi trường cho test TRƯỚC khi nạp ứng dụng.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-chi-dung-cho-test';
process.env.REMINDER_ENABLED = 'false';

const mongoose = require('mongoose');
const app = require('../src/app');

/** Bật server trên cổng ngẫu nhiên, trả về { server, base }. */
function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/api` });
    });
  });
}

/** Gọi API, trả về { status, body }. */
async function call(base, method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

/**
 * Test tích hợp cần MongoDB thật. Đặt biến MONGODB_URI_TEST, ví dụ:
 *   MONGODB_URI_TEST=mongodb://localhost:27017/task_manager_test
 * Tên database BẮT BUỘC kết thúc bằng "_test" vì test sẽ XÓA toàn bộ dữ liệu của database đó.
 */
const testUri = process.env.MONGODB_URI_TEST;
const integrationEnabled = Boolean(testUri);
const skipReason = 'Bỏ qua: chưa đặt MONGODB_URI_TEST';

async function connectTestDb() {
  const dbName = new URL(testUri).pathname.replace('/', '');
  if (!dbName.endsWith('_test')) {
    throw new Error('MONGODB_URI_TEST phải trỏ tới database có tên kết thúc bằng "_test"');
  }
  await mongoose.connect(testUri);
  await mongoose.connection.dropDatabase();
  await mongoose.syncIndexes();
}

async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Đăng ký + đăng nhập, trả về { token, user }. */
async function registerAndLogin(base, name, email, password = 'Matkhau123') {
  await call(base, 'POST', '/auth/register', { body: { fullName: name, email, password } });
  const { body } = await call(base, 'POST', '/auth/login', { body: { email, password } });
  return { token: body.token, user: body.user };
}

module.exports = {
  startServer,
  call,
  integrationEnabled,
  skipReason,
  connectTestDb,
  disconnectTestDb,
  registerAndLogin,
};
