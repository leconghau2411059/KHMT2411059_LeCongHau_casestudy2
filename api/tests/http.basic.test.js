// Các test này KHÔNG cần MongoDB: chúng dừng lại ở bước kiểm tra đầu vào / token.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, call } = require('./helpers');

let server;
let base;

test.before(async () => {
  ({ server, base } = await startServer());
});
test.after(() => server.close());

test('GET /health trả về ok', async () => {
  const r = await call(base, 'GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('API riêng tư không có token → 401', async () => {
  for (const path of ['/auth/me', '/users/search?q=ab', '/tasks', '/tasks/65f000000000000000000001']) {
    const r = await call(base, 'GET', path);
    assert.equal(r.status, 401, path);
  }
});

test('token sai → 401', async () => {
  const r = await call(base, 'GET', '/auth/me', { token: 'khong.phai.jwt' });
  assert.equal(r.status, 401);
});

test('đăng ký với dữ liệu sai → 400 kèm danh sách lỗi theo trường', async () => {
  const r = await call(base, 'POST', '/auth/register', { body: { fullName: '', email: 'x', password: '1' } });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.fullName && r.body.errors.email && r.body.errors.password);
});

test('đăng nhập thiếu mật khẩu → 400', async () => {
  const r = await call(base, 'POST', '/auth/login', { body: { email: 'a@b.co' } });
  assert.equal(r.status, 400);
});

test('JSON sai cú pháp → 400 (không lộ chi tiết lỗi)', async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{khong-phai-json',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(typeof body.message, 'string');
  assert.equal(body.stack, undefined);
});

test('đường dẫn không tồn tại → 404', async () => {
  const r = await call(base, 'GET', '/khong-co');
  assert.equal(r.status, 404);
});

test('API giao việc và chia sẻ yêu cầu đăng nhập → 401', async () => {
  const id = '64b7f0c2a1b2c3d4e5f60718';
  for (const [method, path] of [
    ['GET', `/tasks/${id}/assignees`],
    ['POST', `/tasks/${id}/assignees`],
    ['DELETE', `/tasks/${id}/assignees/${id}`],
    ['GET', `/tasks/${id}/shares`],
    ['POST', `/tasks/${id}/shares`],
    ['PATCH', `/tasks/${id}/shares/${id}`],
  ]) {
    const r = await call(base, method, path);
    assert.equal(r.status, 401, `${method} ${path}`);
  }
});

test('API thông báo và email-log yêu cầu đăng nhập → 401', async () => {
  const id = '64b7f0c2a1b2c3d4e5f60718';
  for (const [method, path] of [
    ['GET', '/notifications'],
    ['GET', '/notifications/unread-count'],
    ['PATCH', '/notifications/read-all'],
    ['PATCH', `/notifications/${id}/read`],
    ['GET', `/tasks/${id}/email-logs`],
    ['POST', `/email-logs/${id}/retry`],
  ]) {
    assert.equal((await call(base, method, path)).status, 401, `${method} ${path}`);
  }
});

test('API thống kê yêu cầu đăng nhập → 401', async () => {
  for (const p of ['/statistics/tasks', '/statistics/assignments', '/statistics/deadlines']) {
    assert.equal((await call(base, 'GET', p)).status, 401, p);
  }
});
