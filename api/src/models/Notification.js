const mongoose = require('mongoose');
const { EVENT } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    taskId: { type: ObjectId, ref: 'Task', default: null },
    type: { type: String, enum: Object.values(EVENT), required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, default: '', maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ taskId: 1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
