// Test logic thuần của công việc (không cần MongoDB).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-chi-dung-cho-test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAccess, sortTasks } = require('../src/services/taskService');
const v = require('../src/validators/taskValidator');
const { taskView } = require('../src/utils/serializers');

const OWNER = '65f000000000000000000001';
const ASSIGNEE = '65f000000000000000000002';
const VIEWER = '65f000000000000000000003';
const STRANGER = '65f000000000000000000004';

const task = { _id: 't1', createdBy: OWNER, assigneeIds: [ASSIGNEE], status: 'todo', priority: 'medium' };

test('quyền: người tạo có toàn quyền', () => {
  const a = computeAccess(task, OWNER, null);
  assert.equal(a.role, 'owner');
  assert.ok(a.canView && a.canEdit && a.canDelete && a.canManage);
});

test('quyền: người được giao sửa được nhưng không xóa / quản lý', () => {
  const a = computeAccess(task, ASSIGNEE, null);
  assert.equal(a.role, 'editor');
  assert.ok(a.canEdit);
  assert.equal(a.canDelete, false);
  assert.equal(a.canManage, false);
});

test('quyền: viewer chỉ xem, editor được chia sẻ không xóa / quản lý', () => {
  const viewer = computeAccess(task, VIEWER, { permission: 'viewer' });
  assert.ok(viewer.canView);
  assert.equal(viewer.canEdit, false);

  const editor = computeAccess(task, VIEWER, { permission: 'editor' });
  assert.ok(editor.canEdit);
  assert.equal(editor.canDelete, false);
  assert.equal(editor.canManage, false);
});

test('quyền: người lạ không có quyền gì', () => {
  const a = computeAccess(task, STRANGER, null);
  assert.equal(a.role, null);
  assert.equal(a.canView, false);
});

test('quyền: vừa được giao vừa chia sẻ viewer vẫn là editor (lấy quyền cao nhất)', () => {
  const a = computeAccess(task, ASSIGNEE, { permission: 'viewer' });
  assert.equal(a.role, 'editor');
  assert.deepEqual(a.relations, ['assignee', 'shared']);
});

test('quyền: nhận diện được cả khi createdBy / assigneeIds đã populate', () => {
  const populated = {
    createdBy: { _id: OWNER, fullName: 'A' },
    assigneeIds: [{ _id: ASSIGNEE, fullName: 'B' }],
  };
  assert.equal(computeAccess(populated, OWNER, null).role, 'owner');
  assert.equal(computeAccess(populated, ASSIGNEE, null).role, 'editor');
});

const mk = (id, extra) => ({ id, createdAt: '2026-01-01T00:00:00Z', ...extra });

test('sắp xếp theo hạn: tăng dần, công việc không có hạn luôn ở cuối', () => {
  const list = [
    mk('a', { dueDate: '2026-03-01T00:00:00Z' }),
    mk('b', { dueDate: null }),
    mk('c', { dueDate: '2026-02-01T00:00:00Z' }),
  ];
  assert.deepEqual(sortTasks(list, 'dueDate', 'asc').map((t) => t.id), ['c', 'a', 'b']);
  assert.deepEqual(sortTasks(list, 'dueDate', 'desc').map((t) => t.id), ['a', 'c', 'b']);
});

test('sắp xếp theo ưu tiên: mặc định cao → thấp', () => {
  const list = [mk('l', { priority: 'low' }), mk('h', { priority: 'high' }), mk('m', { priority: 'medium' })];
  assert.deepEqual(sortTasks(list, 'priority').map((t) => t.id), ['h', 'm', 'l']);
  assert.deepEqual(sortTasks(list, 'priority', 'asc').map((t) => t.id), ['l', 'm', 'h']);
});

test('sắp xếp theo thời gian tạo: mặc định mới nhất trước', () => {
  const list = [
    { id: 'old', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'new', createdAt: '2026-02-01T00:00:00Z' },
  ];
  assert.deepEqual(sortTasks(list).map((t) => t.id), ['new', 'old']);
});

