
var __mods={}, __cache={}; var process={env:{}};
function __norm(from,p){ if(!p.startsWith('.')) return p; var parts=(from.split('/').slice(0,-1).join('/')+'/'+p).split('/'), out=[]; for(var s of parts){ if(s==='..') out.pop(); else if(s!=='.' && s!=='') out.push(s);} return out.join('/').replace(/\.js$/,''); }
function __require(from,p){ var id=__norm(from,p); if(__cache[id]) return __cache[id].exports; if(!__mods[id]) throw new Error('module '+id+' ('+p+' from '+from+')'); var m={exports:{}}; __cache[id]=m; __mods[id](m, m.exports, function(q){ return __require(id+'.js', q); }); return m.exports; }
// ---- crypto shim (sync SHA-256, HMAC, random)
function __sha256(msg){ var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; var b=msg instanceof Uint8Array?msg:new TextEncoder().encode(String(msg)); var l=b.length; var L=((l+9+63)>>6)<<6; var p=new Uint8Array(L); p.set(b); p[l]=0x80; var dv=new DataView(p.buffer); dv.setUint32(L-4,(l*8)>>>0); dv.setUint32(L-8,Math.floor(l*8/4294967296)); var w=new Uint32Array(64);
 for(var i=0;i<L;i+=64){ for(var t=0;t<16;t++) w[t]=dv.getUint32(i+t*4); for(t=16;t<64;t++){ var s0=((w[t-15]>>>7)|(w[t-15]<<25))^((w[t-15]>>>18)|(w[t-15]<<14))^(w[t-15]>>>3); var s1=((w[t-2]>>>17)|(w[t-2]<<15))^((w[t-2]>>>19)|(w[t-2]<<13))^(w[t-2]>>>10); w[t]=(w[t-16]+s0+w[t-7]+s1)>>>0; }
  var a=H[0],bb=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7]; for(t=0;t<64;t++){ var S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); var ch=(e&f)^(~e&g); var t1=(h+S1+ch+K[t]+w[t])>>>0; var S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); var mj=(a&bb)^(a&c)^(bb&c); var t2=(S0+mj)>>>0; h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=bb;bb=a;a=(t1+t2)>>>0; }
  H[0]=(H[0]+a)>>>0;H[1]=(H[1]+bb)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0; }
 var out=new Uint8Array(32); for(i=0;i<8;i++){ out[i*4]=H[i]>>>24; out[i*4+1]=(H[i]>>>16)&255; out[i*4+2]=(H[i]>>>8)&255; out[i*4+3]=H[i]&255; } return out; }
