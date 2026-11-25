'use strict';
// Other public registers. Each adapter exposes lookup(org) → facts and evidence(orgId, facts) → evidence items.
// HSE: no API; a nightly crawler over notices.hse.gov.uk + the temporary-register spreadsheet feeds the same shape. Hits need human confirmation before they cap.
// Gazette: Data Service CSV/XLS by FTP (London weekly + Edinburgh/Belfast monthly), ingested into the same shape; CH insolvency flag is the real-time signal.
// IAF CertSearch: verification API (apply); UKAS CertCheck manual. SSIP: portal lookup now, data agreement later.
const today = () => new Date().toISOString().slice(0,10);
class FixtureRegister {
  constructor(name, fixtures, build) { this.name = name; this.fx = fixtures || {}; this.build = build; }
  async lookup(org) { return this.fx[org.companyNumber] || this.fx['*'] || null; }
  evidence(orgId, facts) { return this.build(orgId, facts || {}, 'register:' + this.name, today()); }
}
const HSE = (fx) => new FixtureRegister('hse', fx, (orgId, f, src, at) => [{orgId, type:'register.hse', status: f.notices && f.notices.length ? 'adverse' : 'clear', observedAt: at, source: src, level: 0, confirmed: !f.notices || !f.notices.length ? true : !!f.confirmed, payload:{notices: f.notices||[], prosecutions: f.prosecutions||[], window:'5 years'}}]);
const Gazette = (fx) => new FixtureRegister('gazette', fx, (orgId, f, src, at) => [{orgId, type:'register.gazette', status: f.notices && f.notices.length ? 'adverse' : 'clear', observedAt: at, source: src, level: 0, payload:{notices: f.notices||[], feed:'London weekly'}}]);
const Directors = (fx) => new FixtureRegister('companies-house-disqualifications', fx, (orgId, f, src, at) => [{orgId, type:'register.directors', status: f.disqualified && f.disqualified.length ? 'adverse' : 'clear', observedAt: at, source: src, level: 0, payload:{disqualified: f.disqualified||[], matchRule:'name + DOB month/year; <0.9 shown as possible match'}}]);
const SSIP = (fx) => new FixtureRegister('ssip', fx, (orgId, f, src, at) => f.scheme ? [{orgId, type:'cert.ssip', status:'valid', observedAt: f.issued || at, validUntil: f.expires, source: src, level: 0, payload:{scheme: f.scheme, ref: f.ref}}] : []);
const IAF = (fx) => new FixtureRegister('iaf-certsearch', fx, (orgId, f, src, at) => (f.certificates||[]).map(c => ({orgId, type: 'cert.' + c.standard.toLowerCase().replace(/[^a-z0-9]/g,''), status: c.status === 'valid' ? 'valid' : 'expired', observedAt: c.issued, validUntil: c.expires, source: src, level: 0, payload:{standard:c.standard, cb:c.cb, ref:c.ref, accreditation:'UKAS'}})));
const Regulator = (fx) => new FixtureRegister('regulator', fx, (orgId, f, src, at) => f.regulator ? [{orgId, type:'cert.regulator', status: f.status === 'registered' ? 'valid':'fail', observedAt: at, validUntil: f.expires || null, source: src + ':' + f.regulator.toLowerCase(), level: 0, payload:{regulator: f.regulator, ref: f.ref}}] : []);
module.exports = {HSE, Gazette, Directors, SSIP, IAF, Regulator, FixtureRegister};
