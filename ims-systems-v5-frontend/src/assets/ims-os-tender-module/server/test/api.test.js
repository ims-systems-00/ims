const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('fs'); const path = require('path'); const os = require('os');
process.env.DATA = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tender-')), 'store.json'); process.env.PORT = '0';
const { server } = require('../server.js'); const Z = require('../../public/js/zip.js');
let base; const ADM = { Authorization: 'Bearer demo-admin' }, APR = { Authorization: 'Bearer demo-approver' }, CON = { Authorization: 'Bearer demo-contributor' };
const call = async (m, p, b, h, raw) => { const r = await fetch(base + p, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: b ? JSON.stringify(b) : undefined }); if (raw) return r; const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { } return { status: r.status, body: j, headers: r.headers }; };
test.before(async () => { await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; });
test.after(() => server.close());
test('model + roles', async () => { let r = await call('GET', '/api/model'); assert.equal(r.status, 200); assert.equal(r.body.user.role, 'viewer'); assert.ok(r.body.library.answers.length); r = await call('PUT', '/api/settings', { reviewMonths: 6 }); assert.equal(r.status, 403); r = await call('PUT', '/api/settings', { reviewMonths: 6 }, ADM); assert.equal(r.status, 200); });
test('parse xlsx → import → drafted → edit → accept → approve → export xlsx/docx', async () => {
  const x = Z.writeXlsx([['Ref', 'Question', 'Word limit', 'Response'], ['1', 'Do you hold ISO 14001 certification? Give details.', 100, ''], ['2', 'What insurance cover do you hold?', 80, ''], ['3', 'Describe your drone survey capability.', 100, '']]);
  let r = await call('POST', '/api/parse', { name: 'pqq.xlsx', data: Buffer.from(x).toString('base64') }, CON); assert.equal(r.status, 200); assert.equal(r.body.parsed.questions.length, 3); assert.equal(r.body.source, 'xlsx');
  r = await call('POST', '/api/questionnaires', { meta: { buyer: 'Acme', title: 'PQQ', source: 'xlsx', fileName: 'pqq.xlsx' }, parsed: r.body.parsed }, CON); assert.equal(r.status, 201); const Q = r.body; assert.equal(Q.questions[0].status, 'draft'); assert.match(Q.questions[0].answer, /ISO 14001/); assert.equal(Q.questions[2].status, 'needs-input');
  r = await call('PUT', `/api/questionnaires/${Q.id}/questions/q3`, { answer: 'We operate two CAA-licensed drone pilots for roof and structure surveys.' }, CON); assert.equal(r.status, 200); assert.equal(r.body.status, 'edited');
  for (const id of ['q1', 'q2', 'q3']) { r = await call('POST', `/api/questionnaires/${Q.id}/questions/${id}/accept`, null, CON); assert.equal(r.status, 200); }
  r = await call('POST', `/api/questionnaires/${Q.id}/approve`, { questionIds: null }, CON); assert.equal(r.status, 403);
  r = await call('POST', `/api/questionnaires/${Q.id}/approve`, { questionIds: null }, APR); assert.equal(r.status, 200); assert.equal(r.body.approved, 3); assert.equal(r.body.status, 'ready');
  const ex = await call('GET', `/api/questionnaires/${Q.id}/export?format=xlsx`, null, CON, true); assert.equal(ex.status, 200); assert.match(ex.headers.get('content-disposition'), /Acme - PQQ\.xlsx/); const sheets = await Z.readXlsx(new Uint8Array(await ex.arrayBuffer())); assert.equal(sheets[0].rows.length, 4); assert.match(sheets[0].rows[3][4], /drone/);
  const dx = await call('GET', `/api/questionnaires/${Q.id}/export?format=docx`, null, CON, true); const paras = await Z.readDocx(new Uint8Array(await dx.arrayBuffer())); assert.ok(paras.some(p => /drone/.test(p.text)));
  r = await call('GET', '/api/model', null, CON); assert.ok(r.body.library.answers.some(a => /drone/.test(a.answer)), 'learned'); assert.ok(r.body.log.some(l => /Exported Acme/.test(l.what)));
});
test('portal import via text, single-question draft endpoint for the add-in, files', async () => {
  let r = await call('POST', '/api/questionnaires', { meta: { buyer: 'Portal Co', source: 'portal' }, text: 'A1. Do you have an anti-bribery policy? Yes/No\nA2. Describe your business continuity arrangements. (max 150 words)' }, CON); assert.equal(r.status, 201); assert.equal(r.body.questions.length, 2); assert.equal(r.body.questions[0].type, 'yesno');
  r = await call('POST', '/api/draft', { question: 'Please confirm your compliance with the Modern Slavery Act 2015.' }, CON); assert.equal(r.status, 200); assert.ok(r.body.answer); assert.equal(typeof r.body.autofill, 'boolean');
  r = await call('POST', '/api/draft', { question: 'x' }); assert.equal(r.status, 403);
  r = await call('POST', '/api/files', { name: 'cert.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4 test').toString('base64') }, CON); assert.equal(r.status, 201); const f = await call('GET', r.body.url, null, null, true); assert.equal(f.status, 200); assert.equal(f.headers.get('content-type'), 'application/pdf');
  r = await call('POST', '/api/questionnaires', { meta: {}, text: 'nothing here' }, CON); assert.equal(r.status, 422);
});
test('tender pack: create bid, add ITT docx + pricing xlsx, assess, price, approve, submit by email (outbox)', async () => {
  const itt = Z.writeDocx([{ h1: 'ITT' }, { p: 'Tenders must be submitted by 18 December 2026. Quality (70%) and Price (30%).' }, { p: '3.1 The tenderer must hold ISO 45001 certification.' }, { p: '3.2 The tenderer shall provide a named contract manager.' }, { p: 'Q1. Do you have an anti-bribery policy? Yes/No' }]);
  const px = Z.writeXlsx([['Item', 'Description', 'Unit', 'Qty', 'Rate'], [1, 'LOLER thorough examination — overhead crane', 'each', 10, ''], [2, 'Bespoke item', 'each', 2, '']]);
  let r = await call('POST', '/api/questionnaires', { meta: { buyer: 'YW', title: 'ITT', kind: 'tender', allowEmpty: true, submissionEmail: 'tenders@yw.example', reference: 'YW-1' }, parsed: { questions: [] }, draft: false }, CON); assert.equal(r.status, 201); const Q = r.body; assert.equal(Q.kind, 'tender');
  r = await call('POST', `/api/questionnaires/${Q.id}/documents`, { name: 'ITT.docx', data: Buffer.from(itt).toString('base64') }, CON); assert.equal(r.status, 201, JSON.stringify(r.body).slice(0, 300)); if (!r.body.requirements) console.log('BODY', JSON.stringify(r.body).slice(0, 400)); assert.equal(r.body.requirements.length, 2); assert.equal(r.body.questions.length, 1); assert.equal(r.body.criteria[0].weight, 70);
  r = await call('POST', `/api/questionnaires/${Q.id}/documents`, { name: 'Pricing.xlsx', data: Buffer.from(px).toString('base64') }, CON); assert.equal(r.status, 201); assert.equal(r.body.kind, 'pricing');
  r = await call('GET', `/api/questionnaires/${Q.id}`, null, CON); const B = r.body; assert.equal(B.due, '2026-12-18'); assert.equal(B.pricing.lines.length, 2); assert.equal(B.pricing.lines[0].rate, 185); assert.equal(B.pricing.lines[1].rate, null); assert.equal(B.questions[0].status, 'draft');
  r = await call('GET', `/api/questionnaires/${Q.id}/gate`, null, CON); assert.equal(r.status, 200); assert.equal(r.body.submit.ok, false);
  for (const req of B.requirements) { r = await call('PUT', `/api/questionnaires/${Q.id}/requirements/${req.id}`, { status: 'comply', note: 'ok' }, CON); assert.equal(r.status, 200); }
  r = await call('PUT', `/api/questionnaires/${Q.id}/pricing`, { lines: B.pricing.lines.map(l => Object.assign({}, l, { rate: l.rate == null ? 500 : l.rate })), marginPct: 10 }, CON); assert.equal(r.status, 200);
  r = await call('POST', `/api/questionnaires/${Q.id}/submit`, {}, APR); assert.equal(r.status, 422, 'blocked until approved: ' + JSON.stringify(r.body));
  r = await call('POST', `/api/questionnaires/${Q.id}/questions/q1/accept`, null, CON); r = await call('POST', `/api/questionnaires/${Q.id}/approve`, { questionIds: null }, APR); assert.equal(r.body.approved, 1);
  const bid = await call('GET', `/api/questionnaires/${Q.id}/bid?what=bid`, null, CON, true); assert.equal(bid.status, 200); const paras = await Z.readDocx(new Uint8Array(await bid.arrayBuffer())); assert.ok(paras.some(p => /Compliance statement/.test(p.text))); assert.ok(paras.some(p => /Pricing summary/.test(p.text)));
  r = await call('POST', `/api/questionnaires/${Q.id}/submit`, {}, CON); assert.equal(r.status, 403);
  r = await call('POST', `/api/questionnaires/${Q.id}/submit`, {}, APR); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.to, 'tenders@yw.example'); assert.equal(r.body.mode, 'outbox'); assert.ok(r.body.attachments.length >= 3);
  const outbox = path.join(path.dirname(process.env.DATA), 'outbox'); const eml = fs.readFileSync(path.join(outbox, fs.readdirSync(outbox)[0]), 'utf8'); assert.match(eml, /To: tenders@yw.example/); assert.match(eml, /Tender response.docx/); assert.match(eml, /Pricing schedule.xlsx/);
  r = await call('GET', `/api/questionnaires/${Q.id}`, null, CON); assert.equal(r.body.status, 'submitted'); assert.equal(r.body.submittedVia, 'email');
});
test('ALICE provider: system prompt, figure verification and contract', async () => {
  const AI = require('../ai.js'); const R = require('../../public/js/rules.js');
  const ctx = [{ label: 'ISO 9001:2015 certificate', text: 'BSI GB-Q-21884 valid 2024-03-15 to 2027-03-14' }];
  assert.deepEqual(AI.verifyFigures('Certificate GB-Q-21884 valid to 2027-03-14 across 186 staff.', ctx, { employees: '186' }), []);
  assert.deepEqual(AI.verifyFigures('We have 12,500 employees since 1987 under certificate ZZ-1.', ctx, {}), ['12,500', '1987', 'ZZ-1']);
  const sys = AI.SYSTEM({ org: 'Acme', settings: { tone: 'Plain.' } }, { kind: 'chars', n: 100, spaces: 'excl' }); assert.match(sys, /Acme/); assert.match(sys, /excluding spaces/); assert.match(sys, /Never invent/);
  assert.equal(AI.mode(), 'deterministic');
});
