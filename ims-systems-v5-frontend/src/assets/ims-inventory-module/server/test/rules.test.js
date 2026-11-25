const test = require('node:test'), assert = require('node:assert');
const R = require('../../public/js/rules.js');
const now = new Date('2026-11-19');
const mk = o => Object.assign({ id: 'x', tag: 'T-1', name: 'Thing', cat: 'Measuring & test equipment', loc: 'Site · A', cust: 'J', stage: 'In service', crit: 'High', checks: {}, hist: [], disp: null, info: 'No' }, o);

test('next due = last + interval; states over/soon/ok/none', () => {
  const a = mk({ checks: { Calibration: { last: '2025-11-01' } } });
  const [c] = R.checkRows(a, {}, now); assert.equal(c.next, '2026-11-01'); assert.equal(c.st, 'over');
  const b = mk({ checks: { Calibration: { last: '2025-12-01' } } }); assert.equal(R.checkRows(b, {}, now)[0].st, 'soon');
  const d = mk({ checks: { Calibration: { last: '2026-06-01' } } }); assert.equal(R.checkRows(d, {}, now)[0].st, 'ok');
  assert.equal(R.checkRows(mk({ pdate: '' }), {}, now)[0].st, 'none');
});
test('tenant override changes the interval', () => {
  const a = mk({ cat: 'Lifting equipment', checks: { 'Thorough examination': { last: '2026-01-01' } } });
  assert.equal(R.checkRows(a, {}, now)[0].next, '2026-07-01');
  assert.equal(R.checkRows(a, { categoryOverrides: { 'Lifting equipment': { 'Thorough examination': 12 } } }, now)[0].next, '2027-01-01');
});
test('a Fail quarantines; a later Pass returns to service and sets next due', () => {
  const a = mk();
  R.applyResult(a, { check: 'Calibration', result: 'Fail · quarantined', date: '2026-11-19' }, 'Lab', {}, now);
  assert.equal(a.stage, 'Quarantined'); assert.match(a.hist[0].what, /7\.1\.5\.2/);
  const nx = R.applyResult(a, { check: 'Calibration', result: 'Pass', date: '2026-11-19', ref: 'C-1' }, 'Lab', {}, now);
  assert.equal(a.stage, 'In service'); assert.equal(nx.next, '2027-11-19'); assert.equal(a.checks.Calibration.ref, 'C-1');
});
test('results reject unknown checks and future dates', () => {
  assert.throws(() => R.applyResult(mk(), { check: 'MOT', result: 'Pass' }, 'x', {}, now), /not a check/);
  assert.throws(() => R.applyResult(mk(), { check: 'Calibration', result: 'Pass', date: '2027-01-01' }, 'x', {}, now), /future/);
});
test('disposal needs reason, approver, route, evidence; info assets need a wipe certificate', () => {
  const a = mk({ info: 'Yes · holds data' });
  assert.throws(() => R.moveStage(a, { stage: 'Disposed' }, 'x', now), /Reason and approver/);
  assert.throws(() => R.moveStage(a, { stage: 'Disposed', reason: 'r', approvedBy: 'b', route: 'Resale', evidence: 'invoice 1' }, 'x', now), /data-wipe/);
  R.moveStage(a, { stage: 'Disposed', reason: 'r', approvedBy: 'b', route: 'WEEE recycling (licensed carrier)', evidence: 'Wipe cert W-9' }, 'x', now);
  assert.equal(a.stage, 'Disposed'); assert.equal(a.disp.route, 'WEEE recycling (licensed carrier)');
});
test('fault report moves to Under maintenance and logs', () => { const a = mk(); R.reportFault(a, 'leak', 'T', now); assert.equal(a.stage, 'Under maintenance'); assert.match(a.hist[0].what, /leak/); assert.throws(() => R.reportFault(a, '  ', 'T'), /Describe/); });
test('issues and okToUse', () => {
  const a = mk({ checks: { Calibration: { last: '2025-01-01' } } });
  assert.ok(R.issues(a, {}, now).some(i => i.k === 'over')); assert.equal(R.okToUse(a, {}, now), false);
  const b = mk({ checks: { Calibration: { last: '2026-06-01' } } }); assert.equal(R.okToUse(b, {}, now), true);
  assert.equal(R.okToUse(mk({ stage: 'Retired' }), {}, now), false);
});
test('stock movements and states', () => {
  const s = { qty: 5, min: 4, max: 10, exp: null, moves: [] };
  const r = R.applyStockMove(s, { type: 'issue', qty: 2, ref: 'job 1' }, 'M', now); assert.equal(s.qty, 3); assert.equal(r.state, 'low');
  R.applyStockMove(s, { type: 'receive', qty: 10, batch: 'B2', exp: '2026-11-01' }, 'M', now); assert.equal(s.qty, 13); assert.equal(R.stockState(s, now), 'expired');
  assert.throws(() => R.applyStockMove(s, { type: 'teleport', qty: 1 }, 'M', now), /Unknown/);
});
test('validateAsset catches the basics', () => {
  assert.deepEqual(R.validateAsset(mk()), []);
  assert.ok(R.validateAsset(mk({ tag: '' })).some(p => /tag/.test(p)));
  assert.ok(R.validateAsset(mk({ cust: '' })).some(p => /custodian/.test(p)));
  assert.ok(R.validateAsset(mk({ cat: 'Spaceships' })).some(p => /category/.test(p)));
});
test('readiness reflects the register', () => {
  const good = { settings: {}, assets: [mk({ checks: { Calibration: { last: '2026-06-01' } }, hist: [{ t: '2026-01-01T09:00', by: 'x', what: 'Commissioned' }] })], stock: [] };
  assert.ok(R.readiness(good, now).every(r => r.ok));
  const bad = { settings: {}, assets: [mk({ checks: { Calibration: { last: '2025-01-01' } } })], stock: [] };
  const rd = R.readiness(bad, now); assert.equal(rd.find(r => r.id === 'cal').ok, false); assert.equal(rd.find(r => r.id === 'cal-q').ok, false);
});
test('CSV exports escape quotes', () => { const m = { settings: {}, assets: [mk({ name: 'Say "hi"' })], stock: [] }; assert.match(R.registerCsv(m, 'https://x/', now), /"Say ""hi"""/); });
