/**
 * Kiểm tra dữ liệu giao việc và chia sẻ. Mỗi hàm trả về { value, errors }.
 */
const { PERMISSIONS } = require('../utils/constants');
const { isObjectId } = require('../middleware/validateMiddleware');

const MAX_RECIPIENTS = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkIdList(raw, errors, field, label) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string' || !isObjectId(v))) {
    errors[field] = `${label} phải là danh sách mã người dùng hợp lệ`;
    return [];
  }
  return [...new Set(raw)];
}

function checkEmailList(raw, errors) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string' || !EMAIL_REGEX.test(v.trim()))) {
    errors.emails = 'emails phải là danh sách email hợp lệ';
    return [];
  }
  return [...new Set(raw.map((v) => v.trim().toLowerCase()))];
}

function checkPermission(raw, errors) {
  if (!PERMISSIONS.includes(raw)) {
    errors.permission = `Quyền phải là một trong: ${PERMISSIONS.join(', ')}`;
    return undefined;
  }
  return raw;
}

/** POST /tasks/:id/assignees  { userIds?, emails?, primaryUserId? } */
function validateAssign(body) {
  const errors = {};
  const userIds = checkIdList(body.userIds, errors, 'userIds', 'userIds');
  const emails = checkEmailList(body.emails, errors);
  let primaryUserId = null;

  if (body.primaryUserId !== undefined && body.primaryUserId !== null) {
    if (typeof body.primaryUserId === 'string' && isObjectId(body.primaryUserId)) {
      primaryUserId = body.primaryUserId;
    } else {
      errors.primaryUserId = 'primaryUserId không hợp lệ';
    }
  }
  if (!errors.userIds && !errors.emails && userIds.length + emails.length === 0) {
    errors.userIds = 'Hãy chọn ít nhất một người để giao việc';
  }
  if (userIds.length + emails.length > MAX_RECIPIENTS) {
    errors.userIds = `Chỉ giao tối đa ${MAX_RECIPIENTS} người mỗi lần`;
  }
  return { value: { userIds, emails, primaryUserId }, errors };
}

/** PATCH /tasks/:id/assignees/:userId  { isPrimary: true } */
function validateAssigneeUpdate(body) {
  const errors = {};
  if (body.isPrimary !== true) errors.isPrimary = 'Chỉ hỗ trợ đặt người phụ trách chính (isPrimary: true)';
  return { value: { isPrimary: true }, errors };
}

/** POST /tasks/:id/shares  { userId | email, permission } */
function validateShare(body) {
  const errors = {};
  const value = { userId: null, email: null };

  if (body.userId !== undefined && body.userId !== null) {
    if (typeof body.userId === 'string' && isObjectId(body.userId)) value.userId = body.userId;
    else errors.userId = 'userId không hợp lệ';
  }
  if (body.email !== undefined && body.email !== null) {
    if (typeof body.email === 'string' && EMAIL_REGEX.test(body.email.trim())) {
      value.email = body.email.trim().toLowerCase();
    } else {
      errors.email = 'Email không hợp lệ';
    }
  }
  if (!errors.userId && !errors.email && !value.userId && !value.email) {
    errors.userId = 'Hãy chọn người được chia sẻ (userId hoặc email)';
  }
  value.permission = checkPermission(body.permission, errors);
  return { value, errors };
}

/** PATCH /tasks/:id/shares/:shareId  { permission } */
function validateShareUpdate(body) {
  const errors = {};
  return { value: { permission: checkPermission(body.permission, errors) }, errors };
}

module.exports = {
  MAX_RECIPIENTS,
  validateAssign,
  validateAssigneeUpdate,
  validateShare,
  validateShareUpdate,
};
