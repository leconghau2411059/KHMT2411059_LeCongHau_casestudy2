// Cần MongoDB thật: đặt MONGODB_URI_TEST (database kết thúc bằng "_test").
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, call, integrationEnabled, skipReason, connectTestDb, disconnectTestDb, registerAndLogin,
} = require('./helpers');

const opts = { skip: integrationEnabled ? false : skipReason };
let server, base, owner, bob, carol, stranger;

test.before(async () => {
  if (!integrationEnabled) return;
  await connectTestDb();
  ({ server, base } = await startServer());
  owner = await registerAndLogin(base, 'Chủ Việc', 'owner@example.com');
  bob = await registerAndLogin(base, 'Bob', 'bob@example.com');
  carol = await registerAndLogin(base, 'Carol', 'carol@example.com');
  stranger = await registerAndLogin(base, 'Người Lạ', 'stranger@example.com');
});
test.after(async () => {
  if (!integrationEnabled) return;
  server.close();
  await disconnectTestDb();
});

const newTask = async (title = 'Việc nhóm') => {
  const r = await call(base, 'POST', '/tasks', { token: owner.token, body: { title } });
  return r.body.task.id;
};

test('giao việc cho nhiều người, người đầu là phụ trách chính, báo email không tồn tại', opts, async () => {
  const id = await newTask();
  const r = await call(base, 'POST', `/tasks/${id}/assignees`, {
    token: owner.token,
    body: { userIds: [bob.user.id], emails: ['carol@example.com', 'khongco@example.com'] },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.added.length, 2);
  assert.deepEqual(r.body.notFound, ['khongco@example.com']);
  assert.equal(r.body.assignees.filter((a) => a.isPrimary).length, 1);

  // Giao lại không tạo bản ghi trùng
  const again = await call(base, 'POST', `/tasks/${id}/assignees`, {
    token: owner.token, body: { userIds: [bob.user.id] },
  });
  assert.equal(again.body.added.length, 0);
  assert.equal(again.body.task.assignees.length, 2);

  // Người được giao thấy việc ở scope assigned và có quyền sửa nhưng không xóa
  const mine = await call(base, 'GET', '/tasks?scope=assigned', { token: bob.token });
  assert.equal(mine.body.total, 1);
  assert.equal(mine.body.tasks[0].myRole, 'editor');
  assert.equal((await call(base, 'DELETE', `/tasks/${id}`, { token: bob.token })).status, 403);
});

test('đổi và gỡ người phụ trách chính', opts, async () => {
  const id = await newTask();
  await call(base, 'POST', `/tasks/${id}/assignees`, {
    token: owner.token, body: { userIds: [bob.user.id, carol.user.id] },
  });
  const set = await call(base, 'PATCH', `/tasks/${id}/assignees/${carol.user.id}`, {
    token: owner.token, body: { isPrimary: true },
  });
  assert.equal(set.body.task.primaryAssignee.id, carol.user.id);

  const del = await call(base, 'DELETE', `/tasks/${id}/assignees/${carol.user.id}`, { token: owner.token });
  assert.equal(del.status, 200);
  assert.equal(del.body.task.primaryAssignee.id, bob.user.id);

  const missing = await call(base, 'DELETE', `/tasks/${id}/assignees/${carol.user.id}`, { token: owner.token });
  assert.equal(missing.status, 404);
});

test('chỉ người tạo được giao việc và quản lý chia sẻ', opts, async () => {
  const id = await newTask();
  await call(base, 'POST', `/tasks/${id}/assignees`, { token: owner.token, body: { userIds: [bob.user.id] } });
  const forbidden = await call(base, 'POST', `/tasks/${id}/assignees`, {
    token: bob.token, body: { userIds: [carol.user.id] },
  });
  assert.equal(forbidden.status, 403);
  const forbiddenShare = await call(base, 'POST', `/tasks/${id}/shares`, {
    token: bob.token, body: { userId: carol.user.id, permission: 'viewer' },
  });
  assert.equal(forbiddenShare.status, 403);
  const hidden = await call(base, 'POST', `/tasks/${id}/assignees`, {
    token: stranger.token, body: { userIds: [carol.user.id] },
  });
  assert.equal(hidden.status, 404);
});

test('chia sẻ viewer/editor, đổi quyền, thu hồi', opts, async () => {
  const id = await newTask();
  const share = await call(base, 'POST', `/tasks/${id}/shares`, {
    token: owner.token, body: { email: 'bob@example.com', permission: 'viewer' },
  });
  assert.equal(share.status, 201);
  const shareId = share.body.share.id;

  // viewer: xem được, không sửa được, không đổi trạng thái
  assert.equal((await call(base, 'GET', `/tasks/${id}`, { token: bob.token })).body.task.myRole, 'viewer');
  assert.equal((await call(base, 'PUT', `/tasks/${id}`, { token: bob.token, body: { title: 'Hack' } })).status, 403);
  assert.equal((await call(base, 'PATCH', `/tasks/${id}/status`, {
    token: bob.token, body: { status: 'completed' },
  })).status, 403);
  assert.equal((await call(base, 'GET', '/tasks?scope=shared', { token: bob.token })).body.total, 1);

  // chia sẻ lại = cập nhật quyền, không tạo bản ghi trùng
  const upsert = await call(base, 'POST', `/tasks/${id}/shares`, {
    token: owner.token, body: { userId: bob.user.id, permission: 'editor' },
  });
  assert.equal(upsert.status, 200);
  assert.equal((await call(base, 'GET', `/tasks/${id}/shares`, { token: owner.token })).body.shares.length, 1);

  // editor: sửa được, nhưng không xóa, không quản lý chia sẻ
  assert.equal((await call(base, 'PUT', `/tasks/${id}`, { token: bob.token, body: { title: 'Đã sửa' } })).status, 200);
  assert.equal((await call(base, 'DELETE', `/tasks/${id}`, { token: bob.token })).status, 403);
  assert.equal((await call(base, 'GET', `/tasks/${id}/shares`, { token: bob.token })).status, 403);

  // hạ xuống viewer rồi thu hồi
  const patch = await call(base, 'PATCH', `/tasks/${id}/shares/${shareId}`, {
    token: owner.token, body: { permission: 'viewer' },
  });
  assert.equal(patch.body.share.permission, 'viewer');
  assert.equal((await call(base, 'DELETE', `/tasks/${id}/shares/${shareId}`, { token: owner.token })).status, 200);
  assert.equal((await call(base, 'GET', `/tasks/${id}`, { token: bob.token })).status, 404);
});

test('không chia sẻ cho chính người tạo; người lạ không truy cập được', opts, async () => {
  const id = await newTask();
  const self = await call(base, 'POST', `/tasks/${id}/shares`, {
    token: owner.token, body: { userId: owner.user.id, permission: 'viewer' },
  });
  assert.equal(self.status, 400);
  assert.equal((await call(base, 'GET', `/tasks/${id}`, { token: stranger.token })).status, 404);
});

test('thống kê chỉ tính công việc có quyền truy cập', opts, async () => {
  const mk = (token, title, extra = {}) => call(base, 'POST', '/tasks', { token, body: { title, ...extra } });
  const soon = new Date(Date.now() + 2 * 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  const a = (await mk(owner.token, 'S1', { dueDate: soon })).body.task.id;
  await mk(owner.token, 'S2', { dueDate: past });
  await mk(stranger.token, 'Không liên quan');
  await call(base, 'POST', `/tasks/${a}/assignees`, { token: owner.token, body: { userIds: [bob.user.id] } });

  const ownerStats = await call(base, 'GET', '/statistics/tasks', { token: owner.token });
  assert.ok(ownerStats.body.statistics.total >= 2);
  const bobStats = await call(base, 'GET', '/statistics/tasks', { token: bob.token });
  assert.equal(bobStats.body.statistics.total, 1);

  const asg = await call(base, 'GET', '/statistics/assignments', { token: bob.token });
  assert.equal(asg.body.statistics.assigned, 1);
  assert.equal(asg.body.statistics.primaryResponsible, 1);

  const dl = await call(base, 'GET', '/statistics/deadlines?days=7', { token: owner.token });
  assert.ok(dl.body.upcomingCount >= 1 && dl.body.overdueCount >= 1);
});
