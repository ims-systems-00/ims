'use strict';
// Relyable score engine — pure function of (scope, evidence items, now). Standard v1.1 §B2, B2a, B4, B5.
const {TYPES, DOMAINS, applicability} = require('./scope');
const MODEL = '2026.11';
const BANDS = [['A',850,'Assured'],['B',700,'Strong'],['C',550,'Developing'],['D',400,'At risk'],['E',0,'Unverified']];
const VF = {3:1.0, 2:0.85, 1:0.6, 0:0.85}; // Tier 0 register facts count as Tier 2 for the fact they attest
const DAY = 864e5;
const band = s => BANDS.find(b => s >= b[1]);

function validity(def, e, now) {
  if (e.status === 'fail' || e.status === 'expired' || e.status === 'adverse') return 0;
  if (e.validUntil && new Date(e.validUntil) < now) return 0;
  let v = 1;
  if (def.kind === 'periodic') {
    const age = (now - new Date(e.observedAt)) / DAY, h = def.halfLife || 30;
    v = age <= h ? 1 : Math.max(0, 1 - (age - h) / h);
  }
  if (e.status === 'partial') v *= e.payload && e.payload.total ? Math.max(0.25, (e.payload.ok || 0) / e.payload.total) : 0.5;
  return v;
}

function compute({scope, items, now = new Date(), facts = {}}) {
  const ap = applicability(scope);
  const byType = {}; for (const e of items) (byType[e.type] = byType[e.type] || []).push(e);
  const domains = {}; const explain = []; let wVerified = 0, wAll = 0; const missingRequired = [];
  for (const d of DOMAINS) {
    if (!ap.domains[d.id]) { domains[d.id] = null; continue; }
    let num = 0, den = 0;
    for (const [t, def] of Object.entries(TYPES)) {
      if (def.dom !== d.id || def.w === 0) continue;
      const st = ap.items[t]; if (st === 'na') continue;
      const es = byType[t] || [];
      let best = 0, lvl = null;
      for (const e of es) { const v = validity(def, e, now) * VF[e.level]; if (v > best) { best = v; lvl = e.level; } }
      if (st === 'optional' && !es.length) continue; // optional absent: out of denominator
      den += def.w; num += def.w * best;
      wAll += def.w; if (lvl != null && (lvl >= 2 || lvl === 0) && best > 0) wVerified += def.w; // Tier 0 register facts count as verified for the fact they attest
      if (st === 'required' && best === 0) missingRequired.push(t);
      explain.push({type:t, domain:d.id, state:st, weight:def.w, score:Math.round(best*100), level:lvl, count:es.length});
    }
    domains[d.id] = den ? Math.round(num / den * 100) : 0;
  }
  const appl = DOMAINS.filter(d => domains[d.id] != null); const ws = appl.reduce((a,d)=>a+d.w,0);
  let raw = Math.round(appl.reduce((s,d)=>s + d.w/ws*domains[d.id], 0) * 10);
  const verifiedRatio = wAll ? Math.round(wVerified / wAll * 100) : 0;
  const caps = []; let score = raw;
  const cap = (n, why) => { caps.push({limit:n, reason:why}); score = Math.min(score, n); };
  if (facts.accountsOverdue) cap(399, 'Accounts overdue at Companies House');
  if (facts.insolvency) cap(399, 'Insolvency or strike-off notice in The Gazette');
  if (facts.enforcement) cap(549, 'Open HSE enforcement notice or prosecution within 5 years');
  if (facts.disqualifiedDirector) cap(549, 'Disqualified director');
  if (missingRequired.length) cap(699, 'Missing or expired mandatory evidence: ' + missingRequired.join(', '));
  if (verifiedRatio < 50) cap(749, 'Verified-evidence ratio below 50%');
  if (facts.riddorOpen && domains.safety != null) { domains.safety = Math.min(domains.safety, 40); caps.push({limit:null, reason:'RIDDOR specified injury, investigation open: Safety domain ≤ 40 for 90 days'}); }
  // Tier: highest tier covering ≥ 50% of applicable weight
  const tierW = {0:0,1:0,2:0,3:0};
  for (const x of explain) if (x.level != null && x.score > 0) for (let l=0;l<=x.level;l++) tierW[l]+=x.weight;
  let tier = 0; for (const l of [3,2,1]) if (wAll && tierW[l]/wAll >= 0.5) { tier = l; break; }
  const b = band(score);
  return {score, raw, band:b[0], bandName:b[2], tier, verifiedRatio, domains, caps, applicability:ap, explain, modelVersion:MODEL, computedAt: now.toISOString()};
}

// What-if: add evidence of a type at a level → delta
function whatIf(args, type, level = 2) {
  const base = compute(args);
  const items = args.items.concat([{type, status:'valid', observedAt: args.now ? args.now.toISOString() : new Date().toISOString(), level, validUntil: null}]);
  const after = compute({...args, items});
  return {type, level, from: base.score, to: after.score, delta: after.score - base.score, afterCap: after.caps.length < base.caps.length};
}
function nextRisks({scope, items, now = new Date()}) {
  const out = [];
  for (const e of items) {
    const def = TYPES[e.type]; if (!def) continue;
    if (e.validUntil) { const d = Math.round((new Date(e.validUntil) - now)/DAY); if (d <= 90) out.push({type:e.type, in:d, what: d < 0 ? 'expired' : 'expires', validUntil:e.validUntil}); }
    else if (def.kind === 'periodic') { const age=(now-new Date(e.observedAt))/DAY; const left=Math.round((def.halfLife||30)-age); if (left<=14) out.push({type:e.type, in:left, what:'decays', halfLife:def.halfLife}); }
  }
  return out.sort((a,b)=>a.in-b.in);
}
function raiseIt(args) {
  const ap = applicability(args.scope); const have = new Set(args.items.filter(e=>e.status==='valid').map(e=>e.type));
  return Object.keys(TYPES).filter(t => TYPES[t].w>0 && ap.items[t] !== 'na' && !have.has(t)).map(t => whatIf(args, t, 2)).filter(w=>w.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,5);
}
module.exports = {compute, whatIf, nextRisks, raiseIt, band, BANDS, MODEL};
