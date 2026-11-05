const { EVENT } = require('./constants');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
    : 'chưa đặt';

const HEADLINES = {
  [EVENT.TASK_ASSIGNED]: 'Bạn được giao một công việc',
  [EVENT.TASK_UNASSIGNED]: 'Bạn không còn phụ trách một công việc',
  [EVENT.TASK_SHARED]: 'Một công việc được chia sẻ với bạn',
  [EVENT.SHARE_UPDATED]: 'Quyền truy cập công việc của bạn đã thay đổi',
  [EVENT.SHARE_REVOKED]: 'Quyền truy cập công việc của bạn đã bị thu hồi',
  [EVENT.STATUS_CHANGED]: 'Trạng thái công việc đã thay đổi',
  [EVENT.TASK_COMPLETED]: 'Công việc đã hoàn thành',
  [EVENT.DUE_DATE_CHANGED]: 'Hạn hoàn thành đã thay đổi',
  [EVENT.DUE_REMINDER]: 'Công việc sắp đến hạn',
};

/**
 * Soạn email. Mọi dữ liệu do người dùng nhập (tên, tiêu đề) đều được escape HTML.
 * Trả về { subject, html, text }.
 */
function buildEmail({ type, task, actorName, detail }) {
  const headline = HEADLINES[type] || 'Thông báo công việc';
  const lines = [
    `Công việc: ${task.title}`,
    `Hạn hoàn thành: ${formatDate(task.dueDate)}`,
  ];
  if (actorName) lines.push(`Thực hiện bởi: ${actorName}`);
  if (detail) lines.push(detail);

  const subject = `[Task Manager] ${headline}: ${task.title}`.slice(0, 200);
  const text = `${headline}\n\n${lines.join('\n')}\n`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:520px">` +
    `<h2 style="color:#1D61E7">${escapeHtml(headline)}</h2>` +
    lines.map((l) => `<p>${escapeHtml(l)}</p>`).join('') +
    `<p style="color:#888;font-size:12px">Email tự động từ Task Manager.</p></div>`;
  return { subject, html, text };
}

module.exports = { escapeHtml, buildEmail, HEADLINES };
