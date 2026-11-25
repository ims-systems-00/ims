'use strict';
// Relyable Identity — the one claim service used by iMS OS onboarding and relyable.com. Standard v1.1 §C2.
const crypto = require('crypto');
const rid = p => p + '_' + crypto.randomBytes(6).toString('hex');
const FREE_DOMAINS = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|aol)\./i;
const LIMITS = {ownerOrgsWithoutReview: 5, claimsPerDevicePerDay: 3, claimsPerIpPerDay: 10, failedVerifications: 3, blockWindowHours: 72, letterValidDays: 30, reattestDays: 365};
const ROLES = ['owner','admin','contributor','viewer','verifier'];
const STEP_UP = ['visibility','members','connect','disconnect','withdraw','dispute','transfer','scope'];
const now = () => new Date().toISOString();

class Identity {
  constructor(store, {registry, notify, idv}) { this.s = store; this.registry = registry; this.notify = notify || (()=>{}); this.idv = idv; }
  audit(orgId, actor, action, detail) { const a = {id:rid('aud'), orgId, actor, action, detail, at: now(), prevHash: null}; const prev = [...this.s.audit].reverse().find(x => x.orgId === orgId); a.prevHash = prev ? prev.hash : null; a.hash = crypto.createHash('sha256').update(JSON.stringify({...a, hash:undefined})).digest('hex'); this.s.audit.push(a); return a; }

