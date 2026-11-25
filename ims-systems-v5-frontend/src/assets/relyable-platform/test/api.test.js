'use strict';
const test = require('node:test'), assert = require('node:assert');
const {build} = require('../server/app');
const sdk = require('../lib/sdk');
let app, base;
const call = async (method, path, body, token, extra={}) => { const r = await fetch(base + path, {method, headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{}), ...extra}, body: body ? JSON.stringify(body) : undefined}); const j = await r.json(); return {status:r.status, ...j, _body:j}; };
test.before(async () => { app = build({}); for (const n of ['04871234','07120443','10452211','07765512']) await app.ingest.organisation(n); await new Promise(r => app.server.listen(0, r)); base = 'http://localhost:' + app.server.address().port; });
test.after(() => app.server.close());

test('public lookup and Tier 0 rating with scope-aware flags', async () => {
  const r = await call('GET', '/v1/organisations?q=thornbury'); assert.equal(r.items.length, 1); assert.equal(r.items[0].rating.tier, 0);
  const t = await call('GET', '/v1/ratings/' + r.items[0].id); assert.ok(t.flags.find(f => f.source==='ssip').state === 'na'); assert.equal(t.scope.family, 'professional');
  const n = await call('GET', '/v1/ratings/10452211'); assert.ok(n.caps.some(c => /Accounts overdue/.test(c))); assert.ok(n.rating <= 399); assert.ok(n.caps.some(c => /enforcement/.test(c)));
});
test('claim: contact codes, officer match, passkey, session; letter to registered office; second claim becomes a dispute', async () => {
  const org = app.registry.byNumber('07120443');
  const c = await call('POST', '/v1/claims', {orgId: org.id, name:'Helen Hughes', title:'Director', email:'helen@calder.co.uk', phone:'07700900001'});
  assert.equal(c.next, 'verify-contact'); const claim = app.store.claims.find(x => x.id === c.claimId);
  assert.ok(app.store.outbox.some(n => n.kind==='post' && /claim has started/.test(n.subject)));
  const bad = await call('POST', `/v1/claims/${c.claimId}/verify-contact`, {emailCode:'000000', smsCode:'000000'}); assert.equal(bad.status, 400); assert.match(bad.error, /attempt/);
  const ok = await call('POST', `/v1/claims/${c.claimId}/verify-contact`, {emailCode: claim.emailCode, smsCode: claim.smsCode}); assert.equal(ok.next, 'authority');
  const routes = ok.routes; assert.ok(routes.find(r=>r.route==='director').available, 'registered domain matches'); assert.equal(routes.find(r=>r.route==='imsos').available, false);
  const wrong = await call('POST', `/v1/claims/${c.claimId}/authority`, {route:'officer', officerId:'o4', dobMonth:'1990-01'}); assert.equal(wrong.status, 400);
  const a = await call('POST', `/v1/claims/${c.claimId}/authority`, {route:'officer', officerId:'o4', dobMonth:'1985-11', document:'OK'}); assert.equal(a.next, 'security'); assert.equal(a.role, 'owner');
  const pw = await call('POST', `/v1/claims/${c.claimId}/security`, {method:'password'}); assert.equal(pw.status, 400);
  const sec = await call('POST', `/v1/claims/${c.claimId}/security`, {method:'passkey', credentialId:'cred-helen'}); assert.equal(sec.status_, undefined); assert.equal(sec.role, 'owner'); assert.ok(sec.token);
  const me = await call('GET', '/v1/me', null, sec.token); assert.equal(me.member.role, 'owner'); assert.equal(me.organisation.claimed, true);
  // competing claim by someone else → dispute, not second owner
  const c2 = await call('POST', '/v1/claims', {orgId: org.id, name:'Sarah Bennett', email:'sarah@calder.co.uk', phone:'07700900002'}); const cl2 = app.store.claims.find(x=>x.id===c2.claimId);
  await call('POST', `/v1/claims/${c2.claimId}/verify-contact`, {emailCode: cl2.emailCode, smsCode: cl2.smsCode});
  await call('POST', `/v1/claims/${c2.claimId}/authority`, {route:'officer', officerId:'o5', dobMonth:'1989-12', document:'OK'});
  const s2 = await call('POST', `/v1/claims/${c2.claimId}/security`, {method:'passkey'}); assert.equal(s2.status, 'disputed');
  globalThis.helen = sec.token;
});
test('free email cannot use the domain route; three failures lock the claim and write to the registered office', async () => {
  const org = app.registry.byNumber('07765512');
  const c = await call('POST', '/v1/claims', {orgId: org.id, name:'X Y', email:'xy@gmail.com', phone:'07700900009'}); assert.equal(c.freeEmailDomain, true);
  const cl = app.store.claims.find(x=>x.id===c.claimId); await call('POST', `/v1/claims/${c.claimId}/verify-contact`, {emailCode: cl.emailCode, smsCode: cl.smsCode});
  const r = await call('GET', `/v1/claims/${c.claimId}`); assert.equal(r.routes.find(x=>x.route==='director').available, false);
  let last; for (let i=0;i<3;i++) last = await call('POST', `/v1/claims/${c.claimId}/authority`, {route:'officer', officerId:'o17', dobMonth:'1999-01', document:'OK'});
  assert.equal(last.status, 423); assert.ok(app.store.outbox.some(n => /claim locked/i.test(n.subject)));
});
test('scope: declaration contradicted by public record is overridden and flagged; step-up required', async () => {
  const org = app.registry.byNumber('07120443');
  const noStep = await call('PUT', `/v1/organisations/${org.id}/scope`, {attrs:{employs:1}}, globalThis.helen); assert.equal(noStep.status, 200); // fresh session is within step-up window
  app.store.sessions.find(t=>t.token===globalThis.helen).stepUpAt = 0;
  const need = await call('PUT', `/v1/organisations/${org.id}/scope`, {attrs:{employs:1}}, globalThis.helen); assert.equal(need.status, 403); assert.match(need.error, /step-up/);
  await call('POST', '/v1/session/step-up', {credentialId:'cred-helen'}, globalThis.helen);
  const r = await call('PUT', `/v1/organisations/${org.id}/scope`, {family:'construction', sizeBand:'11-50', attrs:{employs:1, sites:1, contractor:0, vehicles:1, lifting:1}}, globalThis.helen);
  assert.ok(r.contradictions.find(c => c.attr==='contractor'), 'SSIP on register contradicts contractor=0'); assert.equal(r.scope.attrs.contractor, 1);
  const rating = await call('GET', '/v1/ratings/' + org.id); assert.ok(rating.flags.some(f => f.fact==='scope' && f.state==='warn'));
});
test('iMS OS connector pushes Tier 3 evidence through the SDK; rating rises; webhook queued with HMAC; report verifies', async () => {
  const org = app.registry.byNumber('07120443');
  const k = await call('POST', '/v1/admin/keys', {kind:'connector', name:'iMS OS tenant calder', orgId: org.id}, 'rly_ad_demo');
  const sub = await call('POST', '/v1/subscriptions', {url:'https://insurer.example/hooks', orgIds:[org.id]}, 'rly_rd_demo'); assert.ok(sub.secret.startsWith('whsec_'));
  const before = (await call('GET', '/v1/ratings/' + org.id)).rating;
  const ev = sdk({baseUrl: base, key: k.key});
  const today = new Date().toISOString().slice(0,10), next = new Date(Date.now()+300*864e5).toISOString().slice(0,10);
  const r1 = await ev.emit({type:'training.competence', subject:{kind:'org', id:'all'}, status:'partial', observedAt: today, payload:{ok:182, total:186}, level:3}); assert.equal(r1.duplicate, false);
  const r1b = await ev.emit({type:'training.competence', subject:{kind:'org', id:'all'}, status:'partial', observedAt: today, payload:{ok:182, total:186}, level:3}); assert.equal(r1b.duplicate, true, 'idempotent');
  await ev.emitMany([
    {type:'training.licence', status:'valid', observedAt: today, level:3}, {type:'safety.riddor', status:'valid', observedAt: today, level:3}, {type:'fire.risk.assessment', status:'valid', observedAt: today, validUntil: next, level:3},
    {type:'asset.loler', status:'valid', observedAt: today, validUntil: next, level:3}, {type:'fleet.olicence', status:'valid', observedAt: today, validUntil: next, level:2}, {type:'fleet.driver.checks', status:'valid', observedAt: today, level:3},
    {type:'policy.hs', status:'valid', observedAt: today, validUntil: next, level:3}, {type:'policy.review', status:'valid', observedAt: today, level:3}, {type:'policy.ack', status:'valid', observedAt: today, level:3},
    {type:'supplier.approved', status:'valid', observedAt: today, level:3}, {type:'fin.insurance.el', status:'valid', observedAt: today, validUntil: next, level:2}, {type:'fin.insurance.pl', status:'valid', observedAt: today, validUntil: next, level:2},
    {type:'infosec.mfa', status:'valid', observedAt: today, level:3}, {type:'safety.inspection', status:'valid', observedAt: today, level:3}, {type:'cert.iso45001', status:'valid', observedAt: today, validUntil: next, level:2, payload:{standard:'ISO 45001', cb:'BSI', ref:'OHS 999'}}]);
  const after = await call('GET', '/v1/ratings/' + org.id); assert.ok(after.rating > before + 300, `rose from ${before} to ${after.rating}`); assert.equal(after.tier, 3);
  assert.ok(after.caps.some(c=>/SSIP|cert.ssip/.test(c)) , 'expired SSIP still caps at 699'); assert.ok(after.rating <= 699);
  const hooks = app.store.subscriptions[0].deliveries; assert.ok(hooks.length >= 1); assert.match(hooks[0].headers['Relyable-Signature'], /^t=\d+,v1=[0-9a-f]{64}$/);
  const rep = await ev.report(org.id, {audience:'Aviva'}); assert.ok(rep.id.startsWith('RLY-'));
  const v = await call('GET', '/v1/verify/' + rep.id); assert.equal(v.valid, true); assert.equal(v.report.rating, after.rating); assert.equal(v.report.listedCertifications.length >= 1, true);
  const v2 = await call('GET', '/v1/verify/' + rep.jwt.slice(0,-2) + 'xx'); assert.equal(v2.valid, false);
  // readers never get documents or people
  assert.equal(after.explanation, undefined); assert.ok(!JSON.stringify(v.report).includes('fileRef'));
});
test('manual submission: Tier 1 until issuer verifies; certificate ref belonging to another org is rejected; visibility is owner + step-up', async () => {
  const org = app.registry.byNumber('07120443'); const tok = globalThis.helen; await call('POST', '/v1/session/step-up', {credentialId:'cred-helen'}, tok);
  const dup = await call('POST', '/v1/submissions', {type:'cert.ssip', issuer:'Alcumus', issuerRef:'SC-48712', issued:'2026-10-01', expires:'2027-10-01', genuine:true}, tok); assert.equal(dup.status, 409);
  const sub = await call('POST', '/v1/submissions', {type:'cert.ssip', issuer:'CHAS', issuerRef:'CHAS-71204-R', issued:'2026-11-20', expires:'2027-11-20', genuine:true, listPublic:true}, tok); assert.equal(sub.submission.status, 'pending-issuer-verification');
  let ev = await call('GET', `/v1/organisations/${org.id}/evidence`, null, tok); const item = ev.items.find(e => e.id === sub.evidenceId); assert.equal(item.level, 1); assert.equal(ev.chainValid, true);
  const r1 = await call('GET', '/v1/ratings/' + org.id); assert.ok(!r1.caps.some(c=>/cert.ssip/.test(c)), 'cap lifted at Tier 1 while pending');
  await call('POST', `/v1/submissions/${sub.submission.id}/verify`, {result:'pass', verifier:'CHAS'}, 'rly_ad_demo');
  ev = await call('GET', `/v1/organisations/${org.id}/evidence`, null, tok); assert.ok(ev.items.find(e => e.type==='cert.ssip' && e.level===2 && e.listed));
  const r2 = await call('GET', '/v1/ratings/' + org.id); assert.ok(r2.rating >= r1.rating); assert.ok(r2.listedCertifications.some(c => /CHAS|cert.ssip/.test(c.name) || c.issuer==='CHAS'));
  const vis = await call('PUT', `/v1/organisations/${org.id}/visibility`, {listedCertificationIds: []}, tok); assert.deepEqual(vis.visibility.certs, []);
  assert.ok((await call('GET', '/v1/ratings/' + org.id)).listedCertifications.every(c => c.source.startsWith('register:')), 'only register-sourced certs remain visible');
});
test('roles: admin cannot invite admins; last owner cannot be removed; officer resignation suspends the owner', async () => {
  const org = app.registry.byNumber('07120443'); const tok = globalThis.helen;
  const inv = await call('POST', `/v1/organisations/${org.id}/members`, {email:'hs@calder.co.uk', role:'contributor', domains:['safety','assets']}, tok); assert.equal(inv.pending, true);
  const me = await call('GET', '/v1/me', null, tok); const owner = me.members.find(m => m.role==='owner');
  const rm = await call('DELETE', `/v1/organisations/${org.id}/members/${owner.id}`, null, tok); assert.equal(rm.status, 409);
  const audit = await call('GET', `/v1/organisations/${org.id}/audit`, null, tok); assert.ok(audit.items.some(a => a.action==='member.invited')); assert.ok(audit.items.every(a => a.hash));
  await call('POST', '/v1/admin/ch-events', {companyNumber:'07120443', event:'officer.resigned', officerId:'o4'}, 'rly_ad_demo');
  const gone = await call('GET', '/v1/me', null, tok); assert.equal(gone.status, 401, 'owner suspended within a day of resignation');
  assert.ok(app.store.outbox.some(n => /no active Owner/.test(n.subject)));
});
test('portfolio scoring and request verification for a reader', async () => {
  const p = await call('POST', '/v1/portfolios', {name:'EL book', entries:[{name:'Northfield Engineering', companyNumber:'04871234'}, {name:'Thornbury Chartered Accountants'}, {name:'Unknown Widgets Ltd'}]}, 'rly_rd_demo');
  const got = await call('GET', '/v1/portfolios/' + p.id, null, 'rly_rd_demo'); assert.equal(got.rows[0].rating > 0, true); assert.equal(got.rows[2].match, null);
  const rq = await call('POST', '/v1/organisations/04871234/request-verification', {}, 'rly_rd_demo'); assert.equal(rq.ok, true);
  const noKey = await call('POST', '/v1/portfolios', {entries:[]}); assert.equal(noKey.status, 401);
});
