/*  Daily reminders job. Run once a day (cron / scheduler):  node server/remind.js
 *  Sends: session reminders at settings.reminderDays before the date (skipping decliners); expiry warnings at leadDays and 14 days; expired-yesterday notices.
 *  Uses the same mailer as invitations. Replace with the platform's job runner and mail service.
 */
'use strict';
const path = require('path');
const DATA = process.env.DATA || path.join(__dirname, 'data', 'store.json');
process.env.OUTBOX = process.env.OUTBOX || path.join(path.dirname(DATA), 'outbox');
const R = require('../public/js/rules.js'); const mailer = require('./mailer.js'); const { Store } = require('./server.js');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3100'; const SELF_BASE = process.env.SELF_BASE || BASE_URL + '/t/'; const RSVP_BASE = process.env.RSVP_BASE || BASE_URL + '/r/';
(async () => {
  const store = new Store(DATA); const M = store.load(); const due = R.remindersDue(M); let sent = 0;
  for (const d of due) {
    const p = R.byId(M.people, d.personId); if (!p || !p.email) continue; let m;
    if (d.kind === 'session') { const s = R.byId(M.sessions, d.sessionId); const inv = R.buildInvite(M, s, p, { baseUrl: BASE_URL, selfBase: SELF_BASE, rsvpBase: RSVP_BASE }); m = Object.assign(inv, { subject: `Reminder (${d.days} day${d.days === 1 ? '' : 's'}): ` + inv.subject, body: (d.rsvp === 'pending' ? 'You have not yet responded to this invitation.\n\n' : '') + inv.body }); }
    else { const c = R.byId(M.competencies, d.cid); m = { to: p.email, toName: p.name, subject: `${c.name}: ${d.kind === 'expired' ? 'expired yesterday' : 'expires in ' + d.days + ' days'} · ${M.org}`, body: `Hello ${p.name},\n\nYour ${c.name} ${d.kind === 'expired' ? 'expired yesterday' : 'expires in ' + d.days + ' days'}. Please arrange renewal with your manager${d.manager ? ' (' + d.manager + ')' : ''}.\n\nYour training record: ${SELF_BASE}${encodeURIComponent(p.id)}\n\n${M.org} · Training & competency` }; }
    const r = await mailer.send(m); if (r.status === 'sent') sent++;
  }
  console.log(`${due.length} reminder(s) due, ${sent} sent (outbox: ${process.env.OUTBOX})`);
})();
