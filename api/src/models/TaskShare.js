const mongoose = require('mongoose');
const { PERMISSIONS } = require('../utils/constants');

const { ObjectId } = mongoose.Schema.Types;

const taskShareSchema = new mongoose.Schema(
  {
    taskId: { type: ObjectId, ref: 'Task', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: PERMISSIONS, required: true },
    sharedBy: { type: ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Mỗi người chỉ có một bản ghi chia sẻ cho mỗi công việc.
taskShareSchema.index({ taskId: 1, userId: 1 }, { unique: true });
taskShareSchema.index({ userId: 1 });

module.exports = mongoose.models.TaskShare || mongoose.model('TaskShare', taskShareSchema);
