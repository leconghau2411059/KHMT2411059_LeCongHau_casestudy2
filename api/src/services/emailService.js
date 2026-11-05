const EmailLog = require('../models/EmailLog');
const { config } = require('../config/env');
const { createTransport } = require('../config/email');

let transport = null;
const inFlight = new Set();

const getTransport = () => {
  if (!transport) transport = createTransport();
  return transport;
};

/** Thay transport (dùng trong test). */
function setTransport(t) {
  transport = t;
}

/** Gửi một email theo bản ghi log. Chỉ nhận bản ghi đang pending (claim nguyên tử → không gửi trùng). */
async function deliver(logId) {
  const log = await EmailLog.findOneAndUpdate(
    { _id: logId, status: 'pending' },
    { $set: { status: 'sending' }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  ).select('+html +text');
  if (!log) return null;

  try {
    await getTransport().sendMail({
      from: config.email.from,
      to: log.to,
      subject: log.subject,
      text: log.text,
      html: log.html,
    });
    log.status = 'sent';
    log.sentAt = new Date();
    log.lastError = '';
  } catch (err) {
    log.status = 'failed';
    log.lastError = String(err.message || err).slice(0, 300);
    console.error('Gửi email thất bại:', log.lastError);
  }
  await log.save();
  return log;
}

/** Ghi log (pending) rồi gửi nền, không chặn request. */
async function enqueue({ taskId, recipient, type, subject, html, text }) {
  const log = await EmailLog.create({
    taskId,
    recipientId: recipient._id,
    to: recipient.email,
    type,
    subject,
    html,
    text,
  });
  const job = deliver(log._id)
    .catch((err) => console.error('Lỗi gửi email:', err.message))
    .finally(() => inFlight.delete(job));
  inFlight.add(job);
  return log;
}

/** Chờ các email đang gửi nền hoàn tất (dùng trong test). */
async function flushPending() {
  await Promise.all([...inFlight]);
}

/** Gửi lại thủ công một email đã lỗi. Trả về log mới, hoặc null nếu không đủ điều kiện (đã gửi / hết lượt). */
async function retry(logId) {
  const claimed = await EmailLog.findOneAndUpdate(
    { _id: logId, status: 'failed', attempts: { $lt: config.email.maxAttempts } },
    { $set: { status: 'pending' } },
    { returnDocument: 'after' }
  );
  if (!claimed) return null;
  return deliver(claimed._id);
}

module.exports = { enqueue, deliver, retry, flushPending, setTransport };
