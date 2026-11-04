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
  for (const path of ['/auth/me', '/users/search?q=ab']) {
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
