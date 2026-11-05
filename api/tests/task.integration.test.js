// Cần MongoDB thật: đặt MONGODB_URI_TEST (database kết thúc bằng "_test").
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, call, integrationEnabled, skipReason, connectTestDb, disconnectTestDb, registerAndLogin,
} = require('./helpers');

const opts = { skip: integrationEnabled ? false : skipReason };
let server;
let base;
let owner;
let other;

test.before(async () => {
  if (!integrationEnabled) return;
  await connectTestDb();
  ({ server, base } = await startServer());
  owner = await registerAndLogin(base, 'Chủ Việc', 'owner@example.com');
  other = await registerAndLogin(base, 'Người Khác', 'other@example.com');
});
test.after(async () => {
  if (!integrationEnabled) return;
  server.close();
  await disconnectTestDb();
});

test('tạo, xem, sửa, đổi trạng thái công việc', opts, async () => {
  const created = await call(base, 'POST', '/tasks', {
    token: owner.token,
    body: { title: 'Viết báo cáo', priority: 'high', dueDate: '2030-01-01T00:00:00Z' },
  });
  assert.equal(created.status, 201);
  const id = created.body.task.id;
  assert.equal(created.body.task.myRole, 'owner');
  assert.equal(created.body.task.status, 'todo');

  const got = await call(base, 'GET', `/tasks/${id}`, { token: owner.token });
  assert.equal(got.status, 200);
  assert.equal(got.body.task.title, 'Viết báo cáo');

  const upd = await call(base, 'PUT', `/tasks/${id}`, { token: owner.token, body: { title: 'Báo cáo tuần' } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.task.title, 'Báo cáo tuần');

  const st = await call(base, 'PATCH', `/tasks/${id}/status`, { token: owner.token, body: { status: 'in_progress' } });
  assert.equal(st.body.task.status, 'in_progress');

  const acts = await call(base, 'GET', `/tasks/${id}/activities`, { token: owner.token });
  const actions = acts.body.activities.map((a) => a.action);
  assert.ok(actions.includes('created') && actions.includes('updated') && actions.includes('status_changed'));
});

test('người lạ không thấy, không sửa, không xóa được công việc (404)', opts, async () => {
  const created = await call(base, 'POST', '/tasks', { token: owner.token, body: { title: 'Việc riêng' } });
  const id = created.body.task.id;

  assert.equal((await call(base, 'GET', `/tasks/${id}`, { token: other.token })).status, 404);
  assert.equal((await call(base, 'PUT', `/tasks/${id}`, { token: other.token, body: { title: 'X' } })).status, 404);
  assert.equal((await call(base, 'DELETE', `/tasks/${id}`, { token: other.token })).status, 404);

  const list = await call(base, 'GET', '/tasks', { token: other.token });
  assert.equal(list.body.total, 0);
});

test('danh sách: tìm kiếm, lọc, sắp xếp, phân trang', opts, async () => {
  const mkTask = (body) => call(base, 'POST', '/tasks', { token: owner.token, body });
  await mkTask({ title: 'Alpha lọc', priority: 'low', dueDate: '2031-03-01T00:00:00Z' });
  await mkTask({ title: 'Beta lọc', priority: 'high', dueDate: '2031-01-01T00:00:00Z' });
  await mkTask({ title: 'Gamma lọc', priority: 'medium' });

  const search = await call(base, 'GET', '/tasks?q=beta', { token: owner.token });
  assert.equal(search.body.total, 1);

  const high = await call(base, 'GET', '/tasks?priority=high&q=l%E1%BB%8Dc', { token: owner.token });
  assert.equal(high.body.tasks.length, 1);

  const byDue = await call(base, 'GET', '/tasks?q=l%E1%BB%8Dc&sortBy=dueDate&order=asc', { token: owner.token });
  assert.deepEqual(byDue.body.tasks.map((t) => t.title), ['Beta lọc', 'Alpha lọc', 'Gamma lọc']);

  const page = await call(base, 'GET', '/tasks?q=l%E1%BB%8Dc&limit=2&page=2', { token: owner.token });
  assert.equal(page.body.tasks.length, 1);
  assert.equal(page.body.total, 3);

  const created = await call(base, 'GET', '/tasks?scope=created&q=l%E1%BB%8Dc', { token: owner.token });
  assert.equal(created.body.total, 3);
  const assigned = await call(base, 'GET', '/tasks?scope=assigned', { token: owner.token });
  assert.equal(assigned.body.total, 0);
});

test('dữ liệu sai bị từ chối (400) và chỉ người tạo mới xóa được', opts, async () => {
  const bad = await call(base, 'POST', '/tasks', { token: owner.token, body: { title: '' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.title);

  const badDates = await call(base, 'POST', '/tasks', {
    token: owner.token,
    body: { title: 'Ngày sai', startDate: '2030-02-01T00:00:00Z', dueDate: '2030-01-01T00:00:00Z' },
  });
  assert.equal(badDates.status, 400);

  const created = await call(base, 'POST', '/tasks', { token: owner.token, body: { title: 'Sẽ xóa' } });
  const id = created.body.task.id;
  assert.equal((await call(base, 'GET', '/tasks/khong-phai-id', { token: owner.token })).status, 400);
  assert.equal((await call(base, 'DELETE', `/tasks/${id}`, { token: owner.token })).status, 200);
  assert.equal((await call(base, 'GET', `/tasks/${id}`, { token: owner.token })).status, 404);
});
