const mongoose = require('mongoose');
const { PRIORITIES, STATUSES } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    createdBy: { type: ObjectId, ref: 'User', required: true, index: true },
    // Người được giao; luôn gồm cả người phụ trách chính (nếu có).
    assigneeIds: { type: [{ type: ObjectId, ref: 'User' }], default: [], index: true },
    primaryAssigneeId: { type: ObjectId, ref: 'User', default: null },
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    status: { type: String, enum: STATUSES, default: 'todo' },
    // Thời điểm đã gửi nhắc việc trước hạn (tránh nhắc trùng). Đặt lại khi đổi hạn.
    dueReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ dueDate: 1, status: 1 });

taskSchema.pre('validate', function () {
  if (this.startDate && this.dueDate && this.dueDate < this.startDate) {
    this.invalidate('dueDate', 'Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu');
  }
});

module.exports = mongoose.models.Task || mongoose.model('Task', taskSchema);
