/*  iMS OS · Inventory & Asset module · reference backend
 *  -----------------------------------------------------
 *  Node 18+ · no dependencies. Implements openapi.yaml against a JSON file store so the
 *  module runs end to end today. In iMS OS, replace `Store` with the platform's database
 *  layer and `auth()` with the platform's session/JWT check; keep the route handlers,
 *  they only call rules.js.
 *
 *    node server/server.js            → http://localhost:3000  (UI at /, API at /api, scan at /a/{tag})
 *    PORT=4000 DATA=./my.json node server/server.js
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const R = require('../public/js/rules.js');

const PORT = Number(process.env.PORT) || 3000;
const DATA = process.env.DATA || path.join(__dirname, 'data', 'store.json');
const PUBLIC = path.join(__dirname, '..', 'public');
const SCAN_BASE = process.env.SCAN_BASE || `http://localhost:${PORT}/a/`;

/* ---------- store (swap for a database) ---------- */
class Store {
  constructor(file) { this.file = file; this.model = null; this.version = 0; }
  load() {
    if (fs.existsSync(this.file)) { this.model = JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    else { this.model = resolveSeed(JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', 'seed.json'), 'utf8'))); this.save(); }
    return this.model;
  }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(this.model, null, 1)); fs.renameSync(tmp, this.file); this.version++; }
  asset(id) { return this.model.assets.find(a => a.id === id); }
  assetByTag(tag) { return this.model.assets.find(a => a.tag === tag); }
  stock(id) { return this.model.stock.find(s => s.id === id); }
}
function resolveSeed(seed) { // "@-200d" → real dates
  const base = R.today(); const fix = v => { const m = typeof v === 'string' && v.match(/^@(-?\d+)d(.*)$/); return m ? R.iso(R.addDays(base, Number(m[1]))) + m[2] : v; };
  const walk = o => Array.isArray(o) ? o.map(walk) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : fix(o);
  return walk(seed);
}

/* ---------- auth (swap for the platform's) ----------
   Roles: viewer (read), staff (scan actions, stock), competent (results), manager (everything).
   Public scan route works without a token: read-only + staff-level actions attributed to the name given. */
function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const USERS = { 'demo-manager': { name: 'S. Ahmed', role: 'manager' }, 'demo-staff': { name: 'T. Begum', role: 'staff' }, 'demo-competent': { name: 'Kestrel · competent person', role: 'competent' } };
  if (token && USERS[token]) return USERS[token];
  const name = (req.headers['x-scan-name'] || '').toString().slice(0, 60).trim();
  return { name: name || 'Scanner', role: name ? 'staff' : 'viewer', anonymous: true };
}
const RANK = { viewer: 0, staff: 1, competent: 2, manager: 3 };
function require_(user, role) { if (RANK[user.role] < RANK[role]) throw httpErr(403, 'forbidden', `Needs role ${role}`); }
function httpErr(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }

