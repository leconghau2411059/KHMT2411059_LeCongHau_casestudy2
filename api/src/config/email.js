const { config } = require('./env');

/**
 * Tạo transport gửi email. Có SMTP_HOST và gói nodemailer → gửi thật.
 * Ngược lại → chế độ "console": chỉ in ra log (tiện khi phát triển, không gửi mail thật).
 */
function createTransport() {
  const { host, port, secure, user, pass } = config.smtp;
  if (host) {
    try {
      const nodemailer = require('nodemailer');
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
      });
    } catch {
      console.warn('Chưa cài nodemailer (npm install) – email sẽ chỉ được ghi log.');
    }
  }
  return {
    async sendMail(message) {
      console.log(`[email:console] Đến: ${message.to} | Tiêu đề: ${message.subject}`);
      return { messageId: 'console' };
    },
  };
}

module.exports = { createTransport };
