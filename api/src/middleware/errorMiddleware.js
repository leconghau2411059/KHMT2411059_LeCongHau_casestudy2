const AppError = require('../utils/AppError');

function notFound(req, res) {
  res.status(404).json({ message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Lỗi nghiệp vụ: thông điệp đã được chuẩn bị sẵn và an toàn để trả về.
  if (err instanceof AppError) {
    const body = { message: err.message };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }

  // JSON gửi lên sai cú pháp.
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ message: 'Nội dung gửi lên không phải JSON hợp lệ' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn' });
  }

  // Lỗi của Mongoose / MongoDB.
  if (err.name === 'ValidationError') {
    const errors = {};
    for (const [field, e] of Object.entries(err.errors || {})) errors[field] = e.message;
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Giá trị không hợp lệ' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Dữ liệu đã tồn tại' });
  }

  // Lỗi không dự đoán được: ghi log phía server, KHÔNG trả chi tiết cho client.
  console.error('[lỗi máy chủ]', err);
  return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
}

module.exports = { notFound, errorHandler };
