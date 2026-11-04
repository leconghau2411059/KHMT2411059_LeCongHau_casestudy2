/**
 * Các hàm kiểm tra dữ liệu đầu vào cho nhóm API /auth.
 * Mỗi hàm trả về { value, errors }: value là dữ liệu đã làm sạch, errors là { tênTrường: thôngĐiệp }.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkFullName(raw, errors, field = 'fullName') {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value.length < 2 || value.length > 100) {
    errors[field] = 'Họ tên phải từ 2 đến 100 ký tự';
  }
  return value;
}

function checkEmail(raw, errors, field = 'email') {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) {
    errors[field] = 'Vui lòng nhập email';
  } else if (value.length > 254 || !EMAIL_REGEX.test(value)) {
    errors[field] = 'Email không hợp lệ';
  }
  return value;
}

/** Mật khẩu: 8-72 ký tự (72 là giới hạn của bcrypt), có ít nhất 1 chữ và 1 số. */
function checkNewPassword(raw, errors, field = 'password') {
  const value = typeof raw === 'string' ? raw : '';
  if (value.length < 8 || value.length > 72) {
    errors[field] = 'Mật khẩu phải từ 8 đến 72 ký tự';
  } else if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    errors[field] = 'Mật khẩu phải có cả chữ và số';
  }
  return value;
}

function validateRegister(body) {
  const errors = {};
  const fullName = checkFullName(body.fullName, errors);
  const email = checkEmail(body.email, errors);
  const password = checkNewPassword(body.password, errors);
  if (body.confirmPassword !== undefined && body.confirmPassword !== password) {
    errors.confirmPassword = 'Xác nhận mật khẩu không khớp';
  }
  return { value: { fullName, email, password }, errors };
}

function validateLogin(body) {
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email) errors.email = 'Vui lòng nhập email';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu';
  return { value: { email, password }, errors };
}

function validateUpdateProfile(body) {
  const errors = {};
  const value = {};

  if (body.fullName !== undefined) value.fullName = checkFullName(body.fullName, errors);

  if (body.avatarUrl !== undefined) {
    const url = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : null;
    if (url === null || url.length > 500 || (url !== '' && !/^https?:\/\//i.test(url))) {
      errors.avatarUrl = 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://';
    } else {
      value.avatarUrl = url;
    }
  }

  if (Object.keys(value).length === 0 && Object.keys(errors).length === 0) {
    errors.fullName = 'Không có thông tin nào để cập nhật';
  }
  return { value, errors };
}

function validateChangePassword(body) {
  const errors = {};
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  if (!currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';

  const newPassword = checkNewPassword(body.newPassword, errors, 'newPassword');
  if (!errors.newPassword && newPassword === currentPassword) {
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  }
  return { value: { currentPassword, newPassword }, errors };
}

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
};
