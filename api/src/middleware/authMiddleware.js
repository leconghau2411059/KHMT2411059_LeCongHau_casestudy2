const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/User');

/** Yêu cầu header "Authorization: Bearer <token>"; gắn người dùng hiện tại vào req.user. */
async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Bạn chưa đăng nhập');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) throw new AppError(401, 'Tài khoản không còn tồn tại');

  req.user = user;
  next();
}

module.exports = { authenticate };
