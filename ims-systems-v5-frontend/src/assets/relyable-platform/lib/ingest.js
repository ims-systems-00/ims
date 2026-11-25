'use strict';
// Public-record jobs: Tier 0 for every registry organisation. Standard §C1. Runs nightly; also on demand per organisation.
class Ingest {
  constructor({registry, ledger, ch, registers, engine}) { Object.assign(this, {registry, ledger, ch, registers, engine}); }
  async organisation(numberOrId) {
    let org = this.registry.byId(numberOrId) || this.registry.byNumber(numberOrId);
    const rec = await this.ch.company(org ? org.companyNumber : numberOrId); if (!rec) return null;
    org = this.registry.upsert(rec);
    const facts = {accountsOverdue: rec.accounts.overdue || rec.confirmation.overdue, insolvency: rec.insolvency, employees: rec.employees};
    let added = 0;
    for (const e of this.ch.evidence(org.id, rec)) if (!this.ledger.emit(e).duplicate) added++;
    for (const reg of this.registers) { const f = await reg.lookup(org); for (const e of reg.evidence(org.id, f)) if (!this.ledger.emit(e).duplicate) added++; }
    org.facts = this.facts(org.id, facts); org.lastIngest = new Date().toISOString();
    // Corroborate the pre-filled scope from the public record (never weakens a confirmed declaration)
    if (org.scope && !org.scope.confirmed) { if (org.facts.ssip) org.scope.attrs.contractor = 1; if (org.facts.regulator) org.scope.attrs.regulated = 1; }
    return {org, added, facts: org.facts};
  }
  // Derive cap-driving facts from the latest public-record evidence
  facts(orgId, base = {}) {
    const cur = this.ledger.current(orgId); const f = Object.assign({}, base);
    const g = t => cur.find(e => e.type === t);
    const hse = g('register.hse'); f.enforcement = !!(hse && hse.status === 'adverse' && hse.confirmed);
    const gz = g('register.gazette'); f.insolvency = f.insolvency || !!(gz && gz.status === 'adverse');
    const dq = g('register.directors'); f.disqualifiedDirector = !!(dq && dq.status === 'adverse');
    const ch = g('register.companies-house'); if (ch) f.accountsOverdue = !!(ch.payload.accountsOverdue || ch.payload.confirmationOverdue);
    f.ssip = !!g('cert.ssip'); f.regulator = (g('cert.regulator')||{}).payload && g('cert.regulator').payload.regulator;
    return f;
  }
  async all() { let n = 0; for (const o of this.registry.store.organisations) { await this.organisation(o.id); n++; } return n; }
}
module.exports = {Ingest};