function __hex(u){ return Array.from(u).map(function(x){return x.toString(16).padStart(2,'0');}).join(''); }
function __b64url(u){ var s=''; for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function __enc(x){ return x instanceof Uint8Array?x:new TextEncoder().encode(String(x)); }
function __digester(fn){ var parts=[]; var o={update:function(x){ parts.push(__enc(x)); return o; }, digest:function(enc){ var n=parts.reduce(function(a,p){return a+p.length;},0), all=new Uint8Array(n), off=0; parts.forEach(function(p){ all.set(p,off); off+=p.length; }); var d=fn(all); return enc==='hex'?__hex(d):enc==='base64url'?__b64url(d):d; }}; return o; }
function __hmac(key,msg){ var k=__enc(key); if(k.length>64) k=__sha256(k); var kp=new Uint8Array(64); kp.set(k); var ipad=new Uint8Array(64+msg.length), opad=new Uint8Array(64+32); for(var i=0;i<64;i++){ ipad[i]=kp[i]^0x36; opad[i]=kp[i]^0x5c; } ipad.set(msg,64); opad.set(__sha256(ipad),64); return __sha256(opad); }
var __crypto={ createHash:function(){ return __digester(__sha256); }, createHmac:function(alg,key){ return __digester(function(m){ return __hmac(key,m); }); }, randomBytes:function(n){ var u=new Uint8Array(n); crypto.getRandomValues(u); return {toString:function(enc){ return enc==='hex'?__hex(u):__b64url(u); }}; }, randomInt:function(a,b){ if(b==null){b=a;a=0;} var u=new Uint32Array(1); crypto.getRandomValues(u); return a+(u[0]%(b-a)); }, timingSafeEqual:function(a,b){ a=__enc(a);b=__enc(b); if(a.length!==b.length) return false; var r=0; for(var i=0;i<a.length;i++) r|=a[i]^b[i]; return r===0; } };
var Buffer={ from:function(x){ var u=__enc(x); return {toString:function(enc){ return enc==='base64url'?__b64url(u):enc==='base64'?btoa(String.fromCharCode.apply(null,u)):new TextDecoder().decode(u); }, length:u.length, __u:u}; } };
__mods['crypto']=function(m){ m.exports=__crypto; };

__mods["lib/scope"]=function(module,exports,require){

// Relyable Standard v1.1 §B2a — scope profiles and applicability. Pure.
const ATTRS = ['employs','sites','premises','contractor','vehicles','lifting','food','regulated','data'];
const ATTR_LABEL = {employs:'Employs staff',sites:'Works on client sites',premises:'Occupies premises',contractor:'Contractor / supply-chain work',vehicles:'Operates vehicles',lifting:'Lifting or pressure equipment',food:'Handles food',regulated:'Regulated activity',data:'Personal data at scale'};
const FAMILIES = ['construction','engineering','transport','facilities','care','food','hospitality','professional','security','education','charity','other'];

// SIC code prefix → sector family and default attribute flags (Tier 0 pre-fill)
const SIC_MAP = [
  [/^4[1-3]/, 'construction', {employs:1,sites:1,premises:0,contractor:1,vehicles:1,lifting:1}],
  [/^(2[4-9]|3[0-3])/, 'engineering', {employs:1,sites:0,premises:1,contractor:0,vehicles:0,lifting:1}],
  [/^(49|52|53)/, 'transport', {employs:1,sites:0,premises:1,contractor:0,vehicles:1,lifting:1,regulated:1}],
  [/^(81|80)/, 'facilities', {employs:1,sites:1,premises:0,contractor:1,vehicles:1}],
  [/^8[6-8]/, 'care', {employs:1,sites:0,premises:1,lifting:1,food:1,regulated:1,data:1}],
  [/^(10|11)/, 'food', {employs:1,premises:1,vehicles:1,lifting:1,food:1,regulated:1}],
  [/^5[5-6]/, 'hospitality', {employs:1,premises:1,food:1}],
  [/^(6[2-9]|7[0-4])/, 'professional', {employs:1,premises:1,data:1}],
  [/^85/, 'education', {employs:1,premises:1,regulated:1,data:1}],
  [/^(94|88)/, 'charity', {employs:1,premises:1}],
];
function fromSic(sics = []) {
  for (const code of sics) for (const [re, fam, attrs] of SIC_MAP) if (re.test(String(code))) return {family: fam, attrs: fill(attrs)};
  return {family:'other', attrs: fill({employs:1,premises:1})};
}
function fill(a){const o={};for(const k of ATTRS)o[k]=a[k]?1:0;return o;}
function sizeBand(employees){if(employees==null)return 'unknown';return employees<=10?'1-10':employees<=50?'11-50':employees<=250?'51-250':'251+';}

// Evidence taxonomy with applicability rules. state(attrs) → 'required'|'expected'|'optional'|'na'
const TYPES = {
  // Certification & accreditation
  'cert.iso45001': {dom:'cert', w:10, kind:'cert', rule:a=>a.contractor||a.lifting?'required':a.employs?'expected':'optional'},
  'cert.iso9001': {dom:'cert', w:7, kind:'cert', rule:a=>a.contractor||a.food||a.regulated?'expected':'optional'},
  'cert.iso14001': {dom:'cert', w:5, kind:'cert', rule:a=>a.contractor?'expected':'optional'},
  'cert.ssip': {dom:'cert', w:10, kind:'cert', rule:a=>a.contractor||a.sites?'required':'na'},
  'cert.regulator': {dom:'cert', w:8, kind:'cert', rule:a=>a.regulated?'required':'na'},
  'cert.cyberessentials': {dom:'infosec', w:6, kind:'cert', rule:a=>a.data?'expected':'optional'},
  // People & competence
  'training.competence': {dom:'people', w:10, kind:'periodic', halfLife:30, rule:a=>a.employs?'required':'na'},
  'training.licence': {dom:'people', w:6, kind:'periodic', halfLife:30, rule:a=>a.lifting||a.vehicles?'required':'na'},
  'training.induction': {dom:'people', w:4, kind:'periodic', halfLife:30, rule:a=>a.employs?'expected':'na'},
  // Safety performance
  'safety.riddor': {dom:'safety', w:8, kind:'event', rule:a=>a.employs?'required':'na'},
  'safety.inspection': {dom:'safety', w:6, kind:'periodic', halfLife:30, rule:a=>a.premises||a.sites?'expected':'na'},
  'fire.risk.assessment': {dom:'safety', w:8, kind:'cert', rule:a=>a.premises?'required':'na'},
  'fire.test': {dom:'safety', w:4, kind:'periodic', halfLife:7, rule:a=>a.premises?'expected':'na'},
  'food.hygiene': {dom:'safety', w:8, kind:'cert', rule:a=>a.food?'required':'na'},
  // Assets & inspections
  'asset.loler': {dom:'assets', w:8, kind:'cert', rule:a=>a.lifting?'required':'na'},
  'asset.puwer': {dom:'assets', w:5, kind:'periodic', halfLife:180, rule:a=>a.lifting||a.premises?'expected':'na'},
  'fleet.olicence': {dom:'assets', w:6, kind:'cert', rule:a=>a.vehicles?'required':'na'},
  'fleet.driver.checks': {dom:'assets', w:5, kind:'periodic', halfLife:90, rule:a=>a.vehicles?'required':'na'},
  'asset.calibration': {dom:'assets', w:3, kind:'cert', rule:a=>'optional'},
  // Policies & governance
  'policy.hs': {dom:'gov', w:8, kind:'cert', rule:a=>a.employs?'required':'expected'},
  'policy.review': {dom:'gov', w:5, kind:'periodic', halfLife:365, rule:a=>'expected'},
  'policy.ack': {dom:'gov', w:4, kind:'periodic', halfLife:365, rule:a=>a.employs?'expected':'na'},
  'gov.management.review': {dom:'gov', w:3, kind:'periodic', halfLife:365, rule:a=>'optional'},
  // Supply chain
  'supplier.approved': {dom:'supply', w:6, kind:'periodic', halfLife:365, rule:a=>a.contractor||a.food||a.lifting||a.sites?'required':'na'},
  'supplier.modern-slavery': {dom:'supply', w:4, kind:'cert', rule:a=>a.contractor||a.food?'expected':'optional'},
  // Financial & insurance
  'fin.accounts': {dom:'fin', w:6, kind:'public', core:true, rule:a=>'required'},
  'fin.insurance.el': {dom:'fin', w:8, kind:'cert', core:true, rule:a=>a.employs?'required':'na'},
  'fin.insurance.pl': {dom:'fin', w:5, kind:'cert', rule:a=>a.sites||a.contractor||a.premises?'required':'expected'},
  // Information security
  'infosec.mfa': {dom:'infosec', w:4, kind:'periodic', halfLife:90, rule:a=>'expected'},
  'infosec.dpo': {dom:'infosec', w:3, kind:'cert', rule:a=>a.data?'expected':'optional'},
  // Public-record risk indicators (core, never switchable; adverse drives caps)
  'register.companies-house': {dom:'fin', w:0, kind:'public', core:true, rule:a=>'required'},
  'register.directors': {dom:'gov', w:0, kind:'public', core:true, rule:a=>'required'},
  'register.gazette': {dom:'fin', w:0, kind:'public', core:true, rule:a=>'required'},
  'register.hse': {dom:'safety', w:0, kind:'public', core:true, rule:a=>'required'},
};
const DOMAINS = [
  {id:'cert',name:'Certification & accreditation',w:20},{id:'people',name:'People & competence',w:15},{id:'safety',name:'Safety performance',w:15},{id:'assets',name:'Assets & inspections',w:15},{id:'gov',name:'Policies & governance',w:10},{id:'supply',name:'Supply chain',w:10},{id:'fin',name:'Financial & insurance',w:10},{id:'infosec',name:'Information security',w:5}];

function applicability(scope) {
  const a = scope.attrs || fill({});
  const items = {};
  for (const [t, def] of Object.entries(TYPES)) items[t] = def.core && def.rule(a) === 'required' ? 'required' : def.rule(a);
  const domains = {};
  for (const d of DOMAINS) {
    const scored = Object.entries(TYPES).filter(([t,def]) => def.dom===d.id && def.w>0 && (items[t]==='required'||items[t]==='expected'));
    domains[d.id] = scored.length > 0;
  }
  return {items, domains};
}
// Validate a scope declaration: core attrs cannot be turned off where public record says otherwise.
function checkDeclaration(declared, evidence /* public-record facts */) {
  const contradictions = [];
  const f = evidence || {};
  if (!declared.vehicles && (f.olicence || f.vehicleSic || f.vehicleRiddor)) contradictions.push({attr:'vehicles', reason: f.olicence?'O-licence on the Traffic Commissioner register':f.vehicleSic?'vehicle-related SIC code':'vehicle RIDDOR entry'});
  if (!declared.contractor && (f.ssip)) contradictions.push({attr:'contractor', reason:'SSIP membership on the public register'});
  if (!declared.employs && (f.employees > 0)) contradictions.push({attr:'employs', reason:`${f.employees} employees in filed accounts`});
  if (!declared.regulated && f.regulator) contradictions.push({attr:'regulated', reason:`${f.regulator} registration found`});
  return contradictions;
}
const LABEL = t => ({'cert.iso45001':'ISO 45001','cert.iso9001':'ISO 9001','cert.iso14001':'ISO 14001','cert.ssip':'SSIP','cert.regulator':'Regulator registration','cert.cyberessentials':'Cyber Essentials','training.competence':'Mandatory competencies in date','training.licence':'Licences (forklift, etc.)','training.induction':'Inductions','safety.riddor':'RIDDOR record','safety.inspection':'Safety inspections','fire.risk.assessment':'Fire risk assessment','fire.test':'Weekly fire test','food.hygiene':'Food hygiene','asset.loler':'LOLER examinations','asset.puwer':'PUWER inspections','fleet.olicence':'Operator licence','fleet.driver.checks':'Driver checks','asset.calibration':'Calibration','policy.hs':'Health and safety policy','policy.review':'Policy reviews','policy.ack':'Policy acknowledgements','gov.management.review':'Management review','supplier.approved':'Approved suppliers','supplier.modern-slavery':'Modern slavery statement','fin.accounts':'Accounts filed','fin.insurance.el':"Employers' liability insurance",'fin.insurance.pl':'Public liability insurance','infosec.mfa':'MFA coverage','infosec.dpo':'Data protection officer','register.companies-house':'Companies House status','register.directors':'Director disqualifications','register.gazette':'Gazette notices','register.hse':'HSE enforcement'})[t] || t;
module.exports = {LABEL, ATTRS, ATTR_LABEL, FAMILIES, TYPES, DOMAINS, fromSic, fill, sizeBand, applicability, checkDeclaration};

};
__mods["lib/ledger"]=function(module,exports,require){

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

};
__mods["lib/score"]=function(module,exports,require){

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

};
__mods["lib/store"]=function(module,exports,require){

const fs = typeof window === 'undefined' ? require('fs') : null;
function open(file) {
  let data = {};
  if (file && fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const defaults = {organisations:[], links:[], evidence:[], claims:[], members:[], users:[], audit:[], keys:[], reports:[], subscriptions:[], portfolios:[], submissions:[], disputes:[], notifications:[], outbox:[], snapshots:[], idv:[]};
  for (const k of Object.keys(defaults)) data[k] = data[k] || defaults[k];
  let timer = null;
  data.save = () => { if (!file) return; clearTimeout(timer); timer = setTimeout(() => fs.writeFileSync(file, JSON.stringify(data, (k,v)=> k==='save'?undefined:v, 1)), 50); };
  return data;
}
module.exports = {open};

};
__mods["lib/registry"]=function(module,exports,require){

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

};
__mods["lib/identity"]=function(module,exports,require){

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

};
__mods["lib/reports"]=function(module,exports,require){

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

};
__mods["lib/ingest"]=function(module,exports,require){

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

};
__mods["lib/connectors/companies-house"]=function(module,exports,require){

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

};
__mods["lib/connectors/registers"]=function(module,exports,require){

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

};
__mods["lib/sdk"]=function(module,exports,require){

// Evidence SDK for iMS OS modules (and any connector). Server-side, inside the module's existing save path.
//   const evidence = require('relyable-sdk')({baseUrl, key: process.env.RLY_CONNECTOR_KEY});
//   await evidence.emit({type:'training.licence', subject:{kind:'person', id}, status:'valid', observedAt, validUntil, payload, level:3});
// The platform stamps tenant/org, source, hash, prevHash and publishes evidence.added. Idempotent on (org, type, subject, observedAt, source).
const http = typeof window === 'undefined' ? require('http') : null, https = typeof window === 'undefined' ? require('https') : null;
module.exports = function sdk({baseUrl, key, source = 'module:ims-os'}) {
  const u = new URL(baseUrl); const lib = u.protocol === 'https:' ? https : http;
  const call = (method, path, body) => new Promise((res, rej) => { const req = lib.request({hostname:u.hostname, port:u.port, path, method, headers:{'Content-Type':'application/json', Authorization:'Bearer '+key}}, r => { let b=''; r.on('data', d=>b+=d); r.on('end', ()=>{ try { const j = JSON.parse(b||'{}'); r.statusCode < 300 ? res(j) : rej(Object.assign(new Error(j.error||r.statusCode), {status:r.statusCode, body:j})); } catch(e){ rej(e); } }); }); req.on('error', rej); if (body) req.write(JSON.stringify(body)); req.end(); });
  return {
    emit: e => call('POST', '/v1/evidence', {...e, source: e.source || source}),
    emitMany: items => call('POST', '/v1/evidence/batch', {items: items.map(e => ({...e, source: e.source || source}))}),
    resolve: q => call('POST', '/v1/registry/resolve', q),
    link: l => call('POST', '/v1/registry/links', l),
    rating: orgId => call('GET', '/v1/ratings/' + orgId),
    nextRisks: orgId => call('GET', '/v1/ratings/' + orgId + '/next-risks'),
    whatIf: (orgId, type, level) => call('GET', `/v1/ratings/${orgId}/what-if?add=${type}&level=${level||3}`),
    report: (orgId, opts) => call('POST', '/v1/reports', {orgId, ...opts}),
  };
};

};
__mods["server/app"]=function(module,exports,require){

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

};
// ---- boot: in-page platform with localStorage persistence, fetch interceptor for /v1/*
(function(){
 var app = __require('server/app.js','./app'); // resolves to server/app
 var FIX = {
 "companies": [
  {
   "company_number": "04871234",
   "company_name": "NORTHFIELD ENGINEERING LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "25620",
    "33120"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 118,
   "_domains": [
    "northfield.co.uk"
   ],
   "_officers": [
    {
     "_id": "o1",
     "name": "WHITFIELD, Sarah",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1978,
      "month": 4
     },
     "appointed_on": "2012-01-01",
     "_email": "sarah.whitfield@northfield.co.uk"
    },
    {
     "_id": "o2",
     "name": "OKAFOR, James",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1971,
      "month": 11
     },
     "appointed_on": "2012-01-01"
    },
    {
     "_id": "o3",
     "name": "BENNETT, Priya",
     "officer_role": "secretary",
     "date_of_birth": {
      "year": 1985,
      "month": 2
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "07120443",
   "company_name": "CALDER VALLEY SCAFFOLDING LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "43991"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 34,
   "_domains": [
    "calder.co.uk"
   ],
   "_officers": [
    {
     "_id": "o4",
     "name": "HUGHES, Helen",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1985,
      "month": 11
     },
     "appointed_on": "2012-01-01"
    },
    {
     "_id": "o5",
     "name": "BENNETT, Sarah",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1989,
      "month": 12
     },
     "appointed_on": "2012-01-01"
    },
    {
     "_id": "o6",
     "name": "NOLAN, James",
     "officer_role": "secretary",
     "date_of_birth": {
      "year": 1977,
      "month": 7
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "09983321",
   "company_name": "BRIGHTWATER FACILITIES SERVICES LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "81100",
    "81210"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 160,
   "_domains": [
    "brightwater.co.uk"
   ],
   "_officers": [
    {
     "_id": "o7",
     "name": "CARR, Mark",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1969,
      "month": 5
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "05567710",
   "company_name": "RIDGEWAY HAULAGE LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "49410"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 92,
   "_domains": [
    "ridgeway.co.uk"
   ],
   "_officers": [
    {
     "_id": "o8",
     "name": "NOLAN, Helen",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1974,
      "month": 9
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "08341190",
   "company_name": "HARLAND CARE HOMES LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "87100"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 140,
   "_domains": [
    "harland.co.uk"
   ],
   "_officers": [
    {
     "_id": "o9",
     "name": "HUGHES, Tom",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1966,
      "month": 1
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "03211987",
   "company_name": "PENNINE FOOD GROUP LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "10850"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 310,
   "_domains": [
    "pennine.co.uk"
   ],
   "_officers": [
    {
     "_id": "o10",
     "name": "CARR, Priya",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1980,
      "month": 8
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "10452211",
   "company_name": "OAKFIELD ELECTRICAL CONTRACTORS LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "43210"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2026-11-04",
    "overdue": true,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 22,
   "_domains": [
    "oakfield.co.uk"
   ],
   "_officers": [
    {
     "_id": "o11",
     "name": "OKAFOR, Mark",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1983,
      "month": 3
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "06677201",
   "company_name": "SEVERNSIDE FABRICATIONS LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "25110"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 58,
   "_domains": [
    "severnside.co.uk"
   ],
   "_officers": [
    {
     "_id": "o12",
     "name": "WHITFIELD, Tom",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1975,
      "month": 6
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "11209934",
   "company_name": "WESTMOOR GROUNDWORKS LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "43120"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 40,
   "_domains": [
    "westmoor.co.uk"
   ],
   "_officers": [
    {
     "_id": "o13",
     "name": "BENNETT, James",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1979,
      "month": 10
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "09120087",
   "company_name": "LUNE VALLEY CLEANING LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "81210"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 75,
   "_domains": [
    "lunevalley.co.uk"
   ],
   "_officers": [
    {
     "_id": "o14",
     "name": "NOLAN, Priya",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1988,
      "month": 4
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "02998765",
   "company_name": "ALBION PRECISION LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "25620"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 64,
   "_domains": [
    "albion.co.uk"
   ],
   "_officers": [
    {
     "_id": "o15",
     "name": "HUGHES, Sarah",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1972,
      "month": 12
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "12003311",
   "company_name": "KESTREL SECURITY SERVICES LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "80100"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 130,
   "_domains": [
    "kestrel.co.uk"
   ],
   "_officers": [
    {
     "_id": "o16",
     "name": "CARR, James",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1981,
      "month": 7
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  },
  {
   "company_number": "07765512",
   "company_name": "THORNBURY CHARTERED ACCOUNTANTS LTD",
   "company_status": "active",
   "jurisdiction": "england-wales",
   "date_of_creation": "2009-03-12",
   "sic_codes": [
    "69201"
   ],
   "registered_office_address": {
    "address_line_1": "Unit 4, Northfield Business Park",
    "locality": "Leeds",
    "postal_code": "LS12 6AB"
   },
   "accounts": {
    "next_due": "2027-06-12",
    "overdue": false,
    "last_accounts": {
     "made_up_to": "2026-07-27"
    }
   },
   "confirmation_statement": {
    "next_due": "2027-04-23",
    "overdue": false
   },
   "has_insolvency_history": false,
   "has_charges": false,
   "_employees": 18,
   "_domains": [
    "thornbury.co.uk"
   ],
   "_officers": [
    {
     "_id": "o17",
     "name": "OKAFOR, Helen",
     "officer_role": "director",
     "date_of_birth": {
      "year": 1976,
      "month": 2
     },
     "appointed_on": "2012-01-01"
    }
   ],
   "_disqualified": []
  }
 ],
 "registers": {
  "hse": {
   "10452211": {
    "notices": [
     {
      "type": "Improvement",
      "served": "2026-09-05",
      "description": "Work at height: inadequate edge protection",
      "ref": "IN/2026/0417"
     }
    ],
    "confirmed": true
   }
  },
  "gazette": {},
  "directors": {},
  "ssip": {
   "04871234": {
    "scheme": "SafeContractor",
    "ref": "SC-48712",
    "issued": "2026-05-08",
    "expires": "2027-05-08"
   },
   "07120443": {
    "scheme": "CHAS",
    "ref": "CHAS-71204",
    "issued": "2026-01-28",
    "expires": "2026-11-19"
   },
   "09983321": {
    "scheme": "SafeContractor",
    "ref": "SC-99833",
    "issued": "2026-08-16",
    "expires": "2027-08-16"
   }
  },
  "iaf": {
   "04871234": {
    "certificates": [
     {
      "standard": "ISO 45001",
      "cb": "BSI",
      "ref": "OHS 712345",
      "issued": "2025-10-20",
      "expires": "2027-10-10",
      "status": "valid"
     },
     {
      "standard": "ISO 9001",
      "cb": "BSI",
      "ref": "FS 612345",
      "issued": "2024-12-24",
      "expires": "2026-12-14",
      "status": "valid"
     },
     {
      "standard": "ISO 14001",
      "cb": "BSI",
      "ref": "EMS 512345",
      "issued": "2025-10-20",
      "expires": "2027-10-10",
      "status": "valid"
     }
    ]
   },
   "03211987": {
    "certificates": [
     {
      "standard": "ISO 9001",
      "cb": "NQA",
      "ref": "NQA-32119",
      "issued": "2026-05-08",
      "expires": "2028-04-07",
      "status": "valid"
     }
    ]
   },
   "02998765": {
    "certificates": [
     {
      "standard": "ISO 9001",
      "cb": "LRQA",
      "ref": "LRQ-29987",
      "issued": "2026-08-16",
      "expires": "2028-07-16",
      "status": "valid"
     }
    ]
   }
  },
  "regulator": {
   "12003311": {
    "regulator": "SIA",
    "ref": "ACS-12003",
    "status": "registered"
   },
   "05567710": {
    "regulator": "Traffic Commissioner",
    "ref": "OB1234567",
    "status": "registered"
   },
   "08341190": {
    "regulator": "CQC",
    "ref": "1-123456789",
    "status": "registered"
   },
   "03211987": {
    "regulator": "FSA",
    "ref": "FHRS 5",
    "status": "registered"
   },
   "07765512": {
    "regulator": "ICAEW",
    "ref": "C001234567",
    "status": "registered"
   }
  }
 }
};
 var KEY='relyable-store-v1'; var saved=null; try{ saved=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
 var a = app.build({fixtures: FIX}); if (saved) { for (var k in saved) if (k!=='save') a.store[k]=saved[k]; }
 a.store.save = function(){ try{ var o={}; for (var k in a.store) if (k!=='save') o[k]=a.store[k]; localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} };
 var ready = app.seed(a).then(function(){ a.store.save(); });
 var realFetch = window.fetch.bind(window);
 window.fetch = function(url, opts){ opts=opts||{}; var u=String(url); if(!u.startsWith('/v1/')) return realFetch(url, opts);
  return ready.then(function(){ var body=null; try{ body = opts.body? JSON.parse(opts.body): {}; }catch(e){ body={}; }
   return a.dispatch({method: opts.method||'GET', path:u, headers: Object.fromEntries(Object.entries(opts.headers||{}).map(function(e){return [e[0].toLowerCase(), e[1]];})), body: body, remoteAddress:'browser'}); })
   .then(function(r){ a.store.save(); return new Response(JSON.stringify(r.body), {status:r.status, headers:{'Content-Type':'application/json'}}); }); };
 window.__relyableReset = function(){ localStorage.removeItem(KEY); location.reload(); };
 window.__relyable = a;
})();