const Task = require('../models/Task');
const notificationService = require('./notificationService');
const { config } = require('../config/env');
const { EVENT } = require('../utils/constants');
const { idOf } = require('../utils/serializers');

/**
 * Nhắc các công việc sắp đến hạn (trong vòng hoursBefore giờ tới, chưa hoàn thành).
 * Mỗi công việc chỉ được nhắc một lần: "claim" nguyên tử bằng dueReminderSentAt.
 * Trả về số công việc đã nhắc.
 */
async function runReminders(now = new Date(), hoursBefore = config.reminder.hoursBefore) {
  const limit = new Date(now.getTime() + hoursBefore * 3600 * 1000);
  const candidates = await Task.find({
    status: { $ne: 'completed' },
    dueDate: { $gt: now, $lte: limit },
    dueReminderSentAt: null,
  })
    .select('_id')
    .lean();

  let count = 0;
  for (const { _id } of candidates) {
    const task = await Task.findOneAndUpdate(
      { _id, dueReminderSentAt: null, status: { $ne: 'completed' } },
      { $set: { dueReminderSentAt: now } },
      { returnDocument: 'after' }
    ).lean();
    if (!task) continue; // đã có tiến trình khác nhắc

    const recipientIds = [idOf(task.createdBy), ...task.assigneeIds.map(idOf)];
    await notificationService.dispatch({
      task,
      actor: null,
      recipientIds,
      type: EVENT.DUE_REMINDER,
      message: 'Công việc sắp đến hạn, hãy hoàn thành đúng hạn.',
    });
    count += 1;
  }
  return count;
}

let timer = null;

function startReminderJob() {
  if (!config.reminder.enabled || timer) return;
  const run = () => runReminders().catch((err) => console.error('Lỗi nhắc việc:', err.message));
  timer = setInterval(run, config.reminder.intervalMinutes * 60 * 1000);
  timer.unref();
  run();
}

function stopReminderJob() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runReminders, startReminderJob, stopReminderJob };