/* ---------- helpers ---------- */
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const text = (res, status, body, type) => { res.writeHead(status, { 'Content-Type': type }); res.end(body); };
function readBody(req) { return new Promise((resolve, reject) => { let d = ''; req.on('data', c => { d += c; if (d.length > 2e6) reject(httpErr(413, 'too_large', 'Body too large')); }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(httpErr(400, 'bad_json', 'Invalid JSON')); } }); }); }
const ASSET_FIELDS = ['tag', 'name', 'cat', 'loc', 'cust', 'stage', 'crit', 'model', 'serial', 'pdate', 'cost', 'sup', 'warr', 'info', 'notes', 'labelled'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ---------- routes ---------- */
function createApp(store) {
  const routes = [];
  const on = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

  on('GET', '/api/model', (req, user) => ({ ...store.model, user: { name: user.name, role: user.role }, version: store.version, scanBase: SCAN_BASE }));
  on('GET', '/api/assets', () => store.model.assets);
  on('GET', '/api/assets/register.csv', (req, user, p, res) => text(res, 200, R.registerCsv(store.model, SCAN_BASE), 'text/csv'));
  on('GET', '/api/assets/schedule.csv', (req, user, p, res) => text(res, 200, R.scheduleCsv(store.model), 'text/csv'));
  on('GET', '/api/assets/:id', (req, user, p) => store.asset(p.id) || store.assetByTag(p.id) || httpThrow(404, 'not_found', 'Asset not found'));
  on('POST', '/api/assets', async (req, user) => { require_(user, 'manager'); const b = await readBody(req); const a = { id: R.uid(), checks: {}, hist: [], disp: null, labelled: false }; ASSET_FIELDS.forEach(k => { if (b[k] != null) a[k] = b[k]; }); a.stage = a.stage || 'Requested'; a.crit = a.crit || 'Standard'; a.info = a.info || 'No';
    const problems = R.validateAsset(a); if (store.assetByTag(a.tag)) problems.push('tag: already used'); if (problems.length) throw httpErr(422, 'validation', problems.join('; '));
    R.history(a, 'Created (' + a.stage + ')', user.name); store.model.assets.unshift(a); store.save(); return a; });
  on('PUT', '/api/assets/:id', async (req, user, p) => { require_(user, 'manager'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); const b = await readBody(req);
    const draft = { ...a }; ASSET_FIELDS.forEach(k => { if (b[k] !== undefined) draft[k] = b[k]; });
    const problems = R.validateAsset(draft); if (store.model.assets.some(x => x.id !== a.id && x.tag === draft.tag)) problems.push('tag: already used'); if (problems.length) throw httpErr(422, 'validation', problems.join('; '));
    const changed = ASSET_FIELDS.filter(k => String(draft[k] ?? '') !== String(a[k] ?? ''));
    if (b.checks) draft.checks = b.checks; if (b.hist && b.hist.length >= (a.hist || []).length) draft.hist = b.hist; if (b.disp !== undefined) draft.disp = b.disp;
    Object.assign(a, draft); if (changed.length && !(b.hist && b.hist.length > (a.hist || []).length)) R.history(a, 'Updated: ' + changed.join(', '), user.name);
    store.save(); return a; });
  on('POST', '/api/assets/:id/results', async (req, user, p) => { require_(user, 'competent'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); const b = await readBody(req);
    const next = wrap(() => R.applyResult(a, b, b.by || user.name, store.model.settings)); store.save(); return { asset: a, nextDue: next }; });
  on('POST', '/api/assets/:id/stage', async (req, user, p) => { require_(user, 'manager'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); const b = await readBody(req); wrap(() => R.moveStage(a, b, user.name)); store.save(); return a; });
  on('POST', '/api/assets/:id/fault', async (req, user, p) => { require_(user, 'staff'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); const b = await readBody(req); wrap(() => R.reportFault(a, b.description, user.name)); store.save(); return a; });
  on('POST', '/api/assets/:id/move', async (req, user, p) => { require_(user, 'staff'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); const b = await readBody(req); wrap(() => R.moveLocation(a, b.loc, user.name)); store.save(); return a; });
  on('POST', '/api/assets/:id/each-use', async (req, user, p) => { require_(user, 'staff'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); R.recordEachUse(a, user.name, store.model.settings); store.save(); return a; });
  on('POST', '/api/assets/:id/sighting', async (req, user, p) => { require_(user, 'staff'); const a = store.asset(p.id) || httpThrow(404, 'not_found', 'Asset not found'); R.history(a, `Seen at ${a.loc} · location confirmed by scan`, user.name); store.save(); return a; });
  on('GET', '/api/readiness', () => R.readiness(store.model));
  on('GET', '/api/stock', () => store.model.stock);
  on('POST', '/api/stock', async (req, user) => { require_(user, 'manager'); const b = await readBody(req); if (!b.item) throw httpErr(422, 'validation', 'item is required'); const s = { id: R.uid(), code: b.code || 'C-' + String(store.model.stock.length + 1).padStart(3, '0'), item: b.item, loc: b.loc || '', qty: Number(b.qty) || 0, min: Number(b.min) || 0, max: Number(b.max) || 0, batch: b.batch || '', exp: b.exp || null, moves: [] }; store.model.stock.push(s); store.save(); return s; });
  on('PUT', '/api/stock/:id', async (req, user, p) => { require_(user, 'staff'); const s = store.stock(p.id) || httpThrow(404, 'not_found', 'Stock item not found'); const b = await readBody(req); ['code', 'item', 'loc', 'min', 'max', 'batch', 'exp', 'qty', 'moves'].forEach(k => { if (b[k] !== undefined) s[k] = b[k]; }); store.save(); return s; });
  on('POST', '/api/stock/:id/move', async (req, user, p) => { require_(user, 'staff'); const s = store.stock(p.id) || httpThrow(404, 'not_found', 'Stock item not found'); const b = await readBody(req); const r = wrap(() => R.applyStockMove(s, b, user.name)); store.save(); return { item: s, ...r }; });
  on('GET', '/api/settings', () => store.model.settings);
  on('PUT', '/api/settings', async (req, user) => { require_(user, 'manager'); const b = await readBody(req); store.model.settings = { ...store.model.settings, ...b }; store.save(); return store.model.settings; });
  on('GET', '/api/categories', () => Object.fromEntries(Object.keys(R.CATS).map(c => [c, { std: R.CATS[c].std, checks: R.categoryChecks(c, store.model.settings) }])));

  function httpThrow(s, c, m) { throw httpErr(s, c, m); }
  function wrap(fn) { try { return fn(); } catch (e) { if (e.code && !e.status) { e.status = 422; } throw e; } }

  return async function handle(req, res) {
    const u = url.parse(req.url, true); const p = decodeURIComponent(u.pathname);
    try {
      /* public scan route: serves the module in scan mode */
      if (req.method === 'GET' && p.startsWith('/a/')) { const tag = p.slice(3); res.writeHead(302, { Location: `/index.html?asset=${encodeURIComponent(tag)}` }); return res.end(); }
      if (p.startsWith('/api/')) {
        const user = auth(req);
        for (const r of routes) { const m = p.match(r.re); if (m && r.method === req.method) { const out = await r.handler(req, user, m.groups || {}, res); if (!res.writableEnded) json(res, 200, out); return; } }
        return json(res, 404, { code: 'not_found', message: 'No such endpoint' });
      }
      /* static */
      let f = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : p)); if (!f.startsWith(PUBLIC)) return json(res, 403, { code: 'forbidden' });
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return json(res, 404, { code: 'not_found' });
      let body = fs.readFileSync(f);
      if (f.endsWith('index.html')) body = body.toString().replace("window.IMS_CONFIG = window.IMS_CONFIG || {", `window.IMS_CONFIG = { adapter: 'rest', apiBase: '/api', scanBase: ${JSON.stringify(SCAN_BASE)}, token: null, user: null }; window.IMS_CONFIG_UNUSED = {`);
      text(res, 200, body, MIME[path.extname(f)] || 'application/octet-stream');
    } catch (e) {
      json(res, e.status || 500, { code: e.code || 'error', message: e.message });
    }
  };
}

if (require.main === module) {
  const store = new Store(DATA); store.load();
  http.createServer(createApp(store)).listen(PORT, () => console.log(`iMS OS inventory module → http://localhost:${PORT}  (data: ${DATA})`));
}
module.exports = { createApp, Store, resolveSeed };
