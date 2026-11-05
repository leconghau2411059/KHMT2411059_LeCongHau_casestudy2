const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in_progress', 'completed'];
const PERMISSIONS = ['viewer', 'editor'];

// Các hành động ghi vào lịch sử hoạt động (task_activities).
const ACTIVITY = {
  CREATED: 'created',
  UPDATED: 'updated',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  PRIMARY_CHANGED: 'primary_changed',
  SHARED: 'shared',
  SHARE_UPDATED: 'share_updated',
  SHARE_REVOKED: 'share_revoked',
};

// Loại sự kiện của thông báo và email.
const EVENT = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_UNASSIGNED: 'task_unassigned',
  TASK_SHARED: 'task_shared',
  SHARE_UPDATED: 'share_updated',
  SHARE_REVOKED: 'share_revoked',
  STATUS_CHANGED: 'status_changed',
  TASK_COMPLETED: 'task_completed',
  DUE_DATE_CHANGED: 'due_date_changed',
  DUE_REMINDER: 'due_reminder',
};

const PRIORITY_RANK = { low: 1, medium: 2, high: 3 };

module.exports = { PRIORITIES, STATUSES, PERMISSIONS, ACTIVITY, EVENT, PRIORITY_RANK };
