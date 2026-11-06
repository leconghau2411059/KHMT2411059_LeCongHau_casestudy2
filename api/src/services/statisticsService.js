const Task = require('../models/Task');
const taskService = require('./taskService');
const { STATUSES, PRIORITIES } = require('../utils/constants');
const { idOf, taskView, isOverdue } = require('../utils/serializers');

const zeroCounts = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

/** Thống kê theo trạng thái và mức ưu tiên (hàm thuần). */
function summarizeTasks(tasks, now = new Date()) {
  const byStatus = zeroCounts(STATUSES);
  const byPriority = zeroCounts(PRIORITIES);
  let overdue = 0;
  for (const t of tasks) {
    byStatus[t.status] += 1;
    byPriority[t.priority] += 1;
    if (isOverdue(t, now)) overdue += 1;
  }
  const total = tasks.length;
  const completionRate = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);
  return { total, byStatus, byPriority, overdue, completionRate };
}

/** Thống kê giao việc của một người (hàm thuần). */
function summarizeAssignments(tasks, userId) {
  const uid = String(userId);
  const created = tasks.filter((t) => idOf(t.createdBy) === uid);
  const assigned = tasks.filter((t) => (t.assigneeIds || []).some((a) => idOf(a) === uid));
  const primary = tasks.filter((t) => idOf(t.primaryAssigneeId) === uid);
  const sharedOnly = tasks.filter(
    (t) => idOf(t.createdBy) !== uid && !(t.assigneeIds || []).some((a) => idOf(a) === uid)
  );
  return {
    created: created.length,
    assigned: assigned.length,
    primaryResponsible: primary.length,
    sharedWithMe: sharedOnly.length,
    assignedByStatus: summarizeTasks(assigned).byStatus,
    createdAndAssignedToOthers: created.filter((t) => (t.assigneeIds || []).length > 0).length,
  };
}

/** Công việc sắp đến hạn (trong `days` ngày tới) và quá hạn; bỏ qua việc đã hoàn thành (hàm thuần). */
function splitDeadlines(tasks, now = new Date(), days = 7) {
  const limit = new Date(now.getTime() + days * 24 * 3600 * 1000);
  const open = tasks.filter((t) => t.status !== 'completed' && t.dueDate);
  const byDue = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);
  const overdue = open.filter((t) => new Date(t.dueDate) < now).sort(byDue);
  const upcoming = open.filter((t) => new Date(t.dueDate) >= now && new Date(t.dueDate) <= limit).sort(byDue);
  return { overdue, upcoming };
}

/** Chỉ thống kê trên các công việc người dùng có quyền truy cập. */
async function loadAccessible(userId, populate = false) {
  const filter = await taskService.buildListFilter(userId, {});
  const query = Task.find(filter);
  if (populate) query.populate(taskService.POPULATE);
  return query.lean();
}

async function presentList(tasks, userId) {
  const resolve = await taskService.buildAccessResolver(tasks, userId);
  return tasks.map((t) => taskView(t, resolve(t)));
}

module.exports = {
  summarizeTasks,
  summarizeAssignments,
  splitDeadlines,
  loadAccessible,
  presentList,
};
