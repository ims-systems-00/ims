'use strict';
// Relyable platform — dependency-free Node HTTP API. Routes per the API page on relyable.com.
const isNode = typeof window === 'undefined'; const http = isNode ? require('http') : null, fs = isNode ? require('fs') : null, path = isNode ? require('path') : null, crypto = require('crypto');
const modules = require('../lib/modules'); const scope = require('../lib/scope'), engine = require('../lib/score'), {Ledger} = require('../lib/ledger'), {Registry} = require('../lib/registry'), {Identity, StubIdv, err} = require('../lib/identity'), {Reports} = require('../lib/reports'), {Ingest} = require('../lib/ingest'), {CompaniesHouse} = require('../lib/connectors/companies-house'), R = require('../lib/connectors/registers'), store = require('../lib/store');

function build({dataFile, fixtures, chKey, secret} = {}) {
  const s = store.open(dataFile);
  const fx = fixtures || JSON.parse(fs.readFileSync(path.join(__dirname, '../data/fixtures.json'), 'utf8'));
  const SEED_NUMBERS = fx.companies.map(c => c.company_number);
  const registry = new Registry(s), ledger = new Ledger(s);
  const notify = n => { s.notifications.push({...n, at: new Date().toISOString()}); s.outbox.push(n); };
  const identity = new Identity(s, {registry, notify, idv: StubIdv});
  const reports = new Reports(s, {secret});
  const ch = new CompaniesHouse({key: chKey, fixtures: fx.companies});
  const registers = [R.HSE(fx.registers.hse), R.Gazette(fx.registers.gazette), R.Directors(fx.registers.directors), R.SSIP(fx.registers.ssip), R.IAF(fx.registers.iaf), R.Regulator(fx.registers.regulator)];
  const ingest = new Ingest({registry, ledger, ch, registers, engine});
  // API keys: reader (rly_rd_) read ratings/verify/subscribe/portfolio; connector (rly_cx_) push evidence for one org; admin (rly_ad_) ops.
  if (!s.keys.length) s.keys.push({id:'key_demo_reader', key:'rly_rd_demo', kind:'reader', name:'Demo insurer', rate:{perMin:600}}, {id:'key_demo_admin', key:'rly_ad_demo', kind:'admin', name:'Ops'});

  // ---- rating of an organisation, from ledger + scope + facts
  function rate(org, now = new Date()) {
    const items = ledger.current(org.id).filter(e => scope.TYPES[e.type]);
    const facts = ingest.facts(org.id, org.facts || {});
    const sc = org.scope || scope.fromSic(org.sic || []);
    const snap = engine.compute({scope: sc, items, now, facts});
    snap.flags = flags(org, items, facts, sc);
    const certs = items.filter(e => e.type.startsWith('cert.') && e.status === 'valid');
    snap.listedCertifications = certs.filter(e => (org.visibility.certs||[]).includes(e.id) || e.level === 0 && e.source.startsWith('register:')).map(e => ({name: e.payload && (e.payload.standard || e.payload.scheme || e.payload.regulator) || scope.LABEL(e.type), issuer: e.payload && (e.payload.cb || e.payload.issuer || e.payload.verifiedBy) || e.source.replace(/^register:/,''), validUntil: e.validUntil, source: e.source}));
    snap.orgId = org.id;
    return snap;
  }
  function flags(org, items, facts, sc) {
    const ap = scope.applicability(sc); const g = t => items.find(e => e.type === t); const stamp = e => e ? e.at : null;
    const chk = g('register.companies-house'), hse = g('register.hse'), gz = g('register.gazette'), dq = g('register.directors'), ssip = g('cert.ssip'), iso = items.filter(e => /^cert\.iso/.test(e.type) && e.source.startsWith('register:')), reg = g('cert.regulator');
    const out = [
      {source:'companies-house', fact:'accounts_on_time', state: chk ? (chk.status==='clear'?'ok':'bad') : 'unknown', text: chk ? (chk.status==='clear' ? 'Companies House · active, accounts filed on time' : 'Companies House · ' + (chk.payload.accountsOverdue ? 'accounts OVERDUE' : 'adverse status')) : 'Companies House · not checked', checkedAt: stamp(chk)},
      {source:'hse', fact:'enforcement', state: hse ? (hse.status==='clear'?'ok':(hse.confirmed?'bad':'warn')) : 'unknown', text: hse ? (hse.status==='clear' ? 'HSE enforcement register · no notices in 5 years' : 'HSE enforcement register · ' + hse.payload.notices.map(n=>n.type+' notice '+n.served.slice(0,4)).join(', ') + (hse.confirmed?'':' (awaiting confirmation)')) : 'HSE register · not checked', checkedAt: stamp(hse)},
      {source:'gazette', fact:'insolvency', state: gz ? (gz.status==='clear'?'ok':'bad') : 'unknown', text: gz ? (gz.status==='clear' ? 'The Gazette · no insolvency notices' : 'The Gazette · insolvency notice') : 'The Gazette · not checked', checkedAt: stamp(gz)},
      ap.items['cert.ssip'] === 'na' ? {source:'ssip', fact:'membership', state:'na', text:'SSIP register · not applicable: no contractor or client-site work in scope profile'} : {source:'ssip', fact:'membership', state: ssip && (!ssip.validUntil || ssip.validUntil >= new Date().toISOString().slice(0,10)) ? 'ok' : 'warn', text: ssip ? (ssip.validUntil < new Date().toISOString().slice(0,10) ? `SSIP register · ${ssip.payload.scheme||ssip.payload.issuer||'membership'} expired ${ssip.validUntil}` : `SSIP register · current ${ssip.payload.scheme||ssip.payload.issuer||'member'}`) : 'SSIP register · not found', checkedAt: stamp(ssip)},
      iso.length ? {source:'iaf-certsearch', fact:'certification', state:'ok', text:'Certification register · ' + iso.map(e=>e.payload.standard).join(', ') + ' on IAF CertSearch', checkedAt: stamp(iso[0])} : ap.items['cert.iso45001'] === 'optional' ? {source:'iaf-certsearch', fact:'certification', state:'na', text:'Certification register · not expected for this sector; optional, counts if present'} : {source:'iaf-certsearch', fact:'certification', state:'warn', text:'Certification register · none found'},
      {source:'companies-house', fact:'director_disqualifications', state: dq ? (dq.status==='clear'?'ok':'bad') : 'unknown', text: dq ? (dq.status==='clear' ? 'Directors · no disqualifications' : 'Directors · disqualified director (possible match shown below 0.9)') : 'Directors · not checked', checkedAt: stamp(dq)},
    ];
    if (reg) out.push({source:'regulator', fact:'registration', state: reg.status==='valid'?'ok':'bad', text: `${reg.payload.regulator} · registration ${reg.status==='valid'?'current':'NOT found'}`, checkedAt: stamp(reg)});
    if ((org.scope && org.scope.declarations || []).some(d => d.contradicted)) out.push({source:'relyable', fact:'scope', state:'warn', text:'Scope declaration contradicted by public record: ' + org.scope.declarations.filter(d=>d.contradicted).map(d=>d.reason).join('; ')});
    return out;
  }
  function snapshotAndPublish(org, reason) {
    const prev = [...s.snapshots].reverse().find(x => x.orgId === org.id); const snap = rate(org);
    s.snapshots.push({orgId: org.id, score: snap.score, band: snap.band, tier: snap.tier, caps: snap.caps.map(c=>c.reason), at: snap.computedAt, reason});
    if (prev && prev.score !== snap.score) reports.publish({type:'rating.changed', orgId: org.id, data:{from:prev.score, to:snap.score, reason}});
    if (prev && prev.band !== snap.band) reports.publish({type:'band.changed', orgId: org.id, data:{from:prev.band, to:snap.band}});
    if (prev) { for (const c of snap.caps.map(c=>c.reason)) if (!prev.caps.includes(c)) reports.publish({type:'cap.added', orgId:org.id, data:{cap:c}}); for (const c of prev.caps) if (!snap.caps.map(x=>x.reason).includes(c)) reports.publish({type:'cap.removed', orgId:org.id, data:{cap:c}}); }
    s.save(); return snap;
  }

  // ---- HTTP plumbing
  const routes = [];
  const on = (m, re, fn, opts={}) => routes.push({m, re, fn, opts});
  const json = (res, code, body) => { res.writeHead(code, {'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Step-Up', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'}); res.end(JSON.stringify(body)); };
  const keyOf = req => { const a = req.headers.authorization || ''; const t = a.replace(/^Bearer\s+/i,''); return s.keys.find(k => k.key === t) || null; };
  const rl = new Map(); const rateLimit = (id, perMin) => { const m = Math.floor(Date.now()/60000); const k = id+':'+m; const n = (rl.get(k)||0)+1; rl.set(k, n); return n <= perMin; };
  const org = id => { const o = registry.byId(id) || registry.byNumber(id); if (!o) throw err(404, 'organisation not found'); return o; };
  const needKey = (req, kinds) => { const k = keyOf(req); if (!k) throw err(401, 'API key required'); if (!kinds.includes(k.kind)) throw err(403, `requires a ${kinds.join(' or ')} key`); if (!rateLimit(k.id, k.rate && k.rate.perMin || 600)) throw err(429, 'rate limited'); return k; };
  const needSession = (req) => { const t = (req.headers.authorization||'').replace(/^Bearer\s+/i,''); const ctx = identity.auth(t); if (!ctx) throw err(401, 'sign in required'); return ctx; };

  // ---- Public: lookup, ratings, verify, standard
  on('GET', /^\/v1\/organisations$/, async (req, q) => { if (!q.q) return {items:[]}; let items = q.q === '*' ? s.organisations.slice(0,50).map(o=>({org:o, confidence:1})) : registry.search(q.q); if (!items.length && /^\d{6,8}$/.test(q.q)) { const r = await ingest.organisation(q.q); if (r) items = [{org:r.org, confidence:1}]; } return {items: items.map(x => ({...registry.publicView(x.org), confidence:x.confidence, rating: rateSummary(x.org)}))}; });
  on('GET', /^\/v1\/organisations\/([^/]+)$/, async (req, q, [id]) => registry.publicView(org(id)));
  on('GET', /^\/v1\/ratings\/([^/]+)$/, async (req, q, [id]) => { const o = org(id); const k = keyOf(req); const snap = rate(o); const pub = reports.publicBody(o, snap); if (k && k.kind === 'reader') { o.reads = o.reads||[]; o.reads.push({at:new Date().toISOString(), reader:k.name}); } return {...pub, orgId:o.id, explanation: k ? snap.explain.filter(x=>x.state!=='optional'||x.count).map(x=>({type:x.type, domain:x.domain, state:x.state, score:x.score, tier:x.level})) : undefined}; });
  on('GET', /^\/v1\/ratings\/([^/]+)\/modules$/, async (req, q, [id]) => { const o = org(id); const k = keyOf(req); const ctx = !k && (req.headers.authorization||'') ? identity.auth((req.headers.authorization||'').replace(/^Bearer\s+/i,'')) : null; if (!(k && (k.kind==='connector' && k.orgId===o.id || k.kind==='admin')) && !(ctx && ctx.member.orgId===o.id)) throw err(403, 'module contributions are for the organisation itself (connector key or session)'); const snap = rate(o); const c = modules.contributions(snap, o.scope || scope.fromSic(o.sic||[])); if (q.module) { const m = c.modules[q.module]; if (!m) throw err(404,'unknown module'); return {rating:c.rating, band:c.band, tier:c.tier, caps:c.caps, module:m, nextRisks: engine.nextRisks({scope:o.scope, items: ledger.current(o.id).filter(e=>modules.MODULES[q.module].types.includes(e.type))})}; } return c; });
  on('GET', /^\/v1\/ratings\/([^/]+)\/history$/, async (req, q, [id]) => ({items: s.snapshots.filter(x => x.orgId === org(id).id)}));
  on('GET', /^\/v1\/ratings\/([^/]+)\/what-if$/, async (req, q, [id]) => { const o = org(id); return engine.whatIf({scope:o.scope, items: ledger.current(o.id).filter(e=>scope.TYPES[e.type]), facts: ingest.facts(o.id, o.facts)}, q.add, Number(q.level||2)); });
  on('GET', /^\/v1\/ratings\/([^/]+)\/next-risks$/, async (req, q, [id]) => { const o = org(id); const a = {scope:o.scope, items: ledger.current(o.id).filter(e=>scope.TYPES[e.type]), facts: ingest.facts(o.id, o.facts)}; return {nextRisks: engine.nextRisks(a), raiseIt: engine.raiseIt(a)}; });
  on('GET', /^\/v1\/verify\/([^/]+)$/, async (req, q, [id]) => reports.verify(decodeURIComponent(id), (keyOf(req)||{}).name));
  on('GET', /^\/v1\/standard$/, async () => ({version:'1.1', model: engine.MODEL, domains: scope.DOMAINS, bands: engine.BANDS, types: Object.fromEntries(Object.entries(scope.TYPES).map(([t,d]) => [t, {domain:d.dom, weight:d.w, kind:d.kind, core:!!d.core, halfLife:d.halfLife||null}])), attributes: scope.ATTR_LABEL}));
  on('GET', /^\/v1\/standard\/applicability$/, async (req, q) => { const attrs = scope.fill(Object.fromEntries(Object.keys(scope.ATTR_LABEL).map(k => [k, q[k]==='1'||q[k]==='true']))); return {attrs, ...scope.applicability({attrs})}; });
  function rateSummary(o) { const r = rate(o); return {rating:r.score, band:r.band, tier:r.tier}; }

  // ---- Readers (API key)
  on('POST', /^\/v1\/subscriptions$/, async (req, q, _, body) => { const k = needKey(req, ['reader']); if (!body.url || !Array.isArray(body.orgIds)) throw err(400,'url and orgIds required'); const sub = reports.subscribe({keyId:k.id, orgIds: body.orgIds.map(i=>org(i).id), url: body.url, events: body.events}); s.save(); return sub; });
  on('GET', /^\/v1\/subscriptions$/, async (req) => { const k = needKey(req, ['reader']); return {items: s.subscriptions.filter(x => x.keyId === k.id)}; });
  on('POST', /^\/v1\/portfolios$/, async (req, q, _, body) => { const k = needKey(req, ['reader']); const entries = []; for (const e of body.entries||[]) { let hits = registry.resolve(e); if (!hits.length && e.companyNumber) { const r = await ingest.organisation(e.companyNumber); if (r) hits=[{org:r.org, confidence:1}]; } entries.push({input:e, match: hits[0] ? {orgId:hits[0].org.id, legalName:hits[0].org.legalName, confidence:hits[0].confidence, possible: hits[0].confidence < 0.9} : null}); } const p = reports.portfolio({keyId:k.id, name:body.name||'Portfolio', entries}); s.save(); return p; });
  on('GET', /^\/v1\/portfolios\/([^/]+)$/, async (req, q, [id]) => { const k = needKey(req, ['reader']); const p = s.portfolios.find(x => x.id===id && x.keyId===k.id); if (!p) throw err(404,'portfolio'); return {...p, rows: p.entries.map(e => e.match && !e.match.possible ? {...e, ...reports.publicBody(org(e.match.orgId), rate(org(e.match.orgId)))} : e)}; });
  on('POST', /^\/v1\/organisations\/([^/]+)\/request-verification$/, async (req, q, [id]) => { const k = needKey(req, ['reader']); const o = org(id); const n = {kind:'email', to: (o.domains||[])[0] ? 'info@'+o.domains[0] : `The Directors, ${o.legalName} (post)`, subject:`${k.name} has asked you to verify your Relyable rating`, body:`Your current rating is ${rate(o).score}. Claim free at relyable.com/claim/${o.companyNumber}`}; notify(n); o.verificationRequests = (o.verificationRequests||[]); o.verificationRequests.push({by:k.name, at:new Date().toISOString()}); s.save(); return {ok:true, sentTo:n.to}; });

  // ---- Claim (Relyable Identity)
  on('POST', /^\/v1\/claims$/, async (req, q, _, body) => { const o = org(body.orgId || body.companyNumber); const r = identity.startClaim({orgId:o.id, name:body.name, title:body.title, email:body.email, phone:body.phone, device: req.headers['x-device-id'], ip: req.socket.remoteAddress}); s.save(); return r; });
  on('POST', /^\/v1\/claims\/([^/]+)\/verify-contact$/, async (req, q, [id], body) => { const r = identity.verifyContact(id, body); s.save(); return r; });
  on('GET', /^\/v1\/claims\/([^/]+)$/, async (req, q, [id]) => { const c = identity.claim(id); return {id:c.id, status:c.status, route:c.route, role:c.role, routes: c.emailVerified ? identity.routes(c) : undefined}; });
  on('POST', /^\/v1\/claims\/([^/]+)\/authority$/, async (req, q, [id], body) => { const r = identity.authority(id, body); s.save(); return r; });
  on('POST', /^\/v1\/claims\/([^/]+)\/letter-code$/, async (req, q, [id], body) => { const r = identity.enterLetterCode(id, body.code); s.save(); return r; });
  on('POST', /^\/v1\/claims\/([^/]+)\/security$/, async (req, q, [id], body) => { const r = identity.security(id, body); s.save(); return r; });
  on('POST', /^\/v1\/claims\/([^/]+)\/block$/, async (req, q, [id], body) => { const r = identity.blockClaim(id, body.by||'director'); s.save(); return r; });
  on('POST', /^\/v1\/approvals\/([^/]+)$/, async (req, q, [token], body) => { const r = identity.directorDecision(token, body.approve !== false, body.by); s.save(); return r; });
  on('POST', /^\/v1\/claims\/([^/]+)\/review$/, async (req, q, [id], body) => { needKey(req, ['admin']); const r = identity.reviewLetter(id, !!body.approve, 'relyable-ops'); s.save(); return r; });

  // ---- Business session (after claim)
  on('POST', /^\/v1\/session\/step-up$/, async (req, q, _, body) => { const t = (req.headers.authorization||'').replace(/^Bearer\s+/i,''); return identity.stepUp(t, body.credentialId); });
  on('GET', /^\/v1\/me$/, async (req) => { const ctx = needSession(req); const o = org(ctx.member.orgId); return {user:{email:ctx.user.email, name:ctx.user.name, mfa:ctx.user.mfa}, member:{role:ctx.member.role, via:ctx.member.via, reattestBy:ctx.member.reattestBy}, organisation: registry.publicView(o), rating: rate(o), members: s.members.filter(m=>m.orgId===o.id).map(m=>({id:m.id,email:m.email,role:m.role,active:m.active,pending:!!m.pending})), reattestDue: identity.reattestDue(o.id).length>0}; });
  on('PUT', /^\/v1\/organisations\/([^/]+)\/scope$/, async (req, q, [id], body) => { const ctx = needSession(req); const o = org(id); if (o.id !== ctx.member.orgId) throw err(403,'not your organisation'); if (!identity.can(ctx.member,'scope')) throw err(403,'role'); identity.requireStepUp(ctx,'scope');
    const attrs = scope.fill(body.attrs||{}); const facts = ingest.facts(o.id, o.facts); const contradictions = scope.checkDeclaration(attrs, {...facts, employees:o.employees, vehicleSic:(o.sic||[]).some(c=>/^49/.test(c))});
    const prev = o.scope && o.scope.attrs || scope.fromSic(o.sic||[]).attrs; const declarations = Object.keys(attrs).filter(k => attrs[k] !== prev[k]).map(k => { const c = contradictions.find(x=>x.attr===k); if (c) attrs[k] = 1; return {attr:k, declared: attrs[k], tier:1, contradicted: !!c, reason: c ? c.reason : null, at:new Date().toISOString()}; });
    o.scope = {family: body.family || (o.scope&&o.scope.family) || scope.fromSic(o.sic||[]).family, sizeBand: body.sizeBand || (o.scope&&o.scope.sizeBand), attrs, confirmed:true, confirmedBy: ctx.user.email, declarations: ((o.scope&&o.scope.declarations)||[]).concat(declarations)};
    const naRate = Object.values(scope.applicability(o.scope).items).filter(v=>v==='na').length / Object.keys(scope.TYPES).length; o.scope.underReview = naRate > 0.55;
    identity.audit(o.id, ctx.user.email, 'scope.confirmed', {declarations, underReview:o.scope.underReview}); snapshotAndPublish(o, 'scope confirmed'); return {scope:o.scope, contradictions, applicability: scope.applicability(o.scope)}; });
  on('GET', /^\/v1\/organisations\/([^/]+)\/evidence$/, async (req, q, [id]) => { const ctx = needSession(req); const o = org(id); if (o.id !== ctx.member.orgId) throw err(403,'not your organisation'); const items = ledger.current(o.id).map(e => ({id:e.id, type:e.type, status:e.status, observedAt:e.observedAt, validUntil:e.validUntil, level:e.level, source:e.source, payload:e.payload, listed:(o.visibility.certs||[]).includes(e.id), core: !!(scope.TYPES[e.type]||{}).core, state: scope.applicability(o.scope||scope.fromSic(o.sic||[])).items[e.type], verification: e.verification||null})); return {items, chainValid: ledger.verifyChain(o.id), anchor: ledger.anchor(o.id)}; });
  on('GET', /^\/v1\/organisations\/([^/]+)\/submissions$/, async (req, q, [id]) => { const ctx = needSession(req); const o = org(id); if (o.id !== ctx.member.orgId) throw err(403,'not your organisation'); return {items: s.submissions.filter(x => x.orgId === o.id)}; });
  on('POST', /^\/v1\/submissions$/, async (req, q, _, body) => { const ctx = needSession(req); if (!identity.can(ctx.member,'submit')) throw err(403,'role'); const o = org(ctx.member.orgId);
    if (ctx.member.domains && !ctx.member.domains.includes((scope.TYPES[body.type]||{}).dom)) throw err(403,'contributor not assigned to this domain');
    if (!scope.TYPES[body.type]) throw err(400,'unknown evidence type'); if (scope.TYPES[body.type].kind === 'public') throw err(400,'public-record items cannot be submitted');
    if (body.issuerRef && s.evidence.some(e => e.orgId !== o.id && e.payload && e.payload.ref === body.issuerRef)) { identity.audit(o.id, ctx.user.email, 'submission.rejected', {reason:'issuer reference belongs to another organisation', ref: body.issuerRef}); throw err(409,'that certificate reference belongs to another organisation; rejected and logged'); }
    const sub = {id:'sub_'+crypto.randomBytes(5).toString('hex'), orgId:o.id, by:ctx.user.email, type:body.type, issuer:body.issuer, issuerRef:body.issuerRef||null, issued:body.issued, expires:body.expires||null, fileRef:body.fileRef||null, genuine: !!body.genuine, listPublic: !!body.listPublic, at:new Date().toISOString(), status: body.issuerRef ? 'pending-issuer-verification' : 'accepted-self-declared'};
    if (!sub.genuine) throw err(400,'you must confirm the document is genuine and unaltered');
    s.submissions.push(sub);
    const e = ledger.emit({orgId:o.id, type:body.type, status:'valid', observedAt: body.issued || new Date().toISOString().slice(0,10), validUntil: body.expires||null, source:'manual:'+ctx.user.email, level: 1, payload:{issuer:body.issuer, ref:body.issuerRef, standard: body.standard, fileRef: body.fileRef}, verification: sub.status}).item;
    sub.evidenceId = e.id; if (sub.listPublic && body.type.startsWith('cert.')) o.visibility.certs.push(e.id);
    identity.audit(o.id, ctx.user.email, 'submission.created', {type:body.type, status:sub.status}); snapshotAndPublish(o, 'manual submission'); return {submission: sub, evidenceId: e.id, note: sub.status === 'pending-issuer-verification' ? 'Counts at Tier 1 now; Tier 2 once the issuer confirms (usually within 2 working days). The previous item stays on the ledger.' : 'Self-declared (Tier 1). Add an issuer reference to have it verified.'}; });
  on('POST', /^\/v1\/submissions\/([^/]+)\/verify$/, async (req, q, [id], body) => { needKey(req, ['admin']); const sub = s.submissions.find(x => x.id===id); if (!sub) throw err(404,'submission'); const o = org(sub.orgId); const old = s.evidence.find(e => e.id === sub.evidenceId);
    if (body.result === 'pass') { sub.status='issuer-verified'; const e = ledger.emit({...old, id:undefined, hash:undefined, prevHash:undefined, at:undefined, level:2, source:'verified:'+(body.verifier||'issuer'), observedAt: old.observedAt, verification:'issuer-verified', payload:{...old.payload, verifiedBy: body.verifier||'issuer'}}).item; sub.evidenceId = e.id; if ((o.visibility.certs||[]).includes(old.id)) o.visibility.certs.push(e.id); }
    else { sub.status='issuer-rejected'; old.disputed = true; old.rejected = body.reason||'issuer could not confirm'; }
    identity.audit(o.id, 'relyable-ops', 'submission.'+sub.status, {id}); snapshotAndPublish(o, 'issuer verification'); return sub; });
  on('PUT', /^\/v1\/organisations\/([^/]+)\/visibility$/, async (req, q, [id], body) => { const ctx = needSession(req); const o = org(id); if (o.id !== ctx.member.orgId) throw err(403,'not your organisation'); if (ctx.member.role !== 'owner') throw err(403,'only Owners change what is public'); identity.requireStepUp(ctx,'visibility'); const ids = new Set(ledger.current(o.id).filter(e=>e.type.startsWith('cert.')).map(e=>e.id)); o.visibility.certs = (body.listedCertificationIds||[]).filter(i => ids.has(i)); identity.audit(o.id, ctx.user.email, 'visibility.changed', {listed:o.visibility.certs}); s.save(); return {visibility:o.visibility, alwaysPublic:['rating','band','tier','verifiedRatio','domains','flags','scope'], neverPublic:['policies','procedures','records','documents','people','incident details']}; });
  on('POST', /^\/v1\/organisations\/([^/]+)\/members$/, async (req, q, [id], body) => { const ctx = needSession(req); if (org(id).id !== ctx.member.orgId) throw err(403,'not your organisation'); const m = identity.invite(ctx, body); s.save(); return m; });
  on('DELETE', /^\/v1\/organisations\/([^/]+)\/members\/([^/]+)$/, async (req, q, [id, mid]) => { const ctx = needSession(req); if (org(id).id !== ctx.member.orgId) throw err(403,'not your organisation'); const r = identity.removeMember(ctx, mid); s.save(); return r; });
  on('GET', /^\/v1\/organisations\/([^/]+)\/audit$/, async (req, q, [id]) => { const ctx = needSession(req); const o = org(id); if (o.id !== ctx.member.orgId) throw err(403,'not your organisation'); return {items: s.audit.filter(a => a.orgId === o.id).slice(-100).reverse(), reads: (o.reads||[]).slice(-50), reportReads: s.reports.filter(r=>r.orgId===o.id).flatMap(r=>r.reads.map(x=>({reportId:r.id, ...x})))}; });
  on('POST', /^\/v1\/reports$/, async (req, q, _, body) => { let o, issuedBy; const k = keyOf(req); if (k && k.kind === 'connector') { o = org(k.orgId); issuedBy = 'connector:'+k.name; } else { const ctx = needSession(req); if (!identity.can(ctx.member,'share')) throw err(403,'role'); o = org(ctx.member.orgId); issuedBy = ctx.user.email; } const r = reports.issue(o, rate(o), {issuedBy, audience: body.audience, ttlDays: body.ttlDays, includeExplanation: !!body.includeExplanation}); identity.audit(o.id, issuedBy, 'report.issued', {id:r.id, audience:r.audience}); s.save(); return {id:r.id, jwt:r.jwt, verifyUrl:'/v1/verify/'+r.id, expires:new Date(r.payload.exp*1000).toISOString()}; });
  on('DELETE', /^\/v1\/reports\/([^/]+)$/, async (req, q, [id]) => { const ctx = needSession(req); identity.requireStepUp(ctx,'withdraw'); const r = s.reports.find(x=>x.id===id && x.orgId===ctx.member.orgId); if (!r) throw err(404,'report'); reports.withdraw(id); identity.audit(ctx.member.orgId, ctx.user.email, 'report.withdrawn', {id}); s.save(); return {ok:true}; });
  on('POST', /^\/v1\/disputes$/, async (req, q, _, body) => { const ctx = needSession(req); identity.requireStepUp(ctx,'dispute'); const o = org(ctx.member.orgId); const e = s.evidence.find(x => x.id === body.evidenceId && x.orgId === o.id); if (!e) throw err(404,'evidence'); e.disputed = true; const d = {id:'dsp_'+crypto.randomBytes(4).toString('hex'), orgId:o.id, evidenceId:e.id, reason:body.reason, by:ctx.user.email, at:new Date().toISOString(), status:'open', slaDays:5}; s.disputes.push(d); identity.audit(o.id, ctx.user.email, 'dispute.opened', {id:d.id, type:e.type}); snapshotAndPublish(o, 'dispute opened'); return d; });

  // ---- Connectors (iMS OS modules etc.): evidence push, scoped to one organisation
  on('POST', /^\/v1\/evidence$/, async (req, q, _, body) => { const k = needKey(req, ['connector']); const o = org(k.orgId); const r = ledger.emit({...body, orgId:o.id, level: Math.min(3, Number(body.level ?? 3)), source: body.source || 'connector:'+k.name}); if (!r.duplicate) snapshotAndPublish(o, 'evidence '+body.type); return {id:r.item.id, duplicate:r.duplicate, hash:r.item.hash, rating: rateSummary(o)}; });
  on('POST', /^\/v1\/evidence\/batch$/, async (req, q, _, body) => { const k = needKey(req, ['connector']); const o = org(k.orgId); const out = (body.items||[]).map(e => ledger.emit({...e, orgId:o.id, level: Math.min(3, Number(e.level ?? 3)), source: e.source || 'connector:'+k.name})); snapshotAndPublish(o, 'batch evidence'); return {added: out.filter(x=>!x.duplicate).length, duplicates: out.filter(x=>x.duplicate).length, rating: rateSummary(o)}; });
  on('POST', /^\/v1\/registry\/resolve$/, async (req, q, _, body) => { needKey(req, ['connector','reader','admin']); const hits = registry.resolve(body); return {matches: hits.map(h => ({orgId:h.org.id, legalName:h.org.legalName, companyNumber:h.org.companyNumber, confidence:h.confidence, possible: h.confidence < 0.9}))}; });
  on('POST', /^\/v1\/registry\/links$/, async (req, q, _, body) => { const k = needKey(req, ['connector']); return registry.link(body.tenantId||k.orgId, body.recordType, body.recordId, org(body.orgId).id, body.confidence||1); });

  // ---- Admin / ops: keys, ingest, Companies House stream events
  on('POST', /^\/v1\/admin\/keys$/, async (req, q, _, body) => { needKey(req, ['admin']); const k = {id:'key_'+crypto.randomBytes(4).toString('hex'), key:(body.kind==='reader'?'rly_rd_':body.kind==='connector'?'rly_cx_':'rly_ad_')+crypto.randomBytes(12).toString('hex'), kind:body.kind, name:body.name, orgId: body.orgId ? org(body.orgId).id : undefined, rate:{perMin: body.kind==='reader'?600:1200}, at:new Date().toISOString()}; s.keys.push(k); s.save(); return k; });
  on('POST', /^\/v1\/admin\/ingest$/, async (req, q, _, body) => { needKey(req, ['admin']); if (body.companyNumber) { const r = await ingest.organisation(body.companyNumber); if (!r) throw err(404,'not found at Companies House'); snapshotAndPublish(r.org, 'public-record ingest'); return {orgId:r.org.id, added:r.added, facts:r.facts, rating: rateSummary(r.org)}; } const n = await ingest.all(); for (const o of s.organisations) snapshotAndPublish(o, 'nightly ingest'); return {organisations:n, live: ch.live}; });
  on('POST', /^\/v1\/admin\/ch-events$/, async (req, q, _, body) => { needKey(req, ['admin']); const o = org(body.companyNumber); if (body.event === 'officer.resigned') identity.officerResigned(o.id, body.officerId); if (body.event === 'accounts.overdue') { o.facts = {...(o.facts||{}), accountsOverdue: true}; ledger.emit({orgId:o.id, type:'register.companies-house', status:'adverse', observedAt:new Date().toISOString().slice(0,10), source:'register:companies-house', level:0, payload:{accountsOverdue:true}}); } snapshotAndPublish(o, 'companies-house stream: '+body.event); s.save(); return {ok:true, rating: rateSummary(o)}; });
  on('GET', /^\/v1\/admin\/outbox$/, async (req) => { needKey(req, ['admin']); return {items: s.outbox.slice(-50), webhooks: s.subscriptions.flatMap(x=>x.deliveries).slice(-50)}; });
  on('GET', /^\/v1\/health$/, async () => ({ok:true, organisations:s.organisations.length, evidence:s.evidence.length, companiesHouse: ch.live ? 'live' : 'fixtures', model: engine.MODEL, standard:'1.1'}));

  async function dispatch({method, path: pth, headers = {}, body = {}, remoteAddress = ''}) {
    const u = new URL(pth, 'http://x'); const q = Object.fromEntries(u.searchParams);
    const req = {method, headers, socket:{remoteAddress}};
    for (const r of routes) { if (r.m !== method) continue; const m = u.pathname.match(r.re); if (!m) continue; try { const out = await r.fn(req, q, m.slice(1), body || {}); return {status:200, body:out}; } catch (e) { return {status: e.status || 500, body:{error: e.message, code: e.status===401?'unauthenticated':e.status===403?'forbidden':e.status===404?'not_found':e.status===409?'conflict':e.status===423?'locked':e.status===429?'rate_limited':e.status===400?'bad_request':'error'}}; } }
    return {status:404, body:{error:'no such route'}};
  }
  let server = null;
  if (typeof window === 'undefined') {
    const pub = path.join(__dirname, '../public');
    server = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://x');
      if (req.method === 'OPTIONS') return json(res, 204, {});
      if (!u.pathname.startsWith('/v1/')) { let f = u.pathname === '/' ? '/index.html' : u.pathname; const fp = path.join(pub, path.normalize(f)); if (fp.startsWith(pub) && fs.existsSync(fp) && fs.statSync(fp).isFile()) { res.writeHead(200, {'Content-Type': fp.endsWith('.html')?'text/html; charset=utf-8':fp.endsWith('.js')?'text/javascript':fp.endsWith('.css')?'text/css':'application/octet-stream'}); return fs.createReadStream(fp).pipe(res); } return json(res, 404, {error:'not found'}); }
      let body = ''; for await (const c of req) body += c; try { body = body ? JSON.parse(body) : {}; } catch { return json(res, 400, {error:'invalid JSON'}); }
      const out = await dispatch({method:req.method, path:req.url, headers:req.headers, body, remoteAddress:req.socket.remoteAddress}); json(res, out.status, out.body);
    });
  }
  return {server, dispatch, store:s, registry, ledger, identity, reports, ingest, rate, engine, ch};
}

// Demo seed: ingest every fixture organisation and make Northfield an iMS OS customer with live modules (Tier 3)
async function seed(app) {
  if (app.store.organisations.length) return;
  for (const c of app.ch.fixtures || []) await app.ingest.organisation(c.company_number);
  const nf = app.registry.byNumber('04871234'); if (nf) { const today = new Date().toISOString().slice(0,10), next = new Date(Date.now()+320*864e5).toISOString().slice(0,10);
    const u = {id:'usr_demo_nf', email:'sarah.whitfield@northfield.co.uk', name:'Sarah Whitfield', phone:'07700900123', mfa:'passkey', credentialId:'cred-sarah', createdAt:new Date().toISOString(), verifiedAt:new Date().toISOString(), imsTenantId:'ims_northfield'}; app.store.users.push(u); nf.imsTenantId='ims_northfield'; nf.claimedBy=u.id; nf.claimedAt=new Date().toISOString();
    app.store.members.push({id:'mem_demo_nf', orgId:nf.id, userId:u.id, email:u.email, name:u.name, role:'owner', via:'imsos', officerId:'o1', directorApproved:true, at:new Date().toISOString(), reattestBy:new Date(Date.now()+365*864e5).toISOString(), active:true});
    nf.scope = Object.assign({}, nf.scope, {confirmed:true, confirmedBy:u.email, attrs:{employs:1,sites:1,premises:1,contractor:1,vehicles:1,lifting:1,food:0,regulated:0,data:0}});
    const src = {docs:'connector:Microsoft 365', hr:'connector:HR / training system', assets:'connector:Asset register', inc:'connector:Incident system', sup:'connector:Supplier management', fin:'connector:Finance and broker'};
    for (const e of [['training.competence',src.hr,{status:'partial',payload:{ok:182,total:186}}],['training.licence',src.hr,{}],['training.induction',src.hr,{}],['policy.hs',src.docs,{validUntil:next}],['policy.review',src.docs,{}],['policy.ack',src.docs,{}],['fire.risk.assessment',src.docs,{validUntil:next}],['fire.test',src.docs,{}],['infosec.mfa',src.docs,{}],['infosec.dpo',src.docs,{}],['gov.management.review',src.docs,{}],['asset.loler',src.assets,{validUntil:next}],['asset.puwer',src.assets,{}],['asset.calibration',src.assets,{validUntil:next}],['fleet.olicence',src.assets,{validUntil:next,level:2}],['fleet.driver.checks',src.assets,{}],['safety.riddor',src.inc,{}],['safety.inspection',src.inc,{}],['supplier.approved',src.sup,{}],['supplier.modern-slavery',src.sup,{validUntil:next}],['fin.insurance.el',src.fin,{validUntil:next,level:2}],['fin.insurance.pl',src.fin,{validUntil:next,level:2}]]) app.ledger.emit(Object.assign({orgId:nf.id, type:e[0], status:'valid', observedAt:today, source:e[1], level:3}, e[2]));
    app.store.audit.push({id:'aud_demo', orgId:nf.id, actor:u.email, action:'claim.complete', detail:{role:'owner', via:'imsos'}, at:new Date().toISOString(), prevHash:null, hash:'demo'});
  }
  for (const o of app.store.organisations) { const r = app.rate(o); app.store.snapshots.push({orgId:o.id, score:r.score, band:r.band, tier:r.tier, caps:r.caps.map(c=>c.reason), at:r.computedAt, reason:'initial'}); }
  app.store.save();
}
module.exports = {build, seed};
