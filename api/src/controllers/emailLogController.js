const AppError = require('../utils/AppError');
const EmailLog = require('../models/EmailLog');
const Task = require('../models/Task');
const emailService = require('../services/emailService');
const { config } = require('../config/env');
const { idOf } = require('../utils/serializers');

const view = (l) => ({
  id: idOf(l),
  taskId: l.taskId ? idOf(l.taskId) : null,
  to: l.to,
  type: l.type,
  subject: l.subject,
  status: l.status,
  attempts: l.attempts,
  canRetry: l.status === 'failed' && l.attempts < config.email.maxAttempts,
  lastError: l.lastError,
  sentAt: l.sentAt,
  createdAt: l.createdAt,
});

// GET /tasks/:id/email-logs  (chỉ người tạo – đã kiểm tra bởi requireTaskAccess('manage'))
async function listForTask(req, res) {
  const logs = await EmailLog.find({ taskId: req.task._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ emailLogs: logs.map(view) });
}

// POST /email-logs/:id/retry – chỉ người tạo công việc, chỉ với email đã lỗi và còn lượt gửi
async function retry(req, res) {
  const log = await EmailLog.findById(req.params.id).lean();
  const task = log && log.taskId ? await Task.findById(log.taskId).select('createdBy').lean() : null;
  if (!log || !task || idOf(task.createdBy) !== idOf(req.user)) {
    throw new AppError(404, 'Không tìm thấy nhật ký email');
  }
  const result = await emailService.retry(log._id);
  if (!result) {
    throw new AppError(409, 'Email này không thể gửi lại (đã gửi thành công, đang gửi hoặc đã hết số lần thử)');
  }
  res.json({ message: result.status === 'sent' ? 'Đã gửi lại email' : 'Gửi lại thất bại', emailLog: view(result) });
}

module.exports = { listForTask, retry };
