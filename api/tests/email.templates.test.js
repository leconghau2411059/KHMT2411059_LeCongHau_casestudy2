const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEmail, escapeHtml } = require('../src/utils/emailTemplates');
const { EVENT } = require('../src/utils/constants');

test('escapeHtml chặn chèn HTML', () => {
  assert.equal(escapeHtml('<script>"x"&\'</script>'), '&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;');
});

test('buildEmail: tiêu đề do người dùng nhập được escape trong html, giữ nguyên trong text', () => {
  const task = { title: '<img src=x onerror=alert(1)>', dueDate: '2030-01-01T00:00:00Z' };
  const mail = buildEmail({ type: EVENT.TASK_ASSIGNED, task, actorName: 'A <b>', detail: 'Chi tiết' });
  assert.ok(!mail.html.includes('<img'));
  assert.ok(!mail.html.includes('<b>'));
  assert.ok(mail.html.includes('&lt;img'));
  assert.ok(mail.text.includes('<img src=x'));
  assert.ok(mail.subject.startsWith('[Task Manager]'));
  assert.ok(mail.subject.length <= 200);
});

test('buildEmail: có nội dung cho mọi loại sự kiện', () => {
  for (const type of Object.values(EVENT)) {
    const mail = buildEmail({ type, task: { title: 'Việc' } });
    assert.ok(mail.subject && mail.html && mail.text, type);
  }
});
