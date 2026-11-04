require('dotenv').config({ quiet: true });

const toBool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Thông tin SMTP lấy từ biến môi trường, không viết trực tiếp trong mã nguồn.
  smtp: {
    host: process.env.SMTP_HOST,
    port: toInt(process.env.SMTP_PORT, 587),
    secure: toBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  email: {
    from: process.env.EMAIL_FROM || 'Task Manager <no-reply@taskmanager.local>',
    // Số lần gửi tối đa cho mỗi email (gồm lần đầu và các lần thử lại) để tránh gửi trùng.
    maxAttempts: toInt(process.env.EMAIL_MAX_ATTEMPTS, 3),
  },
  reminder: {
    enabled: toBool(process.env.REMINDER_ENABLED, true),
    intervalMinutes: toInt(process.env.REMINDER_INTERVAL_MINUTES, 15),
    hoursBefore: toInt(process.env.REMINDER_HOURS_BEFORE, 24),
  },
};

/** Gọi lúc khởi động server: dừng ngay nếu thiếu cấu hình bắt buộc. */
function assertRequired() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${missing.join(', ')}. Hãy tạo file .env từ .env.example`
    );
  }
}

module.exports = { config, assertRequired };
