'use strict';
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
