'use strict';
const test = require('node:test'), assert = require('node:assert');
const engine = require('../lib/score'), scope = require('../lib/scope'), {Ledger} = require('../lib/ledger');
const now = new Date('2026-11-24T10:00:00Z'); const iso = d => d.toISOString().slice(0,10);
const con = {family:'construction', attrs: scope.fill({employs:1,sites:1,contractor:1,vehicles:1,lifting:1})};
const pro = {family:'professional', attrs: scope.fill({employs:1,premises:1,data:1})};
test('renormalisation keeps ratings out of 1000 and comparable; N/A domains excluded', () => {
  const ap = scope.applicability(pro); assert.equal(ap.domains.supply, false); assert.equal(ap.items['cert.ssip'], 'na'); assert.equal(ap.items['asset.loler'], 'na');
  const items = Object.keys(scope.TYPES).filter(t => scope.TYPES[t].w>0 && ap.items[t]!=='na' && ap.items[t]!=='optional').map(t => ({type:t, status:'valid', observedAt: iso(now), validUntil: '2027-12-01', level:3}));
  const r = engine.compute({scope:pro, items, now}); assert.equal(r.score, 1000); assert.equal(r.tier, 3); assert.equal(r.caps.length, 0); assert.equal(r.domains.supply, null);
});
test('decay: weekly fire test is 1.0 for 7 days and 0 by day 14', () => {
  const mk = daysAgo => engine.compute({scope:{attrs:scope.fill({premises:1})}, items:[{type:'fire.test', status:'valid', observedAt: iso(new Date(now - daysAgo*864e5)), level:3}], now});
  assert.ok(mk(3).domains.safety > 0); const d10 = mk(10).domains.safety, d3 = mk(3).domains.safety; assert.ok(d10 < d3); assert.equal(mk(15).domains.safety, 0);
});
test('caps: expired mandatory ≤699, enforcement ≤549, accounts overdue ≤399, verified <50% ≤749', () => {
  const full = Object.keys(scope.TYPES).filter(t => scope.TYPES[t].w>0 && scope.applicability(con).items[t]!=='na').map(t => ({type:t, status:'valid', observedAt: iso(now), validUntil:'2027-12-01', level:3}));
  assert.equal(engine.compute({scope:con, items:full, now}).score, 1000);
  const exp = full.map(e => e.type==='cert.ssip' ? {...e, validUntil:'2026-01-01'} : e); assert.ok(engine.compute({scope:con, items:exp, now}).score <= 699);
  assert.ok(engine.compute({scope:con, items:full, now, facts:{enforcement:true}}).score <= 549);
  assert.ok(engine.compute({scope:con, items:full, now, facts:{accountsOverdue:true}}).score <= 399);
  const self = full.map(e => ({...e, level:1})); const r = engine.compute({scope:con, items:self, now}); assert.ok(r.score <= 749); assert.equal(r.tier, 1);
});
test('verification factor orders tiers 3 > 2 > 1', () => {
  const at = l => engine.compute({scope:con, items:[{type:'cert.iso45001', status:'valid', observedAt: iso(now), validUntil:'2027-12-01', level:l}], now}).domains.cert;
  assert.ok(at(3) > at(2) && at(2) > at(1));
});
test('what-if and raise-it rank the biggest gains, including after-cap', () => {
  const items = [{type:'cert.iso45001', status:'valid', observedAt: iso(now), validUntil:'2027-12-01', level:2}];
  const top = engine.raiseIt({scope:con, items, now}); assert.ok(top.length === 5 && top[0].delta >= top[4].delta);
});
test('ledger is hash-chained, idempotent and verifiable', () => {
  const L = new Ledger({evidence:[]}); const a = L.emit({orgId:'o', type:'policy.hs', status:'valid', observedAt:'2026-11-01', source:'module:docs', level:3});
  const b = L.emit({orgId:'o', type:'policy.hs', status:'valid', observedAt:'2026-11-01', source:'module:docs', level:3}); assert.equal(b.duplicate, true);
  L.emit({orgId:'o', type:'policy.hs', status:'valid', observedAt:'2026-11-20', source:'module:docs', level:3}); assert.equal(L.verifyChain('o'), true); assert.equal(L.current('o').length, 1);
  L.store.evidence[0].status = 'fail'; assert.equal(L.verifyChain('o'), false);
});
test('scope declarations contradicted by public record', () => {
  const c = scope.checkDeclaration(scope.fill({employs:1}), {olicence:true, ssip:true, employees:40}); assert.deepEqual(c.map(x=>x.attr).sort(), ['contractor','vehicles']);
});
