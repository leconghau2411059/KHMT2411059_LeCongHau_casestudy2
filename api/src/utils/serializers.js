/**
 * Chuyển dữ liệu (lean object của Mongoose) sang JSON trả về cho client.
 * Không bao giờ trả về passwordHash.
 */

function idOf(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

/** Thông tin công khai của người dùng (dùng khi hiển thị trong công việc, tìm kiếm). */
function publicUser(user) {
  if (!user) return null;
  if (user.fullName === undefined) return { id: idOf(user) };
  return {
    id: idOf(user),
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
  };
}

/** Thông tin đầy đủ của chính người dùng đang đăng nhập. */
function privateUser(user) {
  return {
    ...publicUser(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isOverdue(task, now = new Date()) {
  return Boolean(task.dueDate) && task.status !== 'completed' && new Date(task.dueDate) < now;
}

/**
 * Công việc đã populate createdBy / assigneeIds / primaryAssigneeId.
 * access: kết quả của computeAccess (vai trò và quyền của người đang xem).
 */
function taskView(task, access) {
  return {
    id: idOf(task),
    title: task.title,
    description: task.description || '',
    createdBy: publicUser(task.createdBy),
    assignees: (task.assigneeIds || []).map(publicUser),
    primaryAssignee: publicUser(task.primaryAssigneeId),
    startDate: task.startDate || null,
    dueDate: task.dueDate || null,
    priority: task.priority,
    status: task.status,
    isOverdue: isOverdue(task),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    myRole: access ? access.role : null,
    relations: access ? access.relations : [],
    permissions: access
      ? { canEdit: access.canEdit, canDelete: access.canDelete, canManage: access.canManage }
      : null,
  };
}

function activityView(activity) {
  return {
    id: idOf(activity),
    taskId: idOf(activity.taskId),
    user: publicUser(activity.userId),
    action: activity.action,
    details: activity.details || {},
    createdAt: activity.createdAt,
  };
}

module.exports = { idOf, publicUser, privateUser, isOverdue, taskView, activityView };
