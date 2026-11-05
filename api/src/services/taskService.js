const Task = require('../models/Task');
const TaskShare = require('../models/TaskShare');
const TaskActivity = require('../models/TaskActivity');
const { ACTIVITY, PRIORITY_RANK } = require('../utils/constants');
const { idOf, taskView } = require('../utils/serializers');

const USER_FIELDS = 'fullName email avatarUrl';
const POPULATE = [
  { path: 'createdBy', select: USER_FIELDS },
  { path: 'assigneeIds', select: USER_FIELDS },
  { path: 'primaryAssigneeId', select: USER_FIELDS },
];
const DEFAULT_ORDER = { createdAt: 'desc', dueDate: 'asc', priority: 'desc' };

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Quyền của một người trên một công việc (hàm thuần, không truy cập database).
 *  - owner : người tạo → toàn quyền (sửa, xóa, giao việc, chia sẻ).
 *  - editor: người được giao hoặc được chia sẻ quyền editor → xem và sửa, KHÔNG xóa / quản lý chia sẻ.
 *  - viewer: được chia sẻ quyền viewer → chỉ xem.
 * share: bản ghi task_share của người này (hoặc null).
 */
function computeAccess(task, userId, share) {
  const uid = String(userId);
  const isOwner = idOf(task.createdBy) === uid;
  const isAssignee = (task.assigneeIds || []).some((a) => idOf(a) === uid);
  const sharePermission = share ? share.permission : null;

  const relations = [];
  if (isOwner) relations.push('owner');
  if (isAssignee) relations.push('assignee');
  if (share) relations.push('shared');

  let role = null;
  if (isOwner) role = 'owner';
  else if (isAssignee || sharePermission === 'editor') role = 'editor';
  else if (sharePermission === 'viewer') role = 'viewer';

  return {
    role,
    relations,
    canView: role !== null,
    canEdit: role === 'owner' || role === 'editor',
    canDelete: role === 'owner',
    canManage: role === 'owner',
  };
}

async function getAccess(task, userId) {
  const share = await TaskShare.findOne({ taskId: task._id, userId }).lean();
  return computeAccess(task, userId, share);
}

/** Tính quyền cho cả một danh sách công việc bằng một truy vấn chia sẻ. */
async function buildAccessResolver(tasks, userId) {
  const shares = await TaskShare.find({
    taskId: { $in: tasks.map((t) => t._id) },
    userId,
  }).lean();
  const byTask = new Map(shares.map((s) => [String(s.taskId), s]));
  return (task) => computeAccess(task, userId, byTask.get(idOf(task)));
}

function fetchTaskLean(taskId) {
  return Task.findById(taskId).populate(POPULATE).lean();
}

/** Lấy công việc kèm quyền của người xem, đã định dạng để trả về client. */
async function presentTask(taskId, userId) {
  const task = await fetchTaskLean(taskId);
  if (!task) return null;
  return taskView(task, await getAccess(task, userId));
}

/** Bộ lọc Mongo: chỉ gồm công việc người dùng có quyền truy cập, cộng thêm các bộ lọc tùy chọn. */
async function buildListFilter(userId, { scope, status, priority, q, assigneeId } = {}) {
  const created = { createdBy: userId };
  const assigned = { assigneeIds: userId };

  let access;
  if (scope === 'created') {
    access = created;
  } else if (scope === 'assigned') {
    access = assigned;
  } else {
    const sharedIds = await TaskShare.distinct('taskId', { userId });
    const shared = { _id: { $in: sharedIds } };
    access = scope === 'shared' ? shared : { $or: [created, assigned, shared] };
  }

  const and = [access];
  if (status) and.push({ status });
  if (priority) and.push({ priority });
  if (q) and.push({ title: new RegExp(escapeRegex(q), 'i') });
  if (assigneeId) and.push({ $or: [{ primaryAssigneeId: assigneeId }, { assigneeIds: assigneeId }] });
  return { $and: and };
}

/** Sắp xếp trong bộ nhớ; công việc không có hạn luôn nằm cuối khi sắp theo dueDate. */
function sortTasks(tasks, sortBy = 'createdAt', order) {
  const direction = (order || DEFAULT_ORDER[sortBy] || 'desc') === 'asc' ? 1 : -1;
  const key = (t) => {
    if (sortBy === 'priority') return PRIORITY_RANK[t.priority] || 0;
    if (sortBy === 'dueDate') return t.dueDate ? new Date(t.dueDate).getTime() : null;
    return new Date(t.createdAt).getTime();
  };
  return [...tasks].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (ka !== kb) return (ka - kb) * direction;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function logActivity(taskId, userId, action, details = {}) {
  return TaskActivity.create({ taskId, userId, action, details });
}

const normalize = (v) => (v instanceof Date ? v.toISOString() : v === undefined ? null : v);

/**
 * Áp dụng các thay đổi lên công việc, lưu và ghi lịch sử.
 * Trả về { changed, diff } với diff = { trường: { from, to } }.
 */
async function applyChanges(task, changes, actorId) {
  const diff = {};
  for (const [field, newValue] of Object.entries(changes)) {
    const from = normalize(task[field]);
    const to = normalize(newValue);
    if (from !== to) {
      diff[field] = { from, to };
      task[field] = newValue;
    }
  }
  if (Object.keys(diff).length === 0) return { changed: false, diff };

  if (diff.dueDate) task.dueReminderSentAt = null; // hạn đổi → cho phép nhắc việc lại
  await task.save();

  const { status, ...others } = diff;
  if (status) await logActivity(task._id, actorId, ACTIVITY.STATUS_CHANGED, status);
  if (Object.keys(others).length > 0) {
    await logActivity(task._id, actorId, ACTIVITY.UPDATED, { changes: others });
  }
  return { changed: true, diff };
}

/** Xóa công việc cùng dữ liệu liên quan. */
async function deleteTask(task) {
  await Promise.all([
    TaskShare.deleteMany({ taskId: task._id }),
    TaskActivity.deleteMany({ taskId: task._id }),
  ]);
  await task.deleteOne();
}

module.exports = {
  USER_FIELDS,
  POPULATE,
  computeAccess,
  getAccess,
  buildAccessResolver,
  fetchTaskLean,
  presentTask,
  buildListFilter,
  sortTasks,
  logActivity,
  applyChanges,
  deleteTask,
};
