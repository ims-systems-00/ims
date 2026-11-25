/*  iMS OS · Training & Competency module · reference backend (Node 18+, no dependencies)
 *  node server/server.js   → http://localhost:3100   UI at /, API at /api, self-service at /t/{personId}
 *  Other modules ask:       GET /api/competent?personId=p03&covers=Lifting%20equipment
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const R = require('../public/js/rules.js');
const DATA = process.env.DATA || path.join(__dirname, 'data', 'store.json');
process.env.OUTBOX = process.env.OUTBOX || path.join(path.dirname(DATA), 'outbox');
const mailer = require('./mailer.js');
const PORT = Number(process.env.PORT) || 3100;
const PUBLIC = path.join(__dirname, '..', 'public');
const SELF_BASE = process.env.SELF_BASE || `http://localhost:${PORT}/t/`;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const RSVP_BASE = process.env.RSVP_BASE || `${BASE_URL}/r/`;
const FILES = process.env.FILES || path.join(path.dirname(DATA), 'files');
const MAX_FILE = 25 * 1024 * 1024;

class Store {
  constructor(file) { this.file = file; this.model = null; this.version = 0; }
  load() { if (fs.existsSync(this.file)) this.model = JSON.parse(fs.readFileSync(this.file, 'utf8')); else { this.model = resolveSeed(JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', 'seed.json'), 'utf8'))); this.save(); } return this.model; }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(this.model, null, 1)); fs.renameSync(tmp, this.file); this.version++; }
}
function resolveSeed(seed) { const base = R.today(); const fix = v => { const m = typeof v === 'string' && v.match(/^@(-?\d+)d(.*)$/); return m ? R.iso(R.addDays(base, Number(m[1]))) + m[2] : v; }; const walk = o => Array.isArray(o) ? o.map(walk) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : fix(o); return walk(seed); }

/* auth: viewer < self < manager. Self-service: X-Self-Token = the person's id (production: a signed, expiring token in the link). */
function auth(req, store) {
  const h = req.headers.authorization || ''; const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const USERS = { 'demo-manager': { name: 'S. Ahmed', role: 'manager', personId: 'p01' }, 'demo-viewer': { name: 'Auditor', role: 'viewer' } };
  if (token && USERS[token]) return USERS[token];
  const self = (req.headers['x-self-token'] || '').toString(); const p = self && R.byId(store.model.people, self);
  if (p) return { name: p.name, role: 'self', personId: p.id };
  return { name: 'Viewer', role: 'viewer' };
}
const RANK = { viewer: 0, self: 1, manager: 2 };
function need(user, role) { if (RANK[user.role] < RANK[role]) throw httpErr(403, 'forbidden', `Needs role ${role}`); }
function httpErr(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const text = (res, status, body, type) => { res.writeHead(status, { 'Content-Type': type }); res.end(body); };
function readBody(req, limit) { return new Promise((resolve, reject) => { let d = ''; req.on('data', c => { d += c; if (d.length > (limit || 2e6)) reject(httpErr(413, 'too_large', 'Body too large')); }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(httpErr(400, 'bad_json', 'Invalid JSON')); } }); }); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const PERSON_FIELDS = ['name', 'roles', 'site', 'manager', 'start', 'email', 'status', 'end', 'extra', 'external', 'company'];

