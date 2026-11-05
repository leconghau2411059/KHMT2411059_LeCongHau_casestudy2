const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../src/validators/assignmentValidator');

const ID1 = '64b7f0c2a1b2c3d4e5f60718';
const ID2 = '64b7f0c2a1b2c3d4e5f60719';

test('validateAssign: cần ít nhất một người', () => {
  assert.ok(v.validateAssign({}).errors.userIds);
  assert.ok(v.validateAssign({ userIds: [] }).errors.userIds);
});

test('validateAssign: hợp lệ, loại trùng, chuẩn hóa email', () => {
  const { value, errors } = v.validateAssign({
    userIds: [ID1, ID1, ID2], emails: [' A@Example.com ', 'a@example.com'],
  });
  assert.deepEqual(errors, {});
  assert.deepEqual(value.userIds, [ID1, ID2]);
  assert.deepEqual(value.emails, ['a@example.com']);
});

test('validateAssign: từ chối id/email sai và quá nhiều người', () => {
  assert.ok(v.validateAssign({ userIds: ['abc'] }).errors.userIds);
  assert.ok(v.validateAssign({ emails: ['khong-phai-email'] }).errors.emails);
  assert.ok(v.validateAssign({ primaryUserId: 'x', userIds: [ID1] }).errors.primaryUserId);
  const many = Array.from({ length: 21 }, (_, i) => `u${i}@example.com`);
  assert.ok(v.validateAssign({ emails: many }).errors.userIds);
});

test('validateShare: userId hoặc email + quyền hợp lệ', () => {
  assert.deepEqual(v.validateShare({ userId: ID1, permission: 'viewer' }).errors, {});
  assert.deepEqual(v.validateShare({ email: 'B@x.com', permission: 'editor' }).value.email, 'b@x.com');
  assert.ok(v.validateShare({ permission: 'viewer' }).errors.userId);
  assert.ok(v.validateShare({ userId: ID1, permission: 'admin' }).errors.permission);
});

test('validateShareUpdate / validateAssigneeUpdate', () => {
  assert.ok(v.validateShareUpdate({ permission: 'owner' }).errors.permission);
  assert.deepEqual(v.validateShareUpdate({ permission: 'editor' }).errors, {});
  assert.ok(v.validateAssigneeUpdate({}).errors.isPrimary);
  assert.deepEqual(v.validateAssigneeUpdate({ isPrimary: true }).errors, {});
});
