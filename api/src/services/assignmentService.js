const User = require('../models/User');
const Task = require('../models/Task');
const taskService = require('./taskService');
const { ACTIVITY } = require('../utils/constants');
const { idOf } = require('../utils/serializers');

/** Tìm người dùng theo danh sách id và/hoặc email. Trả về { users, notFound } (notFound: giá trị không tìm thấy). */
async function resolveUsers({ userIds = [], emails = [] }) {
  const found = await User.find({ $or: [{ _id: { $in: userIds } }, { email: { $in: emails } }] })
    .select('fullName email avatarUrl')
    .lean();

  const byId = new Set(found.map((u) => idOf(u)));
  const byEmail = new Set(found.map((u) => u.email));
  const notFound = [
    ...userIds.filter((id) => !byId.has(id)),
    ...emails.filter((e) => !byEmail.has(e)),
  ];
  return { users: found, notFound };
}

/**
 * Thêm người vào danh sách phụ trách. Trả về { added, alreadyAssigned, primaryChanged }.
 * added: danh sách user mới được thêm (để gửi thông báo).
 */
async function addAssignees(task, users, actorId, primaryUserId) {
  const current = new Set(task.assigneeIds.map(idOf));
  const added = users.filter((u) => !current.has(idOf(u)));
  const alreadyAssigned = users.filter((u) => current.has(idOf(u)));

  for (const user of added) {
    task.assigneeIds.push(user._id);
    current.add(idOf(user));
  }

  const before = idOf(task.primaryAssigneeId);
  if (primaryUserId && current.has(primaryUserId)) {
    task.primaryAssigneeId = primaryUserId;
  } else if (!task.primaryAssigneeId && task.assigneeIds.length > 0) {
    task.primaryAssigneeId = task.assigneeIds[0]; // người đầu tiên là người phụ trách chính
  }
  const primaryChanged = idOf(task.primaryAssigneeId) !== before;

  if (added.length > 0 || primaryChanged) await task.save();

  for (const user of added) {
    await taskService.logActivity(task._id, actorId, ACTIVITY.ASSIGNED, {
      userId: idOf(user),
      fullName: user.fullName,
    });
  }
  if (primaryChanged) {
    await taskService.logActivity(task._id, actorId, ACTIVITY.PRIMARY_CHANGED, {
      userId: idOf(task.primaryAssigneeId),
    });
  }
  return { added, alreadyAssigned, primaryChanged };
}

/** Đặt người phụ trách chính (phải đang là người được giao). */
async function setPrimary(task, userId, actorId) {
  if (idOf(task.primaryAssigneeId) === userId) return false;
  task.primaryAssigneeId = userId;
  await task.save();
  await taskService.logActivity(task._id, actorId, ACTIVITY.PRIMARY_CHANGED, { userId });
  return true;
}

/** Gỡ một người khỏi danh sách phụ trách; nếu là người chính thì chuyển cho người còn lại đầu tiên. */
async function removeAssignee(task, userId, actorId) {
  task.assigneeIds = task.assigneeIds.filter((a) => idOf(a) !== userId);
  if (idOf(task.primaryAssigneeId) === userId) {
    task.primaryAssigneeId = task.assigneeIds[0] || null;
  }
  await task.save();
  await taskService.logActivity(task._id, actorId, ACTIVITY.UNASSIGNED, { userId });
}

async function listAssignees(taskId) {
  const task = await Task.findById(taskId)
    .populate('assigneeIds', taskService.USER_FIELDS)
    .lean();
  const primaryId = idOf(task.primaryAssigneeId);
  return task.assigneeIds.map((u) => ({ ...u, isPrimary: idOf(u) === primaryId }));
}

module.exports = { resolveUsers, addAssignees, setPrimary, removeAssignee, listAssignees };
