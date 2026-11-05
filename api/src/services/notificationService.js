const User = require('../models/User');
const Task = require('../models/Task');
const TaskShare = require('../models/TaskShare');
const Notification = require('../models/Notification');
const emailService = require('./emailService');
const { buildEmail, HEADLINES } = require('../utils/emailTemplates');
const { idOf } = require('../utils/serializers');
const { EVENT } = require('../utils/constants');

/** Người liên quan tới công việc: người tạo, người được giao, người được chia sẻ. */
async function stakeholderIds(task) {
  const shares = await TaskShare.find({ taskId: task._id }).select('userId').lean();
  return [
    idOf(task.createdBy),
    ...(task.assigneeIds || []).map(idOf),
    ...shares.map((s) => idOf(s.userId)),
  ];
}

/**
 * Tạo thông báo trong ứng dụng và (nếu email=true) gửi email cho các người nhận.
 * Bỏ qua người thực hiện (actor) và loại trùng. Không bao giờ ném lỗi làm hỏng thao tác chính.
 */
async function dispatch({ task, actor, recipientIds, type, message = '', email = true }) {
  try {
    const actorId = actor ? idOf(actor) : null;
    const ids = [...new Set(recipientIds.map(idOf))].filter((id) => id && id !== actorId);
    if (ids.length === 0) return [];

    const users = await User.find({ _id: { $in: ids } }).select('fullName email').lean();
    const headline = HEADLINES[type] || 'Thông báo công việc';
    const title = `${headline}: ${task.title}`.slice(0, 200);

    const notifications = await Notification.insertMany(
      users.map((u) => ({ userId: u._id, taskId: task._id, type, title, message }))
    );

    if (email) {
      const actorName = actor && actor.fullName ? actor.fullName : '';
      const mail = buildEmail({ type, task, actorName, detail: message });
      for (const u of users) {
        await emailService.enqueue({ taskId: task._id, recipient: u, type, ...mail });
      }
    }
    return notifications;
  } catch (err) {
    console.error('Không thể tạo thông báo:', err.message);
    return [];
  }
}

const STATUS_LABEL = { todo: 'Cần làm', in_progress: 'Đang làm', completed: 'Hoàn thành' };

/** Thông báo các thay đổi quan trọng: đổi hạn hoàn thành, đổi trạng thái, hoàn thành. diff lấy từ applyChanges. */
async function notifyTaskChanges(task, diff, actor) {
  try {
    const recipientIds = await stakeholderIds(task);
    if (diff.dueDate) {
      const due = diff.dueDate.to ? new Date(diff.dueDate.to).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) : 'đã xóa hạn';
      await dispatch({
        task, actor, recipientIds, type: EVENT.DUE_DATE_CHANGED, message: `Hạn mới: ${due}`,
      });
    }
    if (diff.status) {
      const done = diff.status.to === 'completed';
      await dispatch({
        task,
        actor,
        recipientIds,
        type: done ? EVENT.TASK_COMPLETED : EVENT.STATUS_CHANGED,
        message: `Trạng thái: ${STATUS_LABEL[diff.status.from] || diff.status.from} → ${STATUS_LABEL[diff.status.to] || diff.status.to}`,
        email: done, // đổi trạng thái thường chỉ báo trong ứng dụng, hoàn thành mới gửi email
      });
    }
  } catch (err) {
    console.error('Không thể thông báo thay đổi:', err.message);
  }
}

/** Lấy lại công việc mới nhất (đủ trường cho nội dung thông báo). */
const loadTask = (id) => Task.findById(id).lean();

module.exports = { dispatch, stakeholderIds, notifyTaskChanges, loadTask };
