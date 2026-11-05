const AppError = require('../utils/AppError');
const Notification = require('../models/Notification');
const { idOf } = require('../utils/serializers');

const view = (n) => ({
  id: idOf(n),
  taskId: n.taskId ? idOf(n.taskId) : null,
  type: n.type,
  title: n.title,
  message: n.message,
  isRead: n.isRead,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

// GET /notifications?unread=true&page=&limit=
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  res.json({ notifications: items.map(view), page, limit, total, unreadCount: unread });
}

// GET /notifications/unread-count
async function unreadCount(req, res) {
  res.json({ unreadCount: await Notification.countDocuments({ userId: req.user._id, isRead: false }) });
}

// PATCH /notifications/:id/read – chỉ đánh dấu thông báo của chính mình
async function markRead(req, res) {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();
  if (!n) throw new AppError(404, 'Không tìm thấy thông báo');
  res.json({ notification: view(n) });
}

// PATCH /notifications/read-all
async function markAllRead(req, res) {
  const r = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.json({ message: 'Đã đánh dấu tất cả là đã đọc', updated: r.modifiedCount });
}

module.exports = { list, unreadCount, markRead, markAllRead };
