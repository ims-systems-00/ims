'use strict';
// iMS OS module ↔ Relyable evidence mapping and per-module contribution. Standard v1.1 §B2 weights; applicability per scope.
const {TYPES, DOMAINS, applicability, LABEL} = require('./scope');
const MODULES = {
  documents: {name:'Document Management', types:['policy.hs','policy.review','policy.ack','fire.risk.assessment','cert.iso45001','cert.iso9001','cert.iso14001','cert.cyberessentials','cert.regulator','fin.insurance.el','fin.insurance.pl','supplier.modern-slavery','infosec.dpo'], emits:'on publish, on acknowledgement, on review date, on certificate upload with the Relyable evidence box ticked'},
  training:  {name:'Training & Competency', types:['training.competence','training.licence','training.induction'], emits:'on record save, on session completion, nightly matrix aggregate'},
  inventory: {name:'Inventory & Assets', types:['asset.loler','asset.puwer','asset.calibration','fleet.olicence','fleet.driver.checks'], emits:'on inspection result, on QR sighting, nightly aggregate'},
  suppliers: {name:'Supplier Management', types:['supplier.approved','cert.ssip'], emits:'on approval, on certificate update; reads linked suppliers\' ratings'},
  incidents: {name:'Incidents & Inspections', types:['safety.riddor','safety.inspection','fire.test','food.hygiene'], emits:'on incident status change, on inspection complete, on fire test logged'},
  audits:    {name:'Audits & Management Review', types:['gov.management.review','infosec.mfa'], emits:'on audit closed, M365 security posture nightly'},
  registry:  {name:'Public record (no module)', types:['fin.accounts','register.companies-house','register.directors','register.gazette','register.hse'], emits:'Relyable public-record jobs; nothing to do in iMS OS'},
};
// contribution of each module: points now, points available, share of the rating, gaps and next actions
function contributions(snapshot, scope) {
  const ap = applicability(scope); const appl = DOMAINS.filter(d => snapshot.domains[d.id] != null); const ws = appl.reduce((a,d)=>a+d.w,0);
  // denominator per domain = Σ weights of applicable (required/expected, or optional-present) types
  const den = {}; for (const x of snapshot.explain) den[x.domain] = (den[x.domain]||0) + x.weight;
  const byType = {}; for (const x of snapshot.explain) byType[x.type] = x;
  const out = {}; let totalMax = 0;
  for (const [id, m] of Object.entries(MODULES)) {
    let now = 0, max = 0; const items = [];
    for (const t of m.types) {
      const def = TYPES[t]; if (!def || def.w === 0) continue; const st = ap.items[t]; if (st === 'na') { items.push({type:t, label:LABEL(t)||t, state:'na', points:0, max:0}); continue; }
      const x = byType[t]; const dw = DOMAINS.find(d=>d.id===def.dom).w / ws; const maxPts = x ? Math.round(dw * def.w / den[def.dom] * 1000 * 10) / 10 : 0;
      const pts = x ? Math.round(maxPts * x.score / 100 * 10) / 10 : 0;
      if (x) { now += pts; max += maxPts; }
      items.push({type:t, label:LABEL(t)||t, state:st, points:pts, max:maxPts, score: x ? x.score : null, tier: x ? x.level : null, count: x ? x.count : 0});
    }
    totalMax += max;
    out[id] = {id, name:m.name, emits:m.emits, points: Math.round(now), max: Math.round(max), share: 0, items: items.sort((a,b)=>(b.max-b.points)-(a.max-a.points)), gap: Math.round(max - now)};
  }
  for (const m of Object.values(out)) m.share = totalMax ? Math.round(m.max / totalMax * 100) : 0;
  return {rating: snapshot.score, band: snapshot.band, tier: snapshot.tier, caps: snapshot.caps, modules: out};
}
module.exports = {MODULES, contributions};
