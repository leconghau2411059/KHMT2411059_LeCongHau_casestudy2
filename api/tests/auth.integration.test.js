// Cần MongoDB thật: đặt MONGODB_URI_TEST (database kết thúc bằng "_test").
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, call, integrationEnabled, skipReason, connectTestDb, disconnectTestDb,
} = require('./helpers');

const opts = { skip: integrationEnabled ? false : skipReason };
let server;
let base;

test.before(async () => {
  if (!integrationEnabled) return;
  await connectTestDb();
  ({ server, base } = await startServer());
});
test.after(async () => {
  if (!integrationEnabled) return;
  server.close();
  await disconnectTestDb();
});

const account = { fullName: 'Nguyễn Văn A', email: 'a@example.com', password: 'Matkhau123' };

test('đăng ký → đăng nhập → /auth/me, không lộ mật khẩu', opts, async () => {
  const reg = await call(base, 'POST', '/auth/register', { body: account });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.passwordHash, undefined);
  assert.equal(reg.body.user.password, undefined);

  const login = await call(base, 'POST', '/auth/login', {
    body: { email: account.email, password: account.password },
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const me = await call(base, 'GET', '/auth/me', { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, account.email);
  assert.equal(me.body.user.passwordHash, undefined);
});

test('đăng ký trùng email (không phân biệt hoa thường) → 409', opts, async () => {
  const r = await call(base, 'POST', '/auth/register', {
    body: { ...account, email: 'A@Example.com' },
  });
  assert.equal(r.status, 409);
});

test('đăng nhập sai mật khẩu hoặc email không tồn tại → 401 cùng một thông điệp', opts, async () => {
  const wrongPass = await call(base, 'POST', '/auth/login', {
    body: { email: account.email, password: 'SaiMatKhau1' },
  });
  const noUser = await call(base, 'POST', '/auth/login', {
    body: { email: 'khongco@example.com', password: 'Matkhau123' },
  });
  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  assert.equal(wrongPass.body.message, noUser.body.message);
});

test('cập nhật hồ sơ và đổi mật khẩu', opts, async () => {
  const login = await call(base, 'POST', '/auth/login', {
    body: { email: account.email, password: account.password },
  });
  const token = login.body.token;

  const upd = await call(base, 'PUT', '/auth/me', { token, body: { fullName: 'Tên Mới' } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.user.fullName, 'Tên Mới');

  const wrong = await call(base, 'PUT', '/auth/change-password', {
    token, body: { currentPassword: 'SaiRoi123', newPassword: 'Moi12345678' },
  });
  assert.equal(wrong.status, 400);

  const ok = await call(base, 'PUT', '/auth/change-password', {
    token, body: { currentPassword: account.password, newPassword: 'Moi12345678' },
  });
  assert.equal(ok.status, 200);

  const relogin = await call(base, 'POST', '/auth/login', {
    body: { email: account.email, password: 'Moi12345678' },
  });
  assert.equal(relogin.status, 200);
});

test('tìm người dùng theo tên/email, không trả về chính mình', opts, async () => {
  await call(base, 'POST', '/auth/register', {
    body: { fullName: 'Trần Thị B', email: 'b@example.com', password: 'Matkhau123' },
  });
  const login = await call(base, 'POST', '/auth/login', {
    body: { email: account.email, password: 'Moi12345678' },
  });
  const r = await call(base, 'GET', '/users/search?q=tr%E1%BA%A7n', { token: login.body.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.users.length, 1);
  assert.equal(r.body.users[0].email, 'b@example.com');
  assert.equal(r.body.users[0].passwordHash, undefined);
});
