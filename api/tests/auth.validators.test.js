const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validators/authValidator');

test('đăng ký hợp lệ: làm sạch họ tên và email', () => {
  const { value, errors } = v.validateRegister({
    fullName: '  Lê Công Hậu ',
    email: '  HAU@Example.com ',
    password: 'Matkhau123',
    confirmPassword: 'Matkhau123',
  });
  assert.deepEqual(errors, {});
  assert.equal(value.fullName, 'Lê Công Hậu');
  assert.equal(value.email, 'hau@example.com');
});

test('đăng ký: bắt các lỗi phổ biến', () => {
  const { errors } = v.validateRegister({ fullName: 'A', email: 'khong-phai-email', password: '123' });
  assert.ok(errors.fullName);
  assert.ok(errors.email);
  assert.ok(errors.password);
});

test('đăng ký: mật khẩu phải có cả chữ và số', () => {
  assert.ok(v.validateRegister({ fullName: 'Ab', email: 'a@b.co', password: 'chiconchu' }).errors.password);
  assert.ok(v.validateRegister({ fullName: 'Ab', email: 'a@b.co', password: '12345678' }).errors.password);
  assert.deepEqual(v.validateRegister({ fullName: 'Ab', email: 'a@b.co', password: 'abc12345' }).errors, {});
});

test('đăng ký: mật khẩu quá 72 ký tự bị từ chối (giới hạn bcrypt)', () => {
  const { errors } = v.validateRegister({ fullName: 'Ab', email: 'a@b.co', password: 'a1'.repeat(40) });
  assert.ok(errors.password);
});

test('đăng ký: xác nhận mật khẩu không khớp', () => {
  const { errors } = v.validateRegister({
    fullName: 'Ab', email: 'a@b.co', password: 'abc12345', confirmPassword: 'khac12345',
  });
  assert.ok(errors.confirmPassword);
});

test('đăng nhập: thiếu trường bị báo lỗi', () => {
  const { errors } = v.validateLogin({});
  assert.ok(errors.email);
  assert.ok(errors.password);
});

test('cập nhật hồ sơ: phải có ít nhất một trường, ảnh phải là URL http(s)', () => {
  assert.ok(Object.keys(v.validateUpdateProfile({}).errors).length > 0);
  assert.ok(v.validateUpdateProfile({ avatarUrl: 'javascript:alert(1)' }).errors.avatarUrl);
  const ok = v.validateUpdateProfile({ fullName: 'Tên Mới', avatarUrl: 'https://x.com/a.png' });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.value.fullName, 'Tên Mới');
});

test('đổi mật khẩu: mật khẩu mới phải khác mật khẩu cũ và đủ mạnh', () => {
  assert.ok(v.validateChangePassword({ currentPassword: 'abc12345', newPassword: 'abc12345' }).errors.newPassword);
  assert.ok(v.validateChangePassword({ currentPassword: 'abc12345', newPassword: 'ngan' }).errors.newPassword);
  assert.deepEqual(
    v.validateChangePassword({ currentPassword: 'abc12345', newPassword: 'moi12345' }).errors,
    {}
  );
});
