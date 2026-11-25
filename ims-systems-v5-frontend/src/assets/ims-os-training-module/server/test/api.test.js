const test = require('node:test'), assert = require('node:assert'), http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { createApp, Store } = require('../server.js');
let server, base;
test.before(async () => { const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'imst-')), 'store.json'); const store = new Store(file); store.load(); server = http.createServer(createApp(store)); await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; });
test.after(() => server.close());
const call = async (method, p, body, headers) => { const r = await fetch(base + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body ? JSON.stringify(body) : undefined, redirect: 'manual' }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = t; } return { status: r.status, body: j, headers: r.headers }; };
const MGR = { Authorization: 'Bearer demo-manager' };

test('model, readiness, gaps and plan are served', async () => { let r = await call('GET', '/api/model'); assert.equal(r.status, 200); assert.ok(r.body.people.length > 10); assert.equal(r.body.user.role, 'viewer'); r = await call('GET', '/api/readiness'); assert.equal(r.body.length, 10); r = await call('GET', '/api/gaps'); assert.ok(r.body.length > 0); r = await call('GET', '/api/plan?months=3'); assert.ok(r.body[0].competency); });
test('competent check for the asset module', async () => { let r = await call('GET', '/api/competent?personId=p03&covers=Lifting%20equipment'); assert.equal(r.body.ok, true); r = await call('GET', '/api/competent?personId=p04&covers=Lifting%20equipment'); assert.equal(r.body.ok, false); assert.ok(r.body.required.length); r = await call('GET', '/api/competent'); assert.equal(r.status, 400); });
test('self-service link redirects; self token sees only own data and can acknowledge', async () => {
  let r = await call('GET', '/t/p03'); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/index.html?me=p03');
  r = await call('GET', '/api/model', null, { 'X-Self-Token': 'p03' }); assert.equal(r.body.people.length, 1); assert.equal(r.body.user.role, 'self');
  r = await call('POST', '/api/people/p03/acknowledge', { cid: 'pol-infosec', answers: [1, 0] }, { 'X-Self-Token': 'p03' }); assert.equal(r.status, 200); assert.equal(r.body.provider, 'Self-service');
  r = await call('POST', '/api/people/p04/acknowledge', { cid: 'pol-infosec', answers: [1, 0] }, { 'X-Self-Token': 'p03' }); assert.equal(r.status, 403);
  r = await call('POST', '/api/people/p03/acknowledge', { cid: 'pol-hs', answers: [0, 0, 0] }, { 'X-Self-Token': 'p03' }); assert.equal(r.status, 422); assert.equal(r.body.code, 'quiz_failed');
  r = await call('POST', '/api/records', { personId: 'p03', cid: 'flt', ref: 'photo-1' }, { 'X-Self-Token': 'p03' }); assert.equal(r.status, 200); assert.match(r.body.provider, /to verify/);
});
test('manager-only writes are protected and validated', async () => {
  let r = await call('POST', '/api/people', { name: 'New Person', site: 'S' }); assert.equal(r.status, 403);
  r = await call('POST', '/api/people', { name: 'New Person', site: 'S', roles: ['pilot'] }, MGR); assert.equal(r.status, 422);
  r = await call('POST', '/api/people', { name: 'New Person', site: 'S', roles: ['driver'], start: '2026-11-01' }, MGR); assert.equal(r.status, 200); const id = r.body.id;
  r = await call('PUT', `/api/people/${id}`, { manager: 'M. Grant' }, MGR); assert.equal(r.body.manager, 'M. Grant'); assert.match(r.body.hist[0].what, /Updated: manager/);
  r = await call('POST', '/api/records', { personId: id, cid: 'driver', ref: 'DVLA-1' }, MGR); assert.equal(r.status, 200);
  r = await call('POST', '/api/sessions', { cid: 'fire', date: '2026-11-10', attendees: [id, 'p11'], provider: 'Internal' }, MGR); assert.equal(r.status, 200); const sid = r.body.id;
  r = await call('POST', `/api/sessions/${sid}/complete`, { outcomes: {} }, MGR); assert.equal(r.status, 200); assert.equal(r.body.length, 2);
  r = await call('POST', `/api/people/${id}/leaver`, { date: '2026-11-19' }, MGR); assert.equal(r.body.status, 'Leaver');
});
test('CSV, static and traversal', async () => { let r = await call('GET', '/api/matrix.csv'); assert.equal(r.status, 200); assert.match(r.body, /^"Person"/); r = await call('GET', '/index.html'); assert.match(r.body, /adapter: 'rest'/); r = await call('GET', '/../server/server.js'); assert.notEqual(r.status, 200); });

