'use strict';
// Append-only, hash-chained evidence ledger (one chain per organisation). Standard §C4.
const crypto = require('crypto');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
class Ledger {
  constructor(store) { this.store = store; store.evidence = store.evidence || []; }
  tail(orgId) { const xs = this.store.evidence.filter(e => e.orgId === orgId); return xs.length ? xs[xs.length-1] : null; }
  key(e) { return [e.orgId, e.type, e.subject ? e.subject.kind + ':' + e.subject.id : '', e.observedAt, e.source].join('|'); }
  emit(e) {
    const req = ['orgId','type','status','observedAt','source','level'];
    for (const k of req) if (e[k] == null) throw new Error('evidence.' + k + ' required');
    if (!['valid','partial','fail','expired','adverse','clear'].includes(e.status)) throw new Error('bad status');
    if (![0,1,2,3].includes(e.level)) throw new Error('bad level');
    const k = this.key(e);
    const dup = this.store.evidence.find(x => this.key(x) === k);
    if (dup) return {item: dup, duplicate: true};
    const prev = this.tail(e.orgId);
    const item = Object.assign({}, e, {id: 'ev_' + crypto.randomBytes(6).toString('hex'), at: new Date().toISOString(), prevHash: prev ? prev.hash : null});
    item.hash = sha(JSON.stringify({...item, hash: undefined}));
    this.store.evidence.push(item);
    return {item, duplicate: false};
  }
  // Items visible to the engine: latest per (type, subject) that is not disputed
  current(orgId) {
    const latest = new Map();
    for (const e of this.store.evidence) {
      if (e.orgId !== orgId || e.disputed) continue;
      const k = e.type + '|' + (e.subject ? e.subject.kind + ':' + e.subject.id : '');
      const cur = latest.get(k);
      if (!cur || e.observedAt >= cur.observedAt) latest.set(k, e);
    }
    return [...latest.values()];
  }
  verifyChain(orgId) {
    let prev = null;
    for (const e of this.store.evidence.filter(x => x.orgId === orgId)) {
      if (e.prevHash !== (prev ? prev.hash : null)) return false;
      if (sha(JSON.stringify({...e, hash: undefined})) !== e.hash) return false;
      prev = e;
    }
    return true;
  }
  anchor(orgId) { const t = this.tail(orgId); return t ? t.hash : null; }
}
module.exports = {Ledger};
