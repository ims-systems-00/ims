'use strict';
// Signed reports (JWT HS256 in the POC; RS256/ES256 with published JWKS in production), public verify, subscriptions with HMAC webhooks, portfolios.
const crypto = require('crypto');
const b64 = s => Buffer.from(s).toString('base64url');
class Reports {
  constructor(store, {secret}) { this.s = store; this.secret = secret || process.env.RLY_SIGNING_SECRET || 'dev-signing-secret'; }
  issue(org, snapshot, {issuedBy, audience, ttlDays=90, includeExplanation=false}) {
    const id = 'RLY-' + org.companyNumber.slice(-4) + '-' + new Date().toISOString().slice(0,7).replace('-','') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const body = this.publicBody(org, snapshot);
    const payload = {jti:id, iss:'relyable', sub:org.id, aud:audience||'any', iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+ttlDays*86400, snapshotHash: crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), ...body};
    const head = b64(JSON.stringify({alg:'HS256', typ:'JWT', kid:'relyable-2026-11'})); const p = b64(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', this.secret).update(head + '.' + p).digest('base64url');
    const r = {id, orgId:org.id, jwt: head+'.'+p+'.'+sig, payload, issuedBy, audience:audience||null, at:new Date().toISOString(), reads:[], withdrawn:false, includeExplanation};
    this.s.reports.push(r); return r;
  }
  publicBody(org, snap) {
    const certs = (org.visibility && org.visibility.certs) || [];
    return {organisation:{legalName:org.legalName, companyNumber:org.companyNumber, status:org.status, claimed:!!org.claimedBy}, rating:snap.score, band:snap.band, bandName:snap.bandName, tier:snap.tier, verifiedRatio:snap.verifiedRatio, domains:snap.domains, caps:snap.caps.map(c=>c.reason), flags:snap.flags, scope: org.scope ? {family:org.scope.family, sizeBand:org.scope.sizeBand, attrs:org.scope.attrs, confirmed:!!org.scope.confirmed, declarations:org.scope.declarations||[]} : null, listedCertifications: snap.listedCertifications || [], modelVersion:snap.modelVersion, computedAt:snap.computedAt};
  }
  verify(idOrJwt, reader) {
    const r = this.s.reports.find(x => x.id === idOrJwt || x.jwt === idOrJwt); if (!r) return {valid:false, reason:'unknown report'};
    const [h,p,sig] = r.jwt.split('.'); const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(crypto.createHmac('sha256', this.secret).update(h+'.'+p).digest('base64url')));
    const expired = r.payload.exp*1000 < Date.now();
    r.reads.push({at:new Date().toISOString(), reader: reader||'anonymous'});
    return {valid: ok && !expired && !r.withdrawn, signatureValid: ok, expired, withdrawn: r.withdrawn, report: r.payload, reportId: r.id};
  }
  withdraw(id) { const r = this.s.reports.find(x => x.id === id); if (r) r.withdrawn = true; return !!r; }
  subscribe({keyId, orgIds, url, events}) { const sub = {id:'sub_'+crypto.randomBytes(5).toString('hex'), keyId, orgIds, url, events: events||['rating.changed','band.changed','cap.added','cap.removed','flag.adverse'], secret:'whsec_'+crypto.randomBytes(16).toString('hex'), at:new Date().toISOString(), deliveries:[]}; this.s.subscriptions.push(sub); return sub; }
  // Deliver: in the POC we record deliveries to the outbox with the HMAC header instead of calling out.
  publish(event) {
    for (const sub of this.s.subscriptions) {
      if (!sub.orgIds.includes(event.orgId) || !sub.events.includes(event.type)) continue;
      const body = JSON.stringify({id:'evt_'+crypto.randomBytes(5).toString('hex'), type:event.type, orgId:event.orgId, data:event.data, at:new Date().toISOString()});
      const sigHdr = 't=' + Math.floor(Date.now()/1000) + ',v1=' + crypto.createHmac('sha256', sub.secret).update(body).digest('hex');
      sub.deliveries.push({url:sub.url, headers:{'Relyable-Signature':sigHdr, 'Content-Type':'application/json'}, body, at:new Date().toISOString(), status:'queued'});
    }
  }
  portfolio({keyId, name, entries}) { const p = {id:'pf_'+crypto.randomBytes(5).toString('hex'), keyId, name, entries, at:new Date().toISOString()}; this.s.portfolios.push(p); return p; }
}
module.exports = {Reports};