  // ---- Step 1: who you are
  startClaim({orgId, name, title, email, phone, device, ip}) {
    const org = this.registry.byId(orgId); if (!org) throw err(404, 'organisation not found');
    if (!name || !email || !phone) throw err(400, 'name, email and phone are required');
    const day = now().slice(0,10);
    const recent = this.s.claims.filter(c => c.at.slice(0,10) === day);
    const held = (device && recent.filter(c => c.device === device).length >= LIMITS.claimsPerDevicePerDay) || (ip && recent.filter(c => c.ip === ip).length >= LIMITS.claimsPerIpPerDay);
    const existingOwner = this.s.members.filter(m => m.email === email.toLowerCase() && m.role === 'owner').length;
    const c = {id: rid('clm'), orgId, who: {name, title, email: email.toLowerCase(), phone}, device, ip, at: now(), status: 'contact-verification', emailCode: code(), smsCode: code(), emailVerified:false, phoneVerified:false, failures:0, heldForReview: !!held || existingOwner >= LIMITS.ownerOrgsWithoutReview, route:null, role:null, blockedUntil:null, log:[]};
    this.s.claims.push(c);
    this.notify({kind:'email', to:c.who.email, subject:'Your Relyable verification code', body:`Code: ${c.emailCode}`});
    this.notify({kind:'sms', to:c.who.phone, body:`Relyable code: ${c.smsCode}`});
    // Letter to the registered office on every claim, whichever route
    this.notify({kind:'post', to:`The Directors, ${org.legalName}, registered office`, subject:'A Relyable rating claim has started', body:`${name} (${email}) has started a claim for ${org.legalName}. If this is not expected, block it at relyable.com/block/${c.id} within 72 hours.`});
    // Existing owners and directors with verified contact
    for (const m of this.s.members.filter(m => m.orgId === orgId && m.role === 'owner')) this.notify({kind:'email', to:m.email, subject:'New claim on your organisation', body:`${name} started a claim. Block within 72 h: /block/${c.id}`});
    c.blockedUntil = new Date(Date.now() + LIMITS.blockWindowHours*3600e3).toISOString();
    this.audit(orgId, email, 'claim.started', {claimId:c.id, heldForReview:c.heldForReview});
    return {claimId: c.id, next: 'verify-contact', heldForReview: c.heldForReview, freeEmailDomain: FREE_DOMAINS.test(email.split('@')[1]||'')};
  }
  verifyContact(claimId, {emailCode, smsCode}) {
    const c = this.claim(claimId);
    if (c.emailCode !== String(emailCode) || c.smsCode !== String(smsCode)) return this.fail(c, 'contact codes wrong');
    c.emailVerified = c.phoneVerified = true; c.status = 'authority'; this.audit(c.orgId, c.who.email, 'claim.contact-verified', {}); return {ok:true, next:'authority', routes: this.routes(c)};
  }
  routes(c) {
    const org = this.registry.byId(c.orgId); const dom = (c.who.email.split('@')[1]||'').toLowerCase();
    const regDomains = (org.domains || []).map(d => d.toLowerCase());
    const domainOk = regDomains.includes(dom) && !FREE_DOMAINS.test(dom);
    const tenant = (org.imsTenantId && this.s.users.find(u => u.email === c.who.email && u.imsTenantId === org.imsTenantId && u.verifiedAt));
    return [
      {route:'imsos', available: !!tenant, role:'owner', result:'instant', why: tenant ? 'Verified at iMS OS onboarding' : 'No verified iMS OS user with this email for this organisation'},
      {route:'officer', available: true, role:'owner', result:'instant', officers: (org.officers||[]).filter(o=>!o.resignedOn).map(o => ({id:o.id, name:o.name, role:o.role, dobMonth:o.dob ? o.dob.slice(0,7) : null}))},
      {route:'director', available: domainOk, role:'admin', result:'1-2 days', why: domainOk ? `Email at registered domain ${dom}` : 'Email is not at the registered domain', directors:(org.officers||[]).filter(o=>!o.resignedOn && /director/i.test(o.role)).map(o=>({id:o.id,name:o.name}))},
      {route:'post', available: true, role:'owner', result:'5-7 days'},
      {route:'letter', available: true, role:'admin', result:'2-3 days'},
    ];
  }
  // ---- Step 2: authority
  authority(claimId, body) {
    const c = this.claim(claimId); if (c.status !== 'authority') throw err(409, 'claim not at authority step');
    const org = this.registry.byId(c.orgId); const r = this.routes(c).find(x => x.route === body.route); if (!r || !r.available) throw err(400, 'route not available');
    c.route = body.route;
    if (body.route === 'imsos') { c.role='owner'; c.status='security'; c.authority={how:'iMS OS tenant verified at onboarding', verified:true}; }
    else if (body.route === 'officer') {
      const off = (org.officers||[]).find(o => o.id === body.officerId && !o.resignedOn); if (!off) throw err(400, 'officer not found');
      const idv = this.idv.check({name: c.who.name, dobMonth: body.dobMonth, document: body.document}); // accredited provider; stores result only
      this.s.idv.push({id: rid('idv'), claimId, provider: idv.provider, ref: idv.ref, result: idv.result, at: now()});
      const nameOk = norm(idv.name || c.who.name) === norm(off.name); const dobOk = !off.dob || (body.dobMonth && off.dob.slice(0,7) === body.dobMonth);
      if (idv.result !== 'pass' || !nameOk || !dobOk) return this.fail(c, 'identity does not match the officer record');
      c.role='owner'; c.status='security'; c.authority={how:`Officer match: ${off.name} (${off.role}), ID and liveness passed (${idv.provider} ${idv.ref})`, verified:true, officerId: off.id};
    }
    else if (body.route === 'director') {
      const d = (org.officers||[]).find(o => o.id === body.directorId && /director/i.test(o.role)); if (!d) throw err(400, 'director not found');
      c.role='admin'; c.status='pending-director'; c.approvalToken = rid('apr'); c.authority={how:`Registered-domain email; approval requested from ${d.name}`, verified:false, directorId:d.id};
      this.notify({kind:'email', to: d.email || `${d.id}@directors.invalid`, subject:`Approve ${c.who.name} to act for ${org.legalName} on Relyable`, body:`Approve: /approve/${c.approvalToken}  Decline: /decline/${c.approvalToken}`});
    }
    else if (body.route === 'post') { c.role='owner'; c.status='pending-letter'; c.letterCode = code(8); c.letterExpires = new Date(Date.now()+LIMITS.letterValidDays*864e5).toISOString(); c.authority={how:'Code posted to the registered office', verified:false}; this.notify({kind:'post', to:`The Directors, ${org.legalName}, registered office`, subject:'Your Relyable activation code', body:`Code ${c.letterCode}, valid 30 days`}); }
    else if (body.route === 'letter') { if (!body.letterRef) throw err(400,'signed letter upload required'); c.role='admin'; c.status='pending-review'; c.authority={how:'Signed authorisation letter under review; call-back to public-record number', verified:false, letterRef: body.letterRef}; }
    this.audit(c.orgId, c.who.email, 'claim.authority', {route:c.route, status:c.status});
    return {ok:true, status:c.status, role:c.role, next: c.status === 'security' ? 'security' : 'wait'};
  }
  // async completions
  directorDecision(token, approve, by) { const c = this.s.claims.find(x => x.approvalToken === token); if (!c) throw err(404,'no such approval'); if (!approve) { c.status='declined'; this.audit(c.orgId, by||'director', 'claim.declined', {}); return {ok:true, status:c.status}; } c.status='security'; c.authority.verified=true; c.authority.how += ' — approved'; this.audit(c.orgId, by||'director', 'claim.director-approved', {claimId:c.id}); return {ok:true, status:c.status}; }
  enterLetterCode(claimId, codeIn) { const c = this.claim(claimId); if (c.status!=='pending-letter') throw err(409,'not waiting for a letter'); if (new Date(c.letterExpires) < new Date()) throw err(410,'code expired'); if (c.letterCode !== String(codeIn).toUpperCase()) return this.fail(c,'letter code wrong'); c.status='security'; c.authority.verified=true; this.audit(c.orgId,c.who.email,'claim.letter-verified',{}); return {ok:true,status:c.status}; }
  reviewLetter(claimId, approve, reviewer) { const c = this.claim(claimId); if (c.status!=='pending-review') throw err(409,'not under review'); c.status = approve?'security':'declined'; c.authority.verified = !!approve; this.audit(c.orgId, reviewer, approve?'claim.letter-approved':'claim.letter-declined', {}); return {ok:true,status:c.status}; }
  blockClaim(claimId, by) { const c = this.claim(claimId); if (c.blockedUntil && new Date(c.blockedUntil) > new Date()) { c.status='blocked'; this.audit(c.orgId, by, 'claim.blocked', {}); return {ok:true}; } throw err(410,'block window has passed'); }
  // ---- Step 3: security
  security(claimId, {method, credentialId}) {
    const c = this.claim(claimId); if (c.status !== 'security') throw err(409, 'claim not at security step');
    if (!['passkey','totp'].includes(method)) throw err(400, 'passkey or totp required; password-only accounts are not accepted');
    if (c.heldForReview) { c.status='held'; this.audit(c.orgId, c.who.email, 'claim.held-for-review', {}); return {ok:true, status:'held', why:'velocity limit or owner count; manual review'}; }
    let u = this.s.users.find(u => u.email === c.who.email);
    if (!u) { u = {id: rid('usr'), email: c.who.email, name: c.who.name, phone: c.who.phone, mfa: method, credentialId: credentialId || rid('cred'), createdAt: now(), verifiedAt: now()}; this.s.users.push(u); } else { u.mfa = method; u.credentialId = credentialId || u.credentialId; }
    // One organisation, one claim record: a second verified claim becomes a dispute, not a second owner
    const org = this.registry.byId(c.orgId);
    if (org.claimedBy && !this.s.members.find(m => m.orgId===org.id && m.userId===u.id)) {
      c.status='disputed'; const d={id:rid('dsp'), orgId:org.id, kind:'competing-claim', claimId:c.id, at:now(), status:'open'}; this.s.disputes.push(d);
      this.audit(org.id, c.who.email, 'claim.competing', {disputeId:d.id}); return {ok:true, status:'disputed', disputeId:d.id};
    }
    this.s.members.push({id: rid('mem'), orgId: c.orgId, userId: u.id, email: u.email, name: u.name, role: c.role, via: c.route, officerId: c.authority.officerId || null, directorApproved: ['officer','director','imsos','post'].includes(c.route), at: now(), reattestBy: new Date(Date.now()+LIMITS.reattestDays*864e5).toISOString(), active:true});
    if (!org.claimedBy) { org.claimedBy = u.id; org.claimedAt = now(); }
    c.status = 'complete'; const session = this.session(u, c.orgId);
    this.audit(c.orgId, u.email, 'claim.complete', {role:c.role, mfa:method});
    return {ok:true, status:'complete', role:c.role, token: session.token, next:'scope'};
  }
  session(u, orgId) { const t = {token: 'rly_sess_' + crypto.randomBytes(16).toString('hex'), userId:u.id, orgId, at: Date.now(), stepUpAt: Date.now(), expires: Date.now()+12*3600e3, last: Date.now()}; this.s.sessions = this.s.sessions||[]; this.s.sessions.push(t); return t; }
  auth(token) { const t = (this.s.sessions||[]).find(x => x.token === token); if (!t) return null; const n = Date.now(); if (n > t.expires || n - t.last > 30*60e3) return null; t.last = n; const m = this.s.members.find(m => m.userId===t.userId && m.orgId===t.orgId && m.active); if (!m) return null; return {session:t, member:m, user:this.s.users.find(u=>u.id===t.userId)}; }
  stepUp(token, credentialId) { const t = (this.s.sessions||[]).find(x => x.token === token); if (!t) throw err(401,'no session'); const u = this.s.users.find(u=>u.id===t.userId); if (u.credentialId !== credentialId) throw err(401,'step-up failed'); t.stepUpAt = Date.now(); return {ok:true}; }
  requireStepUp(ctx, action) { if (STEP_UP.includes(action) && Date.now() - ctx.session.stepUpAt > 5*60e3) throw err(403, `step-up required for ${action}`); }
  can(member, action) { const r = member.role; const m = {owner:'*', admin:['connect','disconnect','submit','update','share','members:contributor','scope'], contributor:['submit','update'], viewer:['read'], verifier:['verify-one']}; return r==='owner' || (m[r]||[]).includes(action) || action==='read'; }
  // ---- Roles
  invite(ctx, {email, role, domains}) {
    this.requireStepUp(ctx, 'members'); if (!ROLES.includes(role)) throw err(400,'bad role');
    if (ctx.member.role !== 'owner' && !(ctx.member.role === 'admin' && ['contributor','viewer','verifier'].includes(role))) throw err(403, 'admins may only add contributors, viewers and verifiers');
    const inv = {id: rid('mem'), orgId: ctx.member.orgId, userId:null, email: email.toLowerCase(), role, domains: domains||null, invitedBy: ctx.user.email, at: now(), active:false, pending:true, expires: role==='verifier' ? new Date(Date.now()+7*864e5).toISOString() : null};
    this.s.members.push(inv); this.notify({kind:'email', to:inv.email, subject:'You have been invited to Relyable', body:`Role ${role}. Set up a passkey to accept.`});
    for (const o of this.s.members.filter(m=>m.orgId===ctx.member.orgId && m.role==='owner' && m.active)) this.notify({kind:'email', to:o.email, subject:'Role change', body:`${email} invited as ${role} by ${ctx.user.email}`});
    this.audit(ctx.member.orgId, ctx.user.email, 'member.invited', {email, role}); return inv;
  }
  removeMember(ctx, memberId) {
    this.requireStepUp(ctx, 'members'); const m = this.s.members.find(x => x.id===memberId && x.orgId===ctx.member.orgId); if (!m) throw err(404,'member');
    const owners = this.s.members.filter(x => x.orgId===ctx.member.orgId && x.role==='owner' && x.active);
    if (m.role === 'owner' && owners.length <= 1) throw err(409, 'the last Owner cannot be removed; two Owners are needed to transfer ownership');
    if (m.role === 'owner' && ctx.member.role !== 'owner') throw err(403,'only Owners remove Owners');
    m.active = false; m.removedAt = now(); this.audit(ctx.member.orgId, ctx.user.email, 'member.removed', {memberId, role:m.role}); return {ok:true};
  }
  // ---- Companies House officer events (from the streaming API)
  officerResigned(orgId, officerId) {
    const org = this.registry.byId(orgId); const off = (org.officers||[]).find(o => o.id === officerId); if (off) off.resignedOn = now().slice(0,10);
    for (const m of this.s.members.filter(m => m.orgId===orgId && m.officerId===officerId && m.active)) { m.active=false; m.suspended='officer resigned at Companies House'; this.audit(orgId, 'companies-house', 'member.suspended', {memberId:m.id, reason:m.suspended}); for (const d of (org.officers||[]).filter(o=>!o.resignedOn)) this.notify({kind:'email', to:d.email||'directors', subject:'Relyable Owner suspended', body:`${m.email} was suspended because the officer record was resigned.`}); }
    // if no owner remains, directors are told
    if (!this.s.members.some(m => m.orgId===orgId && m.role==='owner' && m.active)) this.notify({kind:'post', to:`The Directors, ${org.legalName}`, subject:'Your Relyable rating has no active Owner', body:'Please claim again or approve an Admin.'});
  }
  reattestDue(orgId) { return this.s.members.filter(m => m.orgId===orgId && m.role==='owner' && m.active && new Date(m.reattestBy) < new Date()); }
  // helpers
  claim(id) { const c = this.s.claims.find(x => x.id === id); if (!c) throw err(404, 'claim not found'); if (c.status==='locked') throw err(423,'claim locked after repeated failures; the registered office has been written to'); if (c.status==='blocked') throw err(423,'claim blocked by an existing owner or director'); return c; }
  fail(c, why) { c.failures++; c.log.push({at:now(), why}); if (c.failures >= LIMITS.failedVerifications) { c.status='locked'; const org=this.registry.byId(c.orgId); this.notify({kind:'post', to:`The Directors, ${org.legalName}`, subject:'Relyable claim locked', body:`A claim by ${c.who.email} failed verification ${c.failures} times and is locked.`}); this.audit(c.orgId, c.who.email, 'claim.locked', {why}); throw err(423, 'claim locked: ' + why); } this.audit(c.orgId, c.who.email, 'claim.failed', {why, failures:c.failures}); throw err(400, why + ` (${LIMITS.failedVerifications - c.failures} attempt(s) left)`); }
}
function code(n=6){ return crypto.randomInt(0, 10**n).toString().padStart(n,'0'); }
function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim(); }
function err(status, message){ const e = new Error(message); e.status = status; return e; }
// Identity-verification provider interface. Production: GOV.UK One Login / an accredited IDV vendor. Stores result + reference only.
const StubIdv = { check({name, dobMonth, document}) { const fail = document === 'FAIL'; return {provider:'stub-idv', ref:'IDV-'+crypto.randomBytes(3).toString('hex').toUpperCase(), result: fail?'fail':'pass', name}; } };
module.exports = {Identity, StubIdv, LIMITS, ROLES, STEP_UP, err};
