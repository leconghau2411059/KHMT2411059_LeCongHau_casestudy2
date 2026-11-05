const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const taskActivitySchema = new mongoose.Schema(
  {
    taskId: { type: ObjectId, ref: 'Task', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

module.exports =
  mongoose.models.TaskActivity || mongoose.model('TaskActivity', taskActivitySchema);
