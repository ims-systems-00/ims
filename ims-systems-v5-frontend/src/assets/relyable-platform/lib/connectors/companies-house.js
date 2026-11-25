'use strict';
// Companies House Public Data API (free key) + Streaming API. Live when CH_API_KEY is set; fixtures otherwise.
const https = typeof window === 'undefined' ? require('https') : null;
const BASE = 'https://api.company-information.service.gov.uk';
function get(path, key) { return new Promise((res, rej) => { const req = https.get(BASE + path, {headers:{Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64')}}, r => { let b=''; r.on('data', d => b += d); r.on('end', () => r.statusCode === 200 ? res(JSON.parse(b)) : r.statusCode === 404 ? res(null) : rej(new Error('CH ' + r.statusCode + ' ' + path))); }); req.on('error', rej); }); }
class CompaniesHouse {
  constructor({key, fixtures}) { this.key = key || process.env.CH_API_KEY; this.fixtures = fixtures; }
  get live() { return !!this.key; }
  async company(number) {
    number = String(number).padStart(8,'0');
    if (!this.live) { const f = (this.fixtures||[]).find(x => x.company_number === number); return f ? this.map(f, f._officers, f._filing) : null; }
    const c = await get('/company/' + number, this.key); if (!c) return null;
    const off = await get(`/company/${number}/officers?items_per_page=50`, this.key);
    const disq = []; for (const o of (off && off.items || []).filter(o => !o.resigned_on)) { if (o.links && o.links.officer) { /* disqualification check happens via search endpoint */ } }
    return this.map(c, off && off.items || [], null);
  }
  async search(q) {
    if (!this.live) return (this.fixtures||[]).filter(f => f.company_name.toLowerCase().includes(q.toLowerCase())).map(f => ({companyNumber:f.company_number, legalName:f.company_name, status:f.company_status, postcode:f.registered_office_address && f.registered_office_address.postal_code}));
    const r = await get('/search/companies?q=' + encodeURIComponent(q) + '&items_per_page=10', this.key);
    return (r && r.items || []).map(i => ({companyNumber:i.company_number, legalName:i.title, status:i.company_status, postcode:i.address && i.address.postal_code}));
  }
  async disqualified(name) { if (!this.live) return (this.fixtures||[]).some(f => (f._disqualified||[]).some(n => n.toLowerCase()===name.toLowerCase())); const r = await get('/search/disqualified-officers?q=' + encodeURIComponent(name), this.key); return !!(r && r.items && r.items.length); }
  map(c, officers, filing) {
    const acc = c.accounts || {}; const cs = c.confirmation_statement || {};
    return {
      companyNumber: c.company_number, legalName: c.company_name, status: c.company_status, jurisdiction: c.jurisdiction || 'GB', incorporated: c.date_of_creation,
      sic: c.sic_codes || [], postcode: c.registered_office_address && c.registered_office_address.postal_code, address: c.registered_office_address,
      accounts: {nextDue: acc.next_due, overdue: !!acc.overdue, lastMadeUpTo: acc.last_accounts && acc.last_accounts.made_up_to},
      confirmation: {nextDue: cs.next_due, overdue: !!cs.overdue},
      insolvency: !!c.has_insolvency_history, charges: !!c.has_charges, employees: c._employees ?? null,
      officers: (officers||[]).map(o => ({id: o.links && o.links.officer ? o.links.officer.appointments.split('/')[2] : o._id || (o.name||'').replace(/\W/g,''), name: cleanName(o.name), role: o.officer_role, dob: o.date_of_birth ? `${o.date_of_birth.year}-${String(o.date_of_birth.month).padStart(2,'0')}` : null, appointedOn: o.appointed_on, resignedOn: o.resigned_on || null, email: o._email || null})),
      domains: c._domains || [],
    };
  }
  // Evidence derived from the record (Tier 0, source register:companies-house)
  evidence(orgId, rec) {
    const at = new Date().toISOString().slice(0,10); const src = 'register:companies-house';
    const items = [
      {orgId, type:'register.companies-house', status: rec.status === 'active' && !rec.accounts.overdue && !rec.confirmation.overdue ? 'clear' : 'adverse', observedAt: at, source: src, level: 0, payload:{status:rec.status, accountsOverdue:rec.accounts.overdue, confirmationOverdue:rec.confirmation.overdue, nextDue:rec.accounts.nextDue}},
      {orgId, type:'fin.accounts', status: rec.accounts.overdue ? 'fail' : 'valid', observedAt: rec.accounts.lastMadeUpTo || at, validUntil: rec.accounts.nextDue || null, source: src, level: 0, payload:{madeUpTo: rec.accounts.lastMadeUpTo}},
    ];
    return items;
  }
}
function cleanName(n){ if(!n) return ''; const [last, first] = n.split(', '); return first ? `${first.trim()} ${last.trim()}`.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase()) : n; }
module.exports = {CompaniesHouse};
