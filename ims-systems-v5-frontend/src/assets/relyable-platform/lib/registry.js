'use strict';
// Organisation registry: one record per legal entity, keyed on Companies House number. Standard §C1 (entity resolution).
const crypto = require('crypto');
const scope = require('./scope');
const norm = s => String(s||'').toLowerCase().replace(/\b(ltd|limited|plc|llp|the|&|and)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
class Registry {
  constructor(store) { this.store = store; }
  byId(id) { return this.store.organisations.find(o => o.id === id); }
  byNumber(n) { return this.store.organisations.find(o => o.companyNumber === String(n).padStart(8,'0')); }
  upsert(rec) {
    let o = rec.companyNumber ? this.byNumber(rec.companyNumber) : null;
    if (!o) { o = {id:'org_'+crypto.randomBytes(5).toString('hex'), createdAt:new Date().toISOString(), claimedBy:null, visibility:{certs:[]}, scope:null}; this.store.organisations.push(o); }
    Object.assign(o, rec, {companyNumber: rec.companyNumber ? String(rec.companyNumber).padStart(8,'0') : o.companyNumber});
    if (!o.scope && o.sic) { const s = scope.fromSic(o.sic); o.scope = {family:s.family, sizeBand:scope.sizeBand(o.employees), attrs:s.attrs, source:'companies-house', confirmed:false}; }
    return o;
  }
  // resolve {name, companyNumber?, postcode?} → [{org, confidence}]
  resolve(q) {
    if (q.companyNumber) { const o = this.byNumber(q.companyNumber); return o ? [{org:o, confidence:1}] : []; }
    const n = norm(q.name); if (!n) return [];
    const toks = n.split(' ');
    return this.store.organisations.map(o => {
      const on = norm(o.legalName); const otoks = on.split(' ');
      const inter = toks.filter(t => otoks.includes(t)).length;
      let c = 0.6*inter/toks.length + 0.4*inter/otoks.length;
      if (on === n) c = 0.98;
      if (q.postcode && o.postcode && q.postcode.replace(/\s/g,'').toUpperCase() === o.postcode.replace(/\s/g,'').toUpperCase()) c = Math.min(1, c + 0.15);
      return {org:o, confidence: Math.round(c*100)/100};
    }).filter(x => x.confidence >= 0.4).sort((a,b)=>b.confidence-a.confidence).slice(0, 10);
  }
  search(q) { return this.resolve({name:q, companyNumber: /^\d{6,8}$/.test(q) ? q : undefined}); }
  link(tenantId, recordType, recordId, orgId, confidence) {
    const l = {id:'lnk_'+crypto.randomBytes(4).toString('hex'), tenantId, recordType, recordId, orgId, confidence, at:new Date().toISOString()};
    this.store.links = this.store.links.filter(x => !(x.tenantId===tenantId && x.recordType===recordType && x.recordId===recordId));
    this.store.links.push(l); return l;
  }
  publicView(o) { return {id:o.id, legalName:o.legalName, companyNumber:o.companyNumber, status:o.status, jurisdiction:o.jurisdiction||'GB', sic:o.sic, postcode:o.postcode, scope:o.scope && {family:o.scope.family, sizeBand:o.scope.sizeBand, attrs:o.scope.attrs, confirmed:o.scope.confirmed, declarations:o.scope.declarations||[]}, claimed:!!o.claimedBy, claimedAt:o.claimedAt||null}; }
}
module.exports = {Registry, norm};
