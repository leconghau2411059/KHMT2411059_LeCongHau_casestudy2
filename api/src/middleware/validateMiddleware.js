const AppError = require('../utils/AppError');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

/**
 * Chạy hàm kiểm tra dữ liệu (validator trả về { value, errors }).
 * Hợp lệ: gắn dữ liệu đã làm sạch vào req.valid. Sai: trả 400 kèm danh sách lỗi.
 */
function validate(validator, source = 'body') {
  return (req, res, next) => {
    const { value, errors } = validator(req[source] || {});
    if (errors && Object.keys(errors).length > 0) {
      throw new AppError(400, 'Dữ liệu không hợp lệ', errors);
    }
    req.valid = value;
    next();
  };
}

/** Kiểm tra các tham số đường dẫn (vd :id, :userId) là ObjectId hợp lệ. */
function validateObjectIdParams(...names) {
  return (req, res, next) => {
    for (const name of names) {
      if (!isObjectId(req.params[name])) {
        throw new AppError(400, `Tham số ${name} không hợp lệ`);
      }
    }
    next();
  };
}

module.exports = { validate, validateObjectIdParams, isObjectId };
