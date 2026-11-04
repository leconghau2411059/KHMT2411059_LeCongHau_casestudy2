const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const { privateUser } = require('../utils/serializers');

const BCRYPT_ROUNDS = 10;
// Dùng khi email không tồn tại để thời gian phản hồi không lộ email nào đã đăng ký.
const DUMMY_HASH = bcrypt.hashSync('khong-ton-tai-dummy-password', BCRYPT_ROUNDS);

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// POST /auth/register
async function register(req, res) {
  const { fullName, email, password } = req.valid;

  if (await User.exists({ email })) {
    throw new AppError(409, 'Email này đã được sử dụng', { email: 'Email đã tồn tại' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ fullName, email, passwordHash });

  res.status(201).json({
    message: 'Đăng ký tài khoản thành công',
    user: privateUser(user.toObject()),
  });
}

// POST /auth/login
async function login(req, res) {
  const { email, password } = req.valid;

  const user = await User.findOne({ email }).select('+passwordHash').lean();
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    throw new AppError(401, 'Email hoặc mật khẩu không đúng');
  }

  res.json({ token: signToken(user), user: privateUser(user) });
}

// GET /auth/me
async function me(req, res) {
  res.json({ user: privateUser(req.user) });
}

// PUT /auth/me
async function updateMe(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, req.valid, {
    new: true,
    runValidators: true,
  }).lean();
  res.json({ message: 'Cập nhật thông tin thành công', user: privateUser(user) });
}

// PUT /auth/change-password
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.valid;

  const user = await User.findById(req.user._id).select('+passwordHash');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError(400, 'Mật khẩu hiện tại không đúng', {
      currentPassword: 'Mật khẩu hiện tại không đúng',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  res.json({ message: 'Đổi mật khẩu thành công' });
}

module.exports = { register, login, me, updateMe, changePassword };
