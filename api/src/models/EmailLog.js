const mongoose = require('mongoose');
const { EVENT } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const emailLogSchema = new mongoose.Schema(
  {
    taskId: { type: ObjectId, ref: 'Task', default: null },
    recipientId: { type: ObjectId, ref: 'User', default: null },
    to: { type: String, required: true },
    type: { type: String, enum: Object.values(EVENT), required: true },
    subject: { type: String, required: true },
    // Nội dung lưu để gửi lại; không trả về mặc định.
    html: { type: String, select: false },
    text: { type: String, select: false },
    // pending: chờ gửi | sending: đang gửi | sent: đã gửi | failed: gửi lỗi (có thể gửi lại thủ công)
    status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

emailLogSchema.index({ taskId: 1, createdAt: -1 });

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
