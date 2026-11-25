const test = require('node:test'), assert = require('node:assert'), http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { createApp, Store } = require('../server.js');

let server, base;
test.before(async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ims-')), 'store.json');
  const store = new Store(file); store.load();
  server = http.createServer(createApp(store)); await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
});
test.after(() => server.close());
const call = async (method, p, body, headers) => { const r = await fetch(base + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: body ? JSON.stringify(body) : undefined, redirect: 'manual' }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = t; } return { status: r.status, body: j, headers: r.headers }; };
const M = { Authorization: 'Bearer demo-manager' }, C = { Authorization: 'Bearer demo-competent' };

test('GET /api/model returns the register with user and scan base', async () => { const r = await call('GET', '/api/model'); assert.equal(r.status, 200); assert.ok(r.body.assets.length > 10); assert.equal(r.body.user.role, 'viewer'); assert.ok(r.body.scanBase); });
test('scan route redirects to the module in scan mode', async () => { const r = await call('GET', '/a/NE-0401'); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), '/index.html?asset=NE-0401'); });
test('anonymous scanner can report a fault with a name, not without a role for results', async () => {
  const m = await call('GET', '/api/model'); const a = m.body.assets.find(x => x.tag === 'NE-0101');
  let r = await call('POST', `/api/assets/${a.id}/fault`, { description: 'Hook latch bent' }); assert.equal(r.status, 403);
  r = await call('POST', `/api/assets/${a.id}/fault`, { description: 'Hook latch bent' }, { 'X-Scan-Name': 'Dave Brooks' }); assert.equal(r.status, 200); assert.equal(r.body.stage, 'Under maintenance'); assert.equal(r.body.hist[0].by, 'Dave Brooks');
  r = await call('POST', `/api/assets/${a.id}/results`, { check: 'Thorough examination', result: 'Pass' }, { 'X-Scan-Name': 'Dave Brooks' }); assert.equal(r.status, 403);
});
test('competent person records a result; validation errors are 422', async () => {
  const m = await call('GET', '/api/model'); const a = m.body.assets.find(x => x.tag === 'NE-0303');
  let r = await call('POST', `/api/assets/${a.id}/results`, { check: 'MOT', result: 'Pass' }, C); assert.equal(r.status, 422); assert.equal(r.body.code, 'invalid_check');
  r = await call('POST', `/api/assets/${a.id}/results`, { check: 'Calibration', result: 'Pass', ref: 'CC-1' }, C); assert.equal(r.status, 200); assert.equal(r.body.asset.stage, 'In service'); assert.ok(r.body.nextDue.next);
});
test('manager creates, updates, and disposes with evidence', async () => {
  let r = await call('POST', '/api/assets', { tag: 'NE-2001', name: 'Bench grinder', cat: 'Production machinery', loc: 'Site · Bay 4', cust: 'M. Grant', stage: 'In service', crit: 'Standard' }); assert.equal(r.status, 403);
  r = await call('POST', '/api/assets', { tag: 'NE-2001', name: 'Bench grinder', cat: 'Production machinery', loc: 'Site · Bay 4', cust: 'M. Grant', stage: 'In service', crit: 'Standard' }, M); assert.equal(r.status, 200); const id = r.body.id;
  r = await call('POST', '/api/assets', { tag: 'NE-2001', name: 'Dup', cat: 'Production machinery', loc: 'x', cust: 'y', stage: 'Requested', crit: 'Standard' }, M); assert.equal(r.status, 422);
  r = await call('PUT', `/api/assets/${id}`, { loc: 'Site · Bay 5' }, M); assert.equal(r.status, 200); assert.equal(r.body.loc, 'Site · Bay 5'); assert.match(r.body.hist[0].what, /Updated: loc/);
  r = await call('POST', `/api/assets/${id}/stage`, { stage: 'Disposed', reason: 'worn', approvedBy: 'S. Ahmed', route: 'Scrap metal (licensed)' }, M); assert.equal(r.status, 422); assert.equal(r.body.code, 'evidence_required');
  r = await call('POST', `/api/assets/${id}/stage`, { stage: 'Disposed', reason: 'worn', approvedBy: 'S. Ahmed', route: 'Scrap metal (licensed)', evidence: 'WTN-0091' }, M); assert.equal(r.status, 200); assert.equal(r.body.stage, 'Disposed');
});
test('stock movement and readiness', async () => {
  const m = await call('GET', '/api/stock'); const s = m.body.find(x => x.code === 'C-003');
  const r = await call('POST', `/api/stock/${s.id}/move`, { type: 'issue', qty: 20, ref: 'job 9' }, { 'X-Scan-Name': 'T. Begum' }); assert.equal(r.status, 200); assert.equal(r.body.item.qty, 2); assert.equal(r.body.state, 'low');
  const rd = await call('GET', '/api/readiness'); assert.equal(rd.status, 200); assert.equal(rd.body.length, 10);
});
test('CSV exports and static files are served; path traversal is refused', async () => {
  let r = await call('GET', '/api/assets/register.csv'); assert.equal(r.status, 200); assert.match(r.body, /^"Tag"/);
  r = await call('GET', '/index.html'); assert.equal(r.status, 200); assert.match(r.body, /adapter: 'rest'/);
  r = await call('GET', '/../server/server.js'); assert.notEqual(r.status, 200);
});