function createApp(store) {
  const routes = []; const on = (m, pat, h) => routes.push({ m, re: new RegExp('^' + pat.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), h });
  const M = () => store.model; const wrap = fn => { try { return fn(); } catch (e) { if (e.code && !e.status) e.status = e.code === 'not_found' ? 404 : 422; throw e; } };
  const stripSelf = (model, user) => user.role === 'self' ? Object.assign({}, model, { people: model.people.filter(p => p.id === user.personId), records: model.records.filter(r => r.personId === user.personId), sessions: (model.sessions || []).filter(s => s.attendees.includes(user.personId)) }) : model;

  on('GET', '/api/model', (q, u) => Object.assign({}, stripSelf(M(), u), { user: { name: u.name, role: u.role, personId: u.personId }, version: store.version, selfBase: SELF_BASE, baseUrl: BASE_URL }));
  on('GET', '/api/readiness', () => R.readiness(M()));
  on('GET', '/api/gaps', () => R.gaps(M()).map(g => ({ personId: g.person.id, person: g.person.name, cid: g.comp.id, competency: g.comp.name, st: g.st, next: g.next })));
  on('GET', '/api/plan', (q) => R.plan(M(), Number(q.query.months) || 3).map(n => ({ cid: n.comp.id, competency: n.comp.name, soonest: n.soonest, people: n.people.map(p => p.id), unbooked: n.unbooked.map(p => p.id) })));
  /* the question other modules ask */
  on('GET', '/api/competent', (q) => { if (!q.query.personId || !q.query.covers) throw httpErr(400, 'bad_request', 'personId and covers are required'); return R.isCompetent(M(), q.query.personId, q.query.covers); });
  on('GET', '/api/people', (q, u) => stripSelf(M(), u).people);
  on('POST', '/api/people', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); const p = { id: R.uid(), hist: [] }; PERSON_FIELDS.forEach(k => { if (b[k] != null) p[k] = b[k]; }); p.status = p.status || 'Active'; p.roles = p.roles || []; p.extra = p.extra || []; const pr = R.validatePerson(M(), p); if (pr.length) throw httpErr(422, 'validation', pr.join('; ')); R.history(p, 'Added to the matrix', u.name); M().people.push(p); store.save(); return p; });
  on('PUT', '/api/people/:id', async (q, u, p) => { need(u, 'manager'); const person = R.byId(M().people, p.id) || httpThrow(404, 'not_found', 'Person not found'); const b = await readBody(q.req); const draft = Object.assign({}, person); PERSON_FIELDS.forEach(k => { if (b[k] !== undefined) draft[k] = b[k]; }); const pr = R.validatePerson(M(), draft); if (pr.length) throw httpErr(422, 'validation', pr.join('; ')); const ch = PERSON_FIELDS.filter(k => JSON.stringify(draft[k]) !== JSON.stringify(person[k])); Object.assign(person, draft); if (ch.length) R.history(person, 'Updated: ' + ch.join(', '), u.name); store.save(); return person; });
  on('POST', '/api/people/:id/leaver', async (q, u, p) => { need(u, 'manager'); const person = R.byId(M().people, p.id) || httpThrow(404, 'not_found', 'Person not found'); const b = await readBody(q.req); R.markLeaver(M(), person, b.date, u.name); store.save(); return person; });
  on('POST', '/api/people/:id/exempt', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const person = wrap(() => R.setExemption(M(), p.id, b.cid, b.reason, u.name)); store.save(); return person; });
  on('DELETE', '/api/people/:id/exempt/:cid', async (q, u, p) => { need(u, 'manager'); const person = wrap(() => R.clearExemption(M(), p.id, p.cid, u.name)); store.save(); return person; });
  on('POST', '/api/people/:id/acknowledge', async (q, u, p) => { need(u, 'self'); if (u.role === 'self' && u.personId !== p.id) throw httpErr(403, 'forbidden', 'Not your record'); const b = await readBody(q.req); const r = wrap(() => R.acknowledgePolicy(M(), p.id, b.cid, b.answers, u.name)); store.save(); return r; });
  on('POST', '/api/records', async (q, u) => { need(u, 'self'); const b = await readBody(q.req); if (u.role === 'self') { if (b.personId !== u.personId) throw httpErr(403, 'forbidden', 'Not your record'); b.provider = (b.provider || 'Self-uploaded') + ' · to verify'; } const r = wrap(() => R.addRecord(M(), b, b.by || u.name)); store.save(); return r; });
  on('GET', '/api/records', (q, u) => stripSelf(M(), u).records);
  on('POST', '/api/sessions', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); const s = wrap(() => R.planSession(M(), b, u.name)); store.save(); return s; });
  on('POST', '/api/sessions/:id/complete', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const made = wrap(() => R.completeSession(M(), p.id, b.outcomes, u.name)); store.save(); return made; });
  on('GET', '/api/sessions', (q, u) => stripSelf(M(), u).sessions || []);
  on('GET', '/api/roles', () => M().roles);
  on('PUT', '/api/roles/:id', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); let r = R.byId(M().roles, p.id); if (r) Object.assign(r, b, { id: p.id }); else { r = Object.assign({ id: p.id, name: p.id, mandatory: [], desirable: [] }, b); M().roles.push(r); } store.save(); return r; });
  on('GET', '/api/competencies', () => M().competencies);
  on('GET', '/api/settings', () => M().settings);
  on('PUT', '/api/settings', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); M().settings = Object.assign({}, M().settings, b); store.save(); return M().settings; });

  /* tenant configuration */
  on('POST', '/api/competencies', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); const c = wrap(() => R.upsertCompetency(M(), Object.assign({}, b, { id: undefined }), u.name)); store.save(); return c; });
  on('PUT', '/api/competencies/:id', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); if (!R.byId(M().competencies, p.id)) throw httpErr(404, 'not_found', 'Competency not found'); const c = wrap(() => R.upsertCompetency(M(), Object.assign({}, b, { id: p.id }), u.name)); store.save(); return c; });
  on('DELETE', '/api/competencies/:id', async (q, u, p) => { need(u, 'manager'); const c = wrap(() => R.archiveCompetency(M(), p.id, u.name)); store.save(); return c; });
  on('POST', '/api/roles', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); const r = wrap(() => R.upsertRole(M(), Object.assign({}, b, { id: undefined }), u.name)); store.save(); return r; });
  on('DELETE', '/api/roles/:id', async (q, u, p) => { need(u, 'manager'); wrap(() => R.removeRole(M(), p.id, u.name)); store.save(); return { ok: true }; });
  on('POST', '/api/people/external', async (q, u) => { need(u, 'manager'); const b = await readBody(q.req); const p = wrap(() => R.addExternal(M(), b, u.name)); store.save(); return p; });
  on('GET', '/api/log', (q, u) => { need(u, 'manager'); return M().log || []; });
  /* sessions: update, cancel, materials, outputs, invitations */
  on('PUT', '/api/sessions/:id', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const s = wrap(() => R.updateSession(M(), p.id, b, u.name)); store.save(); return s; });
  on('POST', '/api/sessions/:id/rsvp', async (q, u, p) => { const b = await readBody(q.req); const pid = u.role === 'self' ? u.personId : b.personId; if (!pid) throw httpErr(403, 'forbidden', 'Sign in or use your invitation link'); if (u.role === 'self' && b.personId && b.personId !== u.personId) throw httpErr(403, 'forbidden', 'Not your invitation'); if (u.role === 'viewer') throw httpErr(403, 'forbidden', 'Use your invitation link'); const r = wrap(() => R.respond(M(), p.id, pid, b.status, b.note)); store.save(); return r; });
  on('GET', '/api/reminders', (q, u) => { need(u, 'manager'); return R.remindersDue(M()); });
  on('POST', '/api/sessions/:id/cancel', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const s = wrap(() => R.cancelSession(M(), p.id, b.reason, u.name)); store.save(); return s; });
  on('POST', '/api/sessions/:id/materials', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const a = wrap(() => R.addAttachment(M(), p.id, 'materials', b, u.name)); store.save(); return a; });
  on('POST', '/api/sessions/:id/outputs', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const a = wrap(() => R.addAttachment(M(), p.id, 'outputs', b, u.name)); store.save(); return a; });
  on('DELETE', '/api/sessions/:id/:kind/:aid', async (q, u, p) => { need(u, 'manager'); wrap(() => R.removeAttachment(M(), p.id, p.kind, p.aid)); store.save(); return { ok: true }; });
  on('POST', '/api/sessions/:id/invite', async (q, u, p) => { need(u, 'manager'); const b = await readBody(q.req); const s = R.byId(M().sessions, p.id) || httpThrow(404, 'not_found', 'Session not found'); const ids = (b.personIds && b.personIds.length) ? b.personIds : s.attendees; const results = [];
    for (const pid of ids) { const person = R.byId(M().people, pid); if (!person) continue; const inv = R.buildInvite(M(), s, person, { baseUrl: BASE_URL, selfBase: SELF_BASE, rsvpBase: RSVP_BASE }); const attachments = (s.materials || []).filter(a => a.shared && a.fileId && b.attachFiles).map(a => ({ name: a.name, type: a.type, path: path.join(FILES, a.fileId) })); let r; try { r = await mailer.send(Object.assign({}, inv, { attachments })); } catch (e) { r = { status: 'error', error: e.message }; } results.push({ personId: pid, to: inv.to, status: r.status, error: r.error || '', subject: inv.subject, body: inv.body }); }
    R.recordInvites(M(), s.id, results, u.name); store.save(); return { results, mode: process.env.MAIL_TRANSPORT || 'outbox', outbox: mailer.OUTBOX }; });
  /* files: JSON upload {name,type,size,data(dataURL)} → stored under FILES; served at /files/{id} */
  on('POST', '/api/files', async (q, u) => { need(u, 'self'); const b = await readBody(q.req, MAX_FILE * 1.4); const m = /^data:([^;]+);base64,(.*)$/s.exec(b.data || ''); if (!m) throw httpErr(422, 'validation', 'data must be a base64 data URL'); const buf = Buffer.from(m[2], 'base64'); if (buf.length > MAX_FILE) throw httpErr(413, 'too_large', 'File over 25 MB'); const ext = path.extname(b.name || '').replace(/[^.a-z0-9]/gi, '').slice(0, 8); const id = R.uid() + ext; fs.mkdirSync(FILES, { recursive: true }); fs.writeFileSync(path.join(FILES, id), buf); const meta = { id, name: b.name || id, type: m[1], size: buf.length, by: u.name, t: new Date().toISOString() }; fs.writeFileSync(path.join(FILES, id + '.json'), JSON.stringify(meta)); return { fileId: id, url: '/files/' + id, name: meta.name, size: meta.size, type: meta.type }; });
  on('GET', '/api/matrix.csv', (q, u, p, res) => text(res, 200, R.matrixCsv(M()), 'text/csv'));
  function httpThrow(s, c, m) { throw httpErr(s, c, m); }

  return async function handle(req, res) {
    const u = url.parse(req.url, true); const p = decodeURIComponent(u.pathname);
    try {
      if (req.method === 'GET' && p.startsWith('/files/')) { const id = path.basename(p); const f = path.join(FILES, id); if (!fs.existsSync(f) || !fs.existsSync(f + '.json')) return json(res, 404, { code: 'not_found' }); const meta = JSON.parse(fs.readFileSync(f + '.json', 'utf8')); res.writeHead(200, { 'Content-Type': meta.type || 'application/octet-stream', 'Content-Disposition': `inline; filename="${meta.name.replace(/"/g, '')}"` }); return fs.createReadStream(f).pipe(res); }
      if (req.method === 'GET' && p.startsWith('/r/')) { const [sid, pid] = p.slice(3).split('/'); res.writeHead(302, { Location: `/index.html?rsvp=${encodeURIComponent(sid)}|${encodeURIComponent(pid || '')}${u.query.a ? '&a=' + encodeURIComponent(u.query.a) : ''}` }); return res.end(); }
      if (req.method === 'GET' && p.startsWith('/t/')) { res.writeHead(302, { Location: `/index.html?me=${encodeURIComponent(p.slice(3))}` }); return res.end(); }
      if (p.startsWith('/api/')) { const user = auth(req, store); for (const r of routes) { const m = p.match(r.re); if (m && r.m === req.method) { const out = await r.h({ req, query: u.query }, user, m.groups || {}, res); if (!res.writableEnded) json(res, 200, out); return; } } return json(res, 404, { code: 'not_found', message: 'No such endpoint' }); }
      let f = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : p)); if (!f.startsWith(PUBLIC)) return json(res, 403, { code: 'forbidden' });
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return json(res, 404, { code: 'not_found' });
      let body = fs.readFileSync(f);
      if (f.endsWith('index.html')) body = body.toString().replace("window.IMS_CONFIG = window.IMS_CONFIG || {", `window.IMS_CONFIG = { adapter: 'rest', apiBase: '/api', selfBase: ${JSON.stringify(SELF_BASE)}, rsvpBase: ${JSON.stringify(RSVP_BASE)}, token: null, user: null }; window.IMS_CONFIG_UNUSED = {`);
      text(res, 200, body, MIME[path.extname(f)] || 'application/octet-stream');
    } catch (e) { json(res, e.status || 500, { code: e.code || 'error', message: e.message }); }
  };
}
if (require.main === module) { const store = new Store(DATA); store.load(); http.createServer(createApp(store)).listen(PORT, () => console.log(`iMS OS training module → http://localhost:${PORT}  (data: ${DATA})`)); }
module.exports = { createApp, Store, resolveSeed };
