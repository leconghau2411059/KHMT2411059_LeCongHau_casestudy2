const AppError = require('../utils/AppError');
const User = require('../models/User');
const { publicUser } = require('../utils/serializers');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /users/search?q=  (tìm theo tên hoặc email, không trả về chính mình)
async function search(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    throw new AppError(400, 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
  }

  const pattern = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [{ fullName: pattern }, { email: pattern }],
  })
    .sort({ fullName: 1 })
    .limit(10)
    .lean();

  res.json({ users: users.map(publicUser) });
}

// GET /users/:id  (thông tin công khai)
async function getById(req, res) {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  res.json({ user: publicUser(user) });
}

module.exports = { search, getById };
