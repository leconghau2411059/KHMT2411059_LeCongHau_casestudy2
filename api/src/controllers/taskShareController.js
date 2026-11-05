const AppError = require('../utils/AppError');
const TaskShare = require('../models/TaskShare');
const assignmentService = require('../services/assignmentService');
const taskService = require('../services/taskService');
const { ACTIVITY } = require('../utils/constants');
const { publicUser, idOf } = require('../utils/serializers');

const POPULATE = [
  { path: 'userId', select: taskService.USER_FIELDS },
  { path: 'sharedBy', select: taskService.USER_FIELDS },
];

const shareView = (s) => ({
  id: idOf(s),
  taskId: idOf(s.taskId),
  user: publicUser(s.userId),
  permission: s.permission,
  sharedBy: publicUser(s.sharedBy),
  createdAt: s.createdAt,
});

const loadShare = (id) => TaskShare.findById(id).populate(POPULATE).lean();

// GET /tasks/:id/shares  (chỉ người tạo)
async function list(req, res) {
  const shares = await TaskShare.find({ taskId: req.task._id }).sort({ createdAt: 1 }).populate(POPULATE).lean();
  res.json({ shares: shares.map(shareView) });
}

// POST /tasks/:id/shares  (chỉ người tạo) – chia sẻ mới hoặc đổi quyền nếu đã chia sẻ
async function create(req, res) {
  const { userId, email, permission } = req.valid;
  const { users } = await assignmentService.resolveUsers({
    userIds: userId ? [userId] : [],
    emails: email ? [email] : [],
  });
  const target = users[0];
  if (!target) throw new AppError(404, 'Không tìm thấy người dùng cần chia sẻ');
  if (idOf(target) === idOf(req.task.createdBy)) {
    throw new AppError(400, 'Không thể chia sẻ công việc cho chính người tạo');
  }

  const existing = await TaskShare.findOne({ taskId: req.task._id, userId: target._id });
  let share;
  let created = false;
  if (existing) {
    if (existing.permission !== permission) {
      existing.permission = permission;
      await existing.save();
      await taskService.logActivity(req.task._id, req.user._id, ACTIVITY.SHARE_UPDATED, {
        userId: idOf(target), permission,
      });
    }
    share = existing;
  } else {
    share = await TaskShare.create({
      taskId: req.task._id, userId: target._id, permission, sharedBy: req.user._id,
    });
    created = true;
    await taskService.logActivity(req.task._id, req.user._id, ACTIVITY.SHARED, {
      userId: idOf(target), fullName: target.fullName, permission,
    });
  }

  res.status(created ? 201 : 200).json({
    message: created ? 'Chia sẻ công việc thành công' : 'Người này đã được chia sẻ, đã cập nhật quyền',
    share: shareView(await loadShare(share._id)),
  });
}

async function findShareOr404(req) {
  const share = await TaskShare.findOne({ _id: req.params.shareId, taskId: req.task._id });
  if (!share) throw new AppError(404, 'Không tìm thấy bản ghi chia sẻ');
  return share;
}

// PATCH /tasks/:id/shares/:shareId  – đổi quyền
async function update(req, res) {
  const share = await findShareOr404(req);
  if (share.permission !== req.valid.permission) {
    share.permission = req.valid.permission;
    await share.save();
    await taskService.logActivity(req.task._id, req.user._id, ACTIVITY.SHARE_UPDATED, {
      userId: idOf(share.userId), permission: share.permission,
    });
  }
  res.json({ message: 'Đã cập nhật quyền truy cập', share: shareView(await loadShare(share._id)) });
}

// DELETE /tasks/:id/shares/:shareId  – thu hồi quyền
async function remove(req, res) {
  const share = await findShareOr404(req);
  await share.deleteOne();
  await taskService.logActivity(req.task._id, req.user._id, ACTIVITY.SHARE_REVOKED, {
    userId: idOf(share.userId),
  });
  res.json({ message: 'Đã thu hồi quyền truy cập' });
}

module.exports = { list, create, update, remove };