test('validator tạo công việc: giá trị mặc định và làm sạch', () => {
  const { value, errors } = v.validateCreateTask({ title: '  Viết báo cáo ', dueDate: '2026-12-01T10:00:00Z' });
  assert.deepEqual(errors, {});
  assert.equal(value.title, 'Viết báo cáo');
  assert.equal(value.priority, 'medium');
  assert.equal(value.status, 'todo');
  assert.ok(value.dueDate instanceof Date);
  assert.equal(value.startDate, null);
});

test('validator tạo công việc: bắt lỗi tên, ưu tiên, trạng thái, ngày', () => {
  const { errors } = v.validateCreateTask({
    title: ' ', priority: 'cao', status: 'xong', dueDate: 'không-phải-ngày',
  });
  assert.ok(errors.title && errors.priority && errors.status && errors.dueDate);
});

test('validator: hạn phải sau ngày bắt đầu', () => {
  const { errors } = v.validateCreateTask({
    title: 'A', startDate: '2026-12-10T00:00:00Z', dueDate: '2026-12-01T00:00:00Z',
  });
  assert.ok(errors.dueDate);
});

test('validator cập nhật: chỉ giữ trường được gửi, cho phép xóa ngày bằng null', () => {
  const { value, errors } = v.validateUpdateTask({ dueDate: null, priority: 'high' });
  assert.deepEqual(errors, {});
  assert.deepEqual(Object.keys(value).sort(), ['dueDate', 'priority']);
  assert.equal(value.dueDate, null);
  assert.ok(Object.keys(v.validateUpdateTask({}).errors).length > 0);
});

test('validator trạng thái', () => {
  assert.ok(v.validateStatus({ status: 'xong' }).errors.status);
  assert.deepEqual(v.validateStatus({ status: 'completed' }).errors, {});
});

test('validator truy vấn danh sách: mặc định và thứ tự sắp xếp theo trường', () => {
  const { value, errors } = v.validateListQuery({});
  assert.deepEqual(errors, {});
  assert.deepEqual([value.sortBy, value.order, value.page, value.limit], ['createdAt', 'desc', 1, 20]);
  assert.equal(v.validateListQuery({ sortBy: 'dueDate' }).value.order, 'asc');
  assert.equal(v.validateListQuery({ sortBy: 'priority' }).value.order, 'desc');
});

test('validator truy vấn danh sách: từ chối giá trị sai', () => {
  const { errors } = v.validateListQuery({
    scope: 'tatca', status: 'x', priority: 'y', sortBy: 'title', order: 'up', page: '0', limit: '500', assigneeId: '123',
  });
  for (const key of ['scope', 'status', 'priority', 'sortBy', 'order', 'page', 'limit', 'assigneeId']) {
    assert.ok(errors[key], key);
  }
});

test('taskView: đánh dấu quá hạn và không lộ trường nội bộ', () => {
  const view = taskView(
    {
      _id: 'x1', title: 'T', createdBy: { _id: OWNER, fullName: 'A', email: 'a@b.co' },
      assigneeIds: [], primaryAssigneeId: null, dueDate: '2000-01-01T00:00:00Z',
      status: 'todo', priority: 'low', dueReminderSentAt: new Date(),
    },
    computeAccess({ createdBy: OWNER, assigneeIds: [] }, OWNER, null)
  );
  assert.equal(view.isOverdue, true);
  assert.equal(view.myRole, 'owner');
  assert.equal(view.dueReminderSentAt, undefined);
  assert.equal(view.createdBy.email, 'a@b.co');
});

test('taskView: công việc đã hoàn thành không bị tính là quá hạn', () => {
  const view = taskView({ _id: 'x', title: 'T', dueDate: '2000-01-01T00:00:00Z', status: 'completed' }, null);
  assert.equal(view.isOverdue, false);
});
