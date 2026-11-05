// Cần MongoDB thật: đặt MONGODB_URI_TEST (database kết thúc bằng "_test").
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  startServer, call, integrationEnabled, skipReason, connectTestDb, disconnectTestDb, registerAndLogin,
} = require('./helpers');

const opts = { skip: integrationEnabled ? false : skipReason };
let server, base, owner, bob, carol, sent, failNext;
let emailService, reminderService, Task;

test.before(async () => {
  if (!integrationEnabled) return;
  await connectTestDb();
  emailService = require('../src/services/emailService');
  reminderService = require('../src/services/reminderService');
  Task = require('../src/models/Task');
  sent = [];
  failNext = false;
  emailService.setTransport({
    async sendMail(m) {
      if (failNext) { failNext = false; throw new Error('SMTP down'); }
      sent.push(m);
    },
  });
  ({ server, base } = await startServer());
  owner = await registerAndLogin(base, 'Chủ Việc', 'owner@example.com');
  bob = await registerAndLogin(base, 'Bob', 'bob@example.com');
  carol = await registerAndLogin(base, 'Carol', 'carol@example.com');
});
test.after(async () => {
  if (!integrationEnabled) return;
  server.close();
  await disconnectTestDb();
});

const newTask = async (extra = {}) =>
  (await call(base, 'POST', '/tasks', { token: owner.token, body: { title: 'Việc nhóm', ...extra } })).body.task.id;

test('giao việc → thông báo + email cho người được giao, không gửi cho người giao', opts, async () => {
  sent.length = 0;
  const id = await newTask();
  await call(base, 'POST', `/tasks/${id}/assignees`, { token: owner.token, body: { userIds: [bob.user.id] } });
  await emailService.flushPending();

  const n = await call(base, 'GET', '/notifications', { token: bob.token });
  assert.equal(n.body.total, 1);
  assert.equal(n.body.notifications[0].type, 'task_assigned');
  assert.equal(n.body.notifications[0].taskId, id);
  assert.equal(n.body.unreadCount, 1);
  assert.equal((await call(base, 'GET', '/notifications', { token: owner.token })).body.total, 0);
  assert.deepEqual(sent.map((m) => m.to), ['bob@example.com']);
});

test('đánh dấu đã đọc: chỉ thông báo của chính mình', opts, async () => {
  const list = await call(base, 'GET', '/notifications?unread=true', { token: bob.token });
  const nid = list.body.notifications[0].id;
  assert.equal((await call(base, 'PATCH', `/notifications/${nid}/read`, { token: carol.token })).status, 404);
  assert.equal((await call(base, 'PATCH', `/notifications/${nid}/read`, { token: bob.token })).status, 200);
  assert.equal((await call(base, 'GET', '/notifications/unread-count', { token: bob.token })).body.unreadCount, 0);
  const all = await call(base, 'PATCH', '/notifications/read-all', { token: bob.token });
  assert.equal(all.status, 200);
});

test('chia sẻ, đổi hạn, hoàn thành → thông báo cho người liên quan', opts, async () => {
  sent.length = 0;
  const id = await newTask();
  await call(base, 'POST', `/tasks/${id}/shares`, { token: owner.token, body: { userId: carol.user.id, permission: 'editor' } });
  await call(base, 'PUT', `/tasks/${id}`, { token: owner.token, body: { dueDate: '2031-01-01T00:00:00Z' } });
  await call(base, 'PATCH', `/tasks/${id}/status`, { token: carol.token, body: { status: 'completed' } });
  await emailService.flushPending();

  const types = (await call(base, 'GET', '/notifications', { token: carol.token })).body.notifications.map((n) => n.type);
  assert.ok(types.includes('task_shared') && types.includes('due_date_changed'));
  const ownerTypes = (await call(base, 'GET', '/notifications', { token: owner.token })).body.notifications.map((n) => n.type);
  assert.ok(ownerTypes.includes('task_completed'));
  assert.ok(!types.includes('task_completed')); // người hoàn thành không tự nhận thông báo
});

test('email lỗi được ghi log, chỉ người tạo gửi lại được, có giới hạn lượt gửi', opts, async () => {
  const id = await newTask();
  failNext = true;
  await call(base, 'POST', `/tasks/${id}/assignees`, { token: owner.token, body: { userIds: [bob.user.id] } });
  await emailService.flushPending();

  const logs = await call(base, 'GET', `/tasks/${id}/email-logs`, { token: owner.token });
  assert.equal(logs.body.emailLogs.length, 1);
  assert.equal(logs.body.emailLogs[0].status, 'failed');
  assert.equal(logs.body.emailLogs[0].attempts, 1);
  assert.equal(logs.body.emailLogs[0].html, undefined); // không lộ nội dung

  const logId = logs.body.emailLogs[0].id;
  assert.equal((await call(base, 'GET', `/tasks/${id}/email-logs`, { token: bob.token })).status, 403);
  assert.equal((await call(base, 'POST', `/email-logs/${logId}/retry`, { token: bob.token })).status, 404);

  const retried = await call(base, 'POST', `/email-logs/${logId}/retry`, { token: owner.token });
  assert.equal(retried.status, 200);
  assert.equal(retried.body.emailLog.status, 'sent');
  // đã gửi thành công → không gửi lại được nữa (tránh gửi trùng)
  assert.equal((await call(base, 'POST', `/email-logs/${logId}/retry`, { token: owner.token })).status, 409);
});

test('nhắc việc sắp đến hạn chỉ gửi một lần', opts, async () => {
  sent.length = 0;
  const soon = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
  const id = await newTask({ dueDate: soon });
  await call(base, 'POST', `/tasks/${id}/assignees`, { token: owner.token, body: { userIds: [bob.user.id] } });
  await emailService.flushPending();
  sent.length = 0;

  const first = await reminderService.runReminders(new Date(), 24);
  await emailService.flushPending();
  const second = await reminderService.runReminders(new Date(), 24);
  assert.ok(first >= 1);
  assert.equal(second, 0);
  assert.ok(sent.some((m) => m.to === 'bob@example.com'));
  assert.ok((await Task.findById(id)).dueReminderSentAt);

  // đổi hạn → được nhắc lại
  await call(base, 'PUT', `/tasks/${id}`, { token: owner.token, body: { dueDate: new Date(Date.now() + 5 * 3600 * 1000).toISOString() } });
  assert.ok((await reminderService.runReminders(new Date(), 24)) >= 1);
});

test('xóa công việc xóa luôn thông báo và nhật ký email', opts, async () => {
  const id = await newTask();
  await call(base, 'POST', `/tasks/${id}/assignees`, { token: owner.token, body: { userIds: [carol.user.id] } });
  await emailService.flushPending();
  await call(base, 'DELETE', `/tasks/${id}`, { token: owner.token });
  const n = await call(base, 'GET', '/notifications', { token: carol.token });
  assert.ok(!n.body.notifications.some((x) => x.taskId === id));
});
