/* Regenerates public/data/seed.json. "@-200d" = relative to today, resolved on load. */
const fs = require('fs'), path = require('path');
const R = require('../public/js/rules.js');
const d = n => '@' + n + 'd';
const P = (id, name, roles, site, manager, start, email, extra) => ({ id, name, roles, site, manager, start, email: email || (name.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') + '@northfield.example'), status: 'Active', end: '', extra: extra || [], external: false, hist: [{ t: start + 'T09:00', by: 'S. Ahmed', what: 'Added to the matrix' }] });
const people = [
  P('p01', 'S. Ahmed', ['manager', 'inspector'], 'Northfield Works', '', d(-2000), 's.ahmed@northfield.example'),
  P('p02', 'M. Grant', ['manager', 'operator', 'crane', 'yard'], 'Northfield Works', 'S. Ahmed', d(-3000)),
  P('p03', 'D. Brooks', ['crane', 'flt-driver', 'operator'], 'Northfield Works', 'M. Grant', d(-1500)),
  P('p04', 'T. Begum', ['welder', 'operator', 'press-brake-op'], 'Northfield Works', 'M. Grant', d(-700)),
  P('p05', 'J. Lee', ['inspector', 'first-aider'], 'Northfield Works', 'S. Ahmed', d(-1200)),
  P('p06', 'R. Osei', ['driver', 'operator'], 'Leeds depot', 'M. Grant', d(-900)),
  P('p07', 'L. Grant', ['operator', 'cnc-op'], 'Northfield Works', 'M. Grant', d(-400)),
  P('p08', 'A. Novak', ['welder', 'operator'], 'Northfield Works', 'M. Grant', d(-250)),
  P('p09', 'P. Shah', [], 'Northfield Works', 'S. Ahmed', d(-3200), 'p.shah@northfield.example'),
  P('p10', 'K. Hale', ['competent-person', 'crane'], 'Northfield Works', 'M. Grant', d(-2600)),
  P('p11', 'E. Wood', ['cnc-op', 'operator'], 'Northfield Works', 'M. Grant', d(-9)),
  P('p12', 'C. Dyer', ['driver'], 'Leeds depot', 'M. Grant', d(-20)),
  P('p13', 'N. Patel', ['first-aider'], 'Leeds depot', 'M. Grant', d(-1800)),
  P('p14', 'G. Ford', ['operator'], 'Northfield Works', 'M. Grant', d(-5000)),
];
people[13].status = 'Leaver'; people[13].end = d(-30); people[13].hist.unshift({ t: d(-30) + 'T17:00', by: 'S. Ahmed', what: 'Marked as leaver · ' + d(-30) });
const rec = (pid, cid, days, ref, provider, result) => ({ id: R.uid(), personId: pid, cid, date: d(days), result: result || 'Pass', provider: provider || '', ref: ref || '', fileId: null, verifiedBy: 'S. Ahmed', note: '', t: d(days) + 'T10:00' });
const records = [];
const everyone = people.filter(p => p.status !== 'Leaver').map(p => p.id);
everyone.forEach((pid, i) => {
  const isNew = ['p11', 'p12'].includes(pid);
  if (!isNew) records.push(rec(pid, 'induction', -600 - i * 30, 'IND-' + pid, 'Internal'));
  if (!isNew && pid !== 'p09') records.push(rec(pid, 'hs-awareness', pid === 'p06' ? -1120 : -400 - i * 20, 'HS-' + pid, 'IOSH'));
  if (!isNew) records.push(rec(pid, 'fire', pid === 'p08' ? -380 : -200 - i * 10, 'FIRE-' + pid, 'Internal'));
  if (!isNew && pid !== 'p04') records.push(rec(pid, 'ig', -300 + i * 5, 'IG-' + pid, 'e-learning'));
  if (!isNew && !['p04', 'p07'].includes(pid)) records.push(rec(pid, 'gdpr', -340 + i * 3, 'GDPR-' + pid, 'e-learning'));
  ['pol-hs', 'pol-quality', 'pol-infosec'].forEach((c, j) => { if (!isNew && !(pid === 'p03' && c === 'pol-infosec') && !(pid === 'p06' && j > 0)) records.push(rec(pid, c, -(200 + j * 15 + i * 4), 'ack', 'Self-service')); });
});
records.push(rec('p02', 'manual-handling', -900, 'MH-2', 'RoSPA'), rec('p02', 'coshh', -700, 'CO-2', 'Internal'), rec('p02', 'measuring', -500, 'MEAS-2', 'Internal'), rec('p02', 'slinger', -1400, 'SL-2', 'LEEA'), rec('p02', 'crane-op', -1400, 'CR-2', 'LEEA'), rec('p02', 'env', -600, 'ENV-2', 'Internal'), rec('p02', 'internal-auditor', -1200, 'IA-2', 'BSI'));
records.push(rec('p01', 'internal-auditor', -1500, 'IA-1', 'BSI'), rec('p01', 'measuring', -800, 'MEAS-1', 'Calderdale'), rec('p01', 'first-aid', -1150, 'FAW-1', 'St John'));
records.push(rec('p03', 'slinger', -1700, 'SL-3', 'LEEA'), rec('p03', 'crane-op', -1700, 'CR-3', 'LEEA'), rec('p03', 'flt', -1120, 'FLT-3', 'RTITB'), rec('p03', 'manual-handling', -500, 'MH-3', 'Internal'), rec('p03', 'coshh', -500, 'CO-3', 'Internal'), rec('p03', 'measuring', -500, 'MEAS-3', 'Internal'));
records.push(rec('p04', 'coshh', -600, 'CO-4', 'Internal'), rec('p04', 'face-fit', -760, 'FF-4', '3M'), rec('p04', 'manual-handling', -600, 'MH-4', 'Internal'), rec('p04', 'measuring', -300, 'MEAS-4', 'Internal'), rec('p04', 'press-brake', -650, 'PB-4', 'Amada'));
records.push(rec('p05', 'measuring', -1000, 'MEAS-5', 'Calderdale'), rec('p05', 'first-aid', -1050, 'FAW-5', 'St John'), rec('p05', 'internal-auditor', -400, 'IA-5', 'BSI'));
records.push(rec('p06', 'driver', -380, 'LIC-6', 'DVLA check'), rec('p06', 'manual-handling', -200, 'MH-6', 'Internal'), rec('p06', 'coshh', -200, 'CO-6', 'Internal'), rec('p06', 'measuring', -200, 'MEAS-6', 'Internal'));
records.push(rec('p07', 'cnc', -350, 'CNC-7', 'Haas'), rec('p07', 'manual-handling', -350, 'MH-7', 'Internal'), rec('p07', 'coshh', -350, 'CO-7', 'Internal'));
records.push(rec('p08', 'coshh', -230, 'CO-8', 'Internal'), rec('p08', 'face-fit', -230, 'FF-8', '3M'), rec('p08', 'manual-handling', -230, 'MH-8', 'Internal'), rec('p08', 'measuring', -100, 'MEAS-8', 'Internal'));
records.push(rec('p10', 'competent-insp', -1050, 'LEEA-10', 'LEEA'), rec('p10', 'slinger', -1050, 'SL-10', 'LEEA'), rec('p10', 'crane-op', -1050, 'CR-10', 'LEEA'));
records.push(rec('p11', 'cnc', -5, 'CNC-11', 'Haas'));
records.push(rec('p12', 'induction', -18, 'IND-12', 'Internal'), rec('p12', 'driver', -18, 'LIC-12', 'DVLA check'));
records.push(rec('p13', 'first-aid', -1000, 'FAW-13', 'St John'));
const competencies = R.DEFAULT_COMPETENCIES.map(c => Object.assign({}, c));
competencies.find(c => c.id === 'pol-hs').quiz = [{ q: 'Who must you report a near miss to?', opts: ['Your line manager, the same day', 'HR, at the end of the month', 'Nobody if nobody was hurt'], a: 0 }, { q: 'Hearing protection is mandatory in…', opts: ['Reception', 'Bay 1 and Bay 2', 'The car park'], a: 1 }, { q: 'Can you remove a machine guard to clear a jam?', opts: ['Yes, if quick', 'Only after isolating and locking off', 'Only on Fridays'], a: 1 }];
competencies.find(c => c.id === 'pol-infosec').quiz = [{ q: 'A USB stick found in the car park should be…', opts: ['Plugged in to find the owner', 'Handed to IT unopened', 'Thrown away'], a: 1 }, { q: 'Report a suspected phishing email…', opts: ['Within one hour', 'Next week', 'Never'], a: 0 }];
competencies.find(c => c.id === 'pol-quality').quiz = [{ q: 'If a part fails inspection you should…', opts: ['Ship it anyway', 'Quarantine it and raise an NCR', 'Hide it'], a: 1 }];
const sessions = [{ id: 'ses1', cid: 'fire', date: d(21), provider: 'Internal · M. Grant', attendees: ['p08', 'p11', 'p12'], cost: 0, status: 'Planned', by: 'S. Ahmed', note: 'Annual refresher + new starters' }];
competencies.forEach(c => { c.custom = false; c.archived = false; });
const settings = Object.assign({}, R.DEFAULT_SETTINGS, { leadDays: 60, inductionDays: 14, siteLabel: 'Site', sites: ['Northfield Works', 'Leeds depot'], providers: ['Internal', 'IOSH', 'RTITB', 'LEEA', 'St John Ambulance', 'BSI'] });
sessions[0].time = '09:00'; sessions[0].duration = 90; sessions[0].location = 'Canteen, Northfield Works'; sessions[0].materials = []; sessions[0].outputs = []; sessions[0].invites = [];
const seed = { org: 'Northfield Engineering Ltd', settings, competencies, roles: R.DEFAULT_ROLES, people, records, sessions, log: [] };
const out = path.join(__dirname, '..', 'public', 'data', 'seed.json'); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(seed, null, 1)); console.log('wrote', out, people.length, 'people', records.length, 'records');
