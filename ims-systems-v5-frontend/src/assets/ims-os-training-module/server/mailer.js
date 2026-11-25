/*  iMS OS · Training & Competency · mailer
 *  Pluggable. Default transport writes .eml files to server/data/outbox so invitations can be inspected without an SMTP server.
 *  Production: replace `send` with the platform mail service (SES, SendGrid, Graph API…). Keep the message shape.
 *    message = { to, toName, from, subject, body, ics (text/calendar), attachments: [{ name, type, path | data }] }
 */
'use strict';
const fs = require('fs'), path = require('path');
const OUTBOX = process.env.OUTBOX || path.join(__dirname, 'data', 'outbox');
const FROM = process.env.MAIL_FROM || 'training@ims-os.example';

function eml(m) {
  const boundary = 'ims-' + Date.now().toString(36);
  const parts = [`--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${m.body}\r\n`];
  if (m.ics) parts.push(`--${boundary}\r\nContent-Type: text/calendar; charset=utf-8; method=REQUEST\r\nContent-Disposition: attachment; filename="invite.ics"\r\n\r\n${m.ics}\r\n`);
  (m.attachments || []).forEach(a => { const data = a.data || (a.path && fs.existsSync(a.path) ? fs.readFileSync(a.path).toString('base64') : null); if (data) parts.push(`--${boundary}\r\nContent-Type: ${a.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${a.name}"\r\n\r\n${data}\r\n`); });
  return `From: ${m.from || FROM}\r\nTo: ${m.toName ? `"${m.toName}" <${m.to}>` : m.to}\r\nSubject: ${m.subject}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n${parts.join('')}--${boundary}--\r\n`;
}

async function send(m) {
  if (!m.to) return { status: 'no-email' };
  if (process.env.MAIL_TRANSPORT === 'none') return { status: 'sent', id: 'dry-run' };
  fs.mkdirSync(OUTBOX, { recursive: true });
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  fs.writeFileSync(path.join(OUTBOX, `${id}.eml`), eml(m));
  return { status: 'sent', id, file: path.join(OUTBOX, `${id}.eml`) };
}
module.exports = { send, eml, OUTBOX, FROM };
