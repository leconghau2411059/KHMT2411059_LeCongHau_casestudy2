const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/services/statisticsService');

const NOW = new Date('2030-06-10T00:00:00Z');
const day = (n) => new Date(NOW.getTime() + n * 86400000).toISOString();
const ME = '64b7f0c2a1b2c3d4e5f60001';
const OTHER = '64b7f0c2a1b2c3d4e5f60002';

const tasks = [
  { status: 'todo', priority: 'high', dueDate: day(-1), createdBy: ME, assigneeIds: [OTHER], primaryAssigneeId: OTHER },
  { status: 'in_progress', priority: 'low', dueDate: day(2), createdBy: OTHER, assigneeIds: [ME], primaryAssigneeId: ME },
  { status: 'completed', priority: 'medium', dueDate: day(-3), createdBy: OTHER, assigneeIds: [ME], primaryAssigneeId: ME },
  { status: 'todo', priority: 'medium', dueDate: null, createdBy: OTHER, assigneeIds: [], primaryAssigneeId: null },
  { status: 'todo', priority: 'medium', dueDate: day(30), createdBy: ME, assigneeIds: [], primaryAssigneeId: null },
];

test('summarizeTasks: đếm theo trạng thái, ưu tiên, quá hạn, tỷ lệ hoàn thành', () => {
  const r = s.summarizeTasks(tasks, NOW);
  assert.equal(r.total, 5);
  assert.deepEqual(r.byStatus, { todo: 3, in_progress: 1, completed: 1 });
  assert.deepEqual(r.byPriority, { low: 1, medium: 3, high: 1 });
  assert.equal(r.overdue, 1); // việc đã hoàn thành quá hạn không tính
  assert.equal(r.completionRate, 20);
});

test('summarizeTasks: danh sách rỗng', () => {
  const r = s.summarizeTasks([], NOW);
  assert.equal(r.total, 0);
  assert.equal(r.completionRate, 0);
});

test('summarizeAssignments: đếm theo vai trò', () => {
  const r = s.summarizeAssignments(tasks, ME);
  assert.equal(r.created, 2);
  assert.equal(r.assigned, 2);
  assert.equal(r.primaryResponsible, 2);
  assert.equal(r.sharedWithMe, 1); // việc 4: không phải của mình, không được giao
  assert.equal(r.createdAndAssignedToOthers, 1);
  assert.deepEqual(r.assignedByStatus, { todo: 0, in_progress: 1, completed: 1 });
});

test('splitDeadlines: quá hạn và sắp đến hạn, sắp xếp theo hạn, bỏ việc đã xong', () => {
  const { overdue, upcoming } = s.splitDeadlines(tasks, NOW, 7);
  assert.equal(overdue.length, 1);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].status, 'in_progress');
  assert.equal(s.splitDeadlines(tasks, NOW, 60).upcoming.length, 2);
});
