/**
 * Kiểm tra dữ liệu đầu vào cho công việc. Mỗi hàm trả về { value, errors }.
 */
const { PRIORITIES, STATUSES } = require('../utils/constants');
const { isObjectId } = require('../middleware/validateMiddleware');

const SCOPES = ['created', 'assigned', 'shared'];
const SORT_FIELDS = ['createdAt', 'dueDate', 'priority'];
const DEFAULT_ORDER = { createdAt: 'desc', dueDate: 'asc', priority: 'desc' };

/** undefined: không gửi; null: xóa ngày; Date: hợp lệ. */
function parseDate(raw, errors, field, label) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const date = typeof raw === 'string' ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    errors[field] = `${label} không hợp lệ (cần định dạng ngày giờ ISO 8601)`;
    return undefined;
  }
  return date;
}

function checkTitle(raw, errors) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) errors.title = 'Tên công việc không được để trống';
  else if (value.length > 200) errors.title = 'Tên công việc tối đa 200 ký tự';
  return value;
}

function checkDescription(raw, errors) {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string' || raw.length > 5000) {
    errors.description = 'Mô tả phải là chuỗi tối đa 5000 ký tự';
    return '';
  }
  return raw.trim();
}

function checkEnum(raw, allowed, errors, field, label) {
  if (!allowed.includes(raw)) {
    errors[field] = `${label} phải là một trong: ${allowed.join(', ')}`;
    return undefined;
  }
  return raw;
}

function checkDateOrder(startDate, dueDate, errors) {
  if (startDate && dueDate && dueDate < startDate) {
    errors.dueDate = 'Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu';
  }
}

function validateCreateTask(body) {
  const errors = {};
  const value = {
    title: checkTitle(body.title, errors),
    description: checkDescription(body.description, errors),
    priority: 'medium',
    status: 'todo',
    startDate: parseDate(body.startDate, errors, 'startDate', 'Ngày bắt đầu') ?? null,
    dueDate: parseDate(body.dueDate, errors, 'dueDate', 'Hạn hoàn thành') ?? null,
  };
  if (body.priority !== undefined) {
    value.priority = checkEnum(body.priority, PRIORITIES, errors, 'priority', 'Mức ưu tiên');
  }
  if (body.status !== undefined) {
    value.status = checkEnum(body.status, STATUSES, errors, 'status', 'Trạng thái');
  }
  checkDateOrder(value.startDate, value.dueDate, errors);
  return { value, errors };
}

/** Cập nhật một phần: chỉ kiểm tra và giữ lại các trường được gửi lên. */
function validateUpdateTask(body) {
  const errors = {};
  const value = {};

  if (body.title !== undefined) value.title = checkTitle(body.title, errors);
  if (body.description !== undefined) value.description = checkDescription(body.description, errors);
  if (body.priority !== undefined) {
    value.priority = checkEnum(body.priority, PRIORITIES, errors, 'priority', 'Mức ưu tiên');
  }
  if (body.status !== undefined) {
    value.status = checkEnum(body.status, STATUSES, errors, 'status', 'Trạng thái');
  }
  const startDate = parseDate(body.startDate, errors, 'startDate', 'Ngày bắt đầu');
  if (startDate !== undefined) value.startDate = startDate;
  const dueDate = parseDate(body.dueDate, errors, 'dueDate', 'Hạn hoàn thành');
  if (dueDate !== undefined) value.dueDate = dueDate;

  checkDateOrder(value.startDate, value.dueDate, errors);

  if (Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors.title = 'Không có thông tin nào để cập nhật';
  }
  return { value, errors };
}

function validateStatus(body) {
  const errors = {};
  const status = checkEnum(body.status, STATUSES, errors, 'status', 'Trạng thái');
  return { value: { status }, errors };
}

function validateListQuery(query) {
  const errors = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const value = {};

  if (str(query.scope)) value.scope = checkEnum(str(query.scope), SCOPES, errors, 'scope', 'scope');
  if (str(query.status)) value.status = checkEnum(str(query.status), STATUSES, errors, 'status', 'status');
  if (str(query.priority)) {
    value.priority = checkEnum(str(query.priority), PRIORITIES, errors, 'priority', 'priority');
  }
  if (str(query.q)) {
    value.q = str(query.q).slice(0, 100);
  }
  if (str(query.assigneeId)) {
    if (isObjectId(str(query.assigneeId))) value.assigneeId = str(query.assigneeId);
    else errors.assigneeId = 'assigneeId không hợp lệ';
  }

  value.sortBy = str(query.sortBy) || 'createdAt';
  if (!SORT_FIELDS.includes(value.sortBy)) {
    errors.sortBy = `sortBy phải là một trong: ${SORT_FIELDS.join(', ')}`;
  }
  value.order = str(query.order) || DEFAULT_ORDER[value.sortBy] || 'desc';
  if (!['asc', 'desc'].includes(value.order)) errors.order = 'order phải là asc hoặc desc';

  const page = str(query.page) ? Number(query.page) : 1;
  const limit = str(query.limit) ? Number(query.limit) : 20;
  if (!Number.isInteger(page) || page < 1) errors.page = 'page phải là số nguyên từ 1';
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    errors.limit = 'limit phải là số nguyên từ 1 đến 100';
  }
  value.page = page;
  value.limit = limit;

  return { value, errors };
}

module.exports = {
  SCOPES,
  SORT_FIELDS,
  validateCreateTask,
  validateUpdateTask,
  validateStatus,
  validateListQuery,
};
