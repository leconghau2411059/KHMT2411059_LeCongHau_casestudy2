const AppError = require('../utils/AppError');
const User = require('../models/User');
const assignmentService = require('../services/assignmentService');
const taskService = require('../services/taskService');
const { publicUser, idOf } = require('../utils/serializers');

const assigneeView = (u) => ({ ...publicUser(u), isPrimary: Boolean(u.isPrimary) });

// GET /tasks/:id/assignees
async function list(req, res) {
  const assignees = await assignmentService.listAssignees(req.task._id);
  res.json({ assignees: assignees.map(assigneeView) });
}

// POST /tasks/:id/assignees  (chỉ người tạo)
async function assign(req, res) {
  const { userIds, emails, primaryUserId } = req.valid;
  const { users, notFound } = await assignmentService.resolveUsers({ userIds, emails });

  if (users.length === 0) {
    throw new AppError(404, 'Không tìm thấy người dùng nào để giao việc', { userIds: 'Người dùng không tồn tại' });
  }
  if (primaryUserId && !users.some((u) => idOf(u) === primaryUserId) &&
      !req.task.assigneeIds.some((a) => idOf(a) === primaryUserId)) {
    throw new AppError(400, 'Người phụ trách chính phải nằm trong danh sách được giao', {
      primaryUserId: 'Người phụ trách chính phải nằm trong danh sách được giao',
    });
  }

  const result = await assignmentService.addAssignees(req.task, users, req.user._id, primaryUserId);
  const assignees = await assignmentService.listAssignees(req.task._id);

  res.status(201).json({
    message: result.added.length > 0 ? 'Giao việc thành công' : 'Những người này đã được giao trước đó',
    added: result.added.map(publicUser),
    alreadyAssigned: result.alreadyAssigned.map(publicUser),
    notFound,
    assignees: assignees.map(assigneeView),
    task: await taskService.presentTask(req.task._id, req.user._id),
  });
}

async function requireAssignee(req) {
  const { userId } = req.params;
  if (!req.task.assigneeIds.some((a) => idOf(a) === userId)) {
    throw new AppError(404, 'Người này chưa được giao công việc');
  }
  return userId;
}

// PATCH /tasks/:id/assignees/:userId  → đặt người phụ trách chính
async function update(req, res) {
  const userId = await requireAssignee(req);
  await assignmentService.setPrimary(req.task, userId, req.user._id);
  const assignees = await assignmentService.listAssignees(req.task._id);
  res.json({
    message: 'Đã đặt người phụ trách chính',
    assignees: assignees.map(assigneeView),
    task: await taskService.presentTask(req.task._id, req.user._id),
  });
}

// DELETE /tasks/:id/assignees/:userId
async function remove(req, res) {
  const userId = await requireAssignee(req);
  const removed = await User.findById(userId).select('fullName email avatarUrl').lean();
  await assignmentService.removeAssignee(req.task, userId, req.user._id);
  res.json({
    message: 'Đã gỡ người phụ trách',
    removed: publicUser(removed) || { id: userId },
    task: await taskService.presentTask(req.task._id, req.user._id),
  });
}

module.exports = { list, assign, update, remove };