test('tenant configuration endpoints', async () => {
  let r = await call('POST', '/api/competencies', { name: 'Abrasive wheels', months: 36, evidence: 'Certificate', basis: 'PUWER reg 9' }); assert.equal(r.status, 403);
  r = await call('POST', '/api/competencies', { name: 'Abrasive wheels', months: 36, evidence: 'Certificate', basis: 'PUWER reg 9' }, MGR); assert.equal(r.status, 200); const cid = r.body.id;
  r = await call('PUT', `/api/competencies/${cid}`, { name: 'Abrasive wheels (bench)', months: 36, evidence: 'Certificate' }, MGR); assert.equal(r.body.name, 'Abrasive wheels (bench)');
  r = await call('POST', '/api/roles', { name: 'Grinder operator', mandatory: [cid] }, MGR); assert.equal(r.status, 200); const rid = r.body.id;
  r = await call('DELETE', `/api/roles/${rid}`, null, MGR); assert.equal(r.status, 200);
  r = await call('DELETE', `/api/competencies/${cid}`, null, MGR); assert.equal(r.body.archived, true);
  r = await call('PUT', '/api/settings', { leadDays: 30, inviteSubject: 'Hi {{name}}' }, MGR); assert.equal(r.body.leadDays, 30);
  r = await call('GET', '/api/log', null, MGR); assert.ok(r.body.length >= 5);
});
test('sessions: external attendee, materials upload, invitations to outbox, outputs, completion', async () => {
  process.env.MAIL_TRANSPORT = '';
  let r = await call('POST', '/api/people/external', { name: 'Jo Contractor', email: 'jo@acme.example', company: 'Acme' }, MGR); assert.equal(r.status, 200); const ext = r.body.id;
  r = await call('POST', '/api/sessions', { cid: 'fire', date: '2026-11-10', time: '10:00', duration: 60, location: 'Room 1', attendees: [ext, 'p03'] }, MGR); assert.equal(r.status, 200); const sid = r.body.id;
  r = await call('POST', '/api/files', { name: 'slides.pdf', type: 'application/pdf', size: 5, data: 'data:application/pdf;base64,' + Buffer.from('hello').toString('base64') }, MGR); assert.equal(r.status, 200); const fileId = r.body.fileId;
  r = await call('GET', `/files/${fileId}`); assert.equal(r.status, 200); assert.equal(r.body, 'hello');
  r = await call('POST', `/api/sessions/${sid}/materials`, { name: 'slides.pdf', size: 5, type: 'application/pdf', fileId, url: '/files/' + fileId, shared: true }, MGR); assert.equal(r.status, 200);
  r = await call('POST', `/api/sessions/${sid}/invite`, { attachFiles: true }, MGR); assert.equal(r.status, 200); assert.equal(r.body.results.filter(x => x.status === 'sent').length, 2); assert.match(r.body.results[0].body, /slides\.pdf/);
  const eml = fs.readdirSync(r.body.outbox).filter(f => f.endsWith('.eml')); assert.ok(eml.length >= 2); const txt = fs.readFileSync(path.join(r.body.outbox, eml[eml.length - 1]), 'utf8'); assert.match(txt, /text\/calendar/); assert.match(txt, /filename="slides.pdf"/);
  r = await call('POST', `/api/sessions/${sid}/outputs`, { name: 'attendance.pdf', size: 5, fileId }, MGR); assert.equal(r.status, 200);
  r = await call('POST', `/api/sessions/${sid}/complete`, { outcomes: { p03: { result: 'Absent' } } }, MGR); assert.equal(r.status, 200); assert.equal(r.body.length, 1); assert.equal(r.body[0].fileId, fileId);
  r = await call('POST', '/api/files', { name: 'x', data: 'nope' }, MGR); assert.equal(r.status, 422);
});

test('exemption endpoints', async () => { let r = await call('POST', '/api/people/p04/exempt', { cid: 'press-brake', reason: 'Moved to inspection' }); assert.equal(r.status, 403); r = await call('POST', '/api/people/p04/exempt', { cid: 'press-brake', reason: 'Moved to inspection' }, MGR); assert.equal(r.status, 200); assert.equal(r.body.exempt[0].cid, 'press-brake'); r = await call('DELETE', '/api/people/p04/exempt/press-brake', null, MGR); assert.equal(r.body.exempt.length, 0); });
test('RSVP endpoint: link redirects, attendee can respond with self token, others cannot', async () => {
  let r = await call('GET', '/api/model'); const s = r.body.sessions.find(x => x.status === 'Planned'); const pid = s.attendees[0], other = r.body.people.find(p => !s.attendees.includes(p.id)).id;
  r = await call('GET', `/r/${s.id}/${pid}?a=accept`); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), `/index.html?rsvp=${s.id}|${pid}&a=accept`);
  r = await call('POST', `/api/sessions/${s.id}/rsvp`, { personId: pid, status: 'accepted' }, { 'X-Self-Token': pid }); assert.equal(r.status, 200); assert.equal(r.body.status, 'accepted');
  r = await call('POST', `/api/sessions/${s.id}/rsvp`, { personId: pid, status: 'declined' }, { 'X-Self-Token': other }); assert.equal(r.status, 403);
  r = await call('POST', `/api/sessions/${s.id}/rsvp`, { personId: pid, status: 'declined' }); assert.equal(r.status, 403);
  r = await call('POST', `/api/sessions/${s.id}/rsvp`, { personId: pid, status: 'tentative', note: 'maybe' }, MGR); assert.equal(r.status, 200);
  r = await call('GET', '/api/model', null, MGR); assert.equal(r.body.sessions.find(x => x.id === s.id).rsvp[pid].status, 'tentative');
  r = await call('GET', '/api/reminders', null, MGR); assert.equal(r.status, 200); assert.ok(Array.isArray(r.body));
});
