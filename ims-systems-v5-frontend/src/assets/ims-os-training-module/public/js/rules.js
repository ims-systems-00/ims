/*  iMS OS · Training & Competency module · shared rules
 *  ----------------------------------------------------
 *  Pure functions, no DOM, no I/O. Browser: window.IMSTraining. Server: require('./rules').
 *  Model: { org, settings:{leadDays, inductionDays}, competencies:[], roles:[], people:[], records:[], sessions:[] }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IMSTraining = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const iso = d => { const x = d instanceof Date ? d : new Date(d); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
  const today = () => { const t = new Date(); return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); };
  const addMonths = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
  const daysUntil = (d, from) => Math.round((new Date(d) - (from || today())) / 864e5);
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  function err(code, message) { const e = new Error(message); e.code = code; return e; }

  const EVIDENCE = ['Certificate', 'Attendance record', 'Assessment', 'Acknowledgement', 'Licence / card', 'Observation'];
  const RESULTS = ['Pass', 'Pass with observations', 'Fail'];
  const STATUS = ['Active', 'Leaver', 'Pre-start'];

  /* ---------- competency catalogue defaults ----------
     id, name, months (0 = never expires), evidence, basis, covers:[equipment categories or policy ids] */
  const DEFAULT_COMPETENCIES = [
    { id: 'induction', name: 'Company induction', months: 0, evidence: 'Attendance record', basis: 'ISO 9001 7.2 · 45001 7.3', covers: [] },
    { id: 'hs-awareness', name: 'H&S awareness', months: 36, evidence: 'Certificate', basis: 'HSWA 1974 s.2 · ISO 45001 7.2', covers: [] },
    { id: 'fire', name: 'Fire safety & evacuation', months: 12, evidence: 'Attendance record', basis: 'RRFSO 2005 art. 21', covers: [] },
    { id: 'manual-handling', name: 'Manual handling', months: 36, evidence: 'Certificate', basis: 'MHOR 1992 reg 4', covers: [] },
    { id: 'first-aid', name: 'First aid at work', months: 36, evidence: 'Certificate', basis: 'First Aid Regs 1981', covers: [] },
    { id: 'coshh', name: 'COSHH awareness', months: 36, evidence: 'Certificate', basis: 'COSHH 2002 reg 12', covers: [] },
    { id: 'face-fit', name: 'RPE face-fit test', months: 24, evidence: 'Certificate', basis: 'COSHH reg 7 · HSE INDG479', covers: ['PPE & RPE'] },
    { id: 'slinger', name: 'Slinger / signaller', months: 60, evidence: 'Licence / card', basis: 'LOLER 1998 reg 8 · ACoP', covers: ['Lifting equipment'] },
    { id: 'crane-op', name: 'Overhead crane operator', months: 60, evidence: 'Licence / card', basis: 'LOLER 1998 reg 8 · PUWER reg 9', covers: ['Lifting equipment'] },
    { id: 'flt', name: 'Forklift (counterbalance)', months: 36, evidence: 'Licence / card', basis: 'PUWER reg 9 · L117', covers: ['Lifting equipment', 'Vehicles'] },
    { id: 'press-brake', name: 'Press brake operation', months: 0, evidence: 'Assessment', basis: 'PUWER reg 9', covers: ['Production machinery'] },
    { id: 'cnc', name: 'CNC machining centre', months: 0, evidence: 'Assessment', basis: 'PUWER reg 9 · ISO 9001 7.2', covers: ['Production machinery'] },
    { id: 'measuring', name: 'Measuring equipment & calibration awareness', months: 36, evidence: 'Assessment', basis: 'ISO 9001 7.1.5 / 7.2', covers: ['Measuring & test equipment'] },
    { id: 'competent-insp', name: 'Competent person · lifting equipment examination', months: 36, evidence: 'Certificate', basis: 'LOLER reg 9 · LEEA', covers: ['Lifting equipment'] },
    { id: 'driver', name: 'Driving licence check', months: 12, evidence: 'Licence / card', basis: 'Road Traffic Act · FORS', covers: ['Vehicles'] },
    { id: 'ig', name: 'Information security awareness', months: 12, evidence: 'Assessment', basis: 'ISO 27001 A.6.3 · DSPT', covers: [] },
    { id: 'gdpr', name: 'Data protection (UK GDPR)', months: 12, evidence: 'Assessment', basis: 'UK GDPR art. 39 · ICO', covers: [] },
    { id: 'env', name: 'Environmental awareness & spill response', months: 36, evidence: 'Attendance record', basis: 'ISO 14001 7.2 / 7.3', covers: ['Environmental plant'] },
    { id: 'internal-auditor', name: 'Internal auditor', months: 0, evidence: 'Certificate', basis: 'ISO 9001 9.2 · ISO 19011', covers: [] },
    { id: 'pol-hs', name: 'Policy · Health & safety (read & understood)', months: 12, evidence: 'Acknowledgement', basis: 'ISO 45001 5.2 / 7.3', covers: ['policy:hs'] },
    { id: 'pol-quality', name: 'Policy · Quality (read & understood)', months: 12, evidence: 'Acknowledgement', basis: 'ISO 9001 5.2 / 7.3', covers: ['policy:quality'] },
    { id: 'pol-infosec', name: 'Policy · Information security (read & understood)', months: 12, evidence: 'Acknowledgement', basis: 'ISO 27001 5.2 / A.5.1', covers: ['policy:infosec'] },
    { id: 'safeguarding', name: 'Safeguarding adults (L2)', months: 36, evidence: 'Certificate', basis: 'Care Act 2014 · CQC', covers: [] },
  ];
  /* ---------- role rules: what each role must hold. 'mandatory' decides RAG; 'desirable' shows as planned ---------- */
  const DEFAULT_ROLES = [
    { id: 'all', name: 'All staff', mandatory: ['induction', 'hs-awareness', 'fire', 'ig', 'gdpr', 'pol-hs', 'pol-quality', 'pol-infosec'], desirable: [] },
    { id: 'operator', name: 'Machine operator', mandatory: ['manual-handling', 'coshh', 'measuring'], desirable: ['first-aid'] },
    { id: 'press-brake-op', name: 'Press brake operator', mandatory: ['press-brake'], desirable: [] },
    { id: 'cnc-op', name: 'CNC operator', mandatory: ['cnc'], desirable: [] },
    { id: 'welder', name: 'Welder', mandatory: ['coshh', 'face-fit', 'manual-handling'], desirable: [] },
    { id: 'crane', name: 'Crane user', mandatory: ['slinger', 'crane-op'], desirable: [] },
    { id: 'flt-driver', name: 'Forklift driver', mandatory: ['flt'], desirable: [] },
    { id: 'driver', name: 'Driver', mandatory: ['driver'], desirable: [] },
    { id: 'inspector', name: 'Quality inspector', mandatory: ['measuring'], desirable: ['internal-auditor'] },
    { id: 'competent-person', name: 'Competent person · lifting', mandatory: ['competent-insp', 'slinger'], desirable: [] },
    { id: 'manager', name: 'Manager', mandatory: ['internal-auditor'], desirable: ['first-aid'] },
    { id: 'first-aider', name: 'Appointed first aider', mandatory: ['first-aid'], desirable: [] },
    { id: 'yard', name: 'Yard & environmental', mandatory: ['env'], desirable: [] },
  ];

  const byId = (arr, id) => (arr || []).find(x => x.id === id);
  const activePeople = M => (M.people || []).filter(p => p.status !== 'Leaver');

  /* ---------- requirements for a person = union over their roles ---------- */
  function requirements(M, person) {
    const out = new Map();
    const roles = ['all', ...(person.roles || [])];
    roles.forEach(rid => { const r = byId(M.roles, rid); if (!r) return; (r.mandatory || []).forEach(c => out.set(c, 'mandatory')); (r.desirable || []).forEach(c => { if (!out.has(c)) out.set(c, 'desirable'); }); });
    (person.extra || []).forEach(c => { if (!out.has(c)) out.set(c, 'mandatory'); });
    const ex = new Map((person.exempt || []).map(e => [e.cid, e]));
    return [...out.entries()].map(([cid, level]) => ({ cid, level: ex.has(cid) ? 'exempt' : level, exempt: ex.get(cid) || null, comp: byId(M.competencies, cid) })).filter(x => x.comp && !x.comp.archived);
  }
  function latestRecord(M, personId, cid) { return (M.records || []).filter(r => r.personId === personId && r.cid === cid && r.result !== 'Fail').sort((a, b) => a.date < b.date ? 1 : -1)[0] || null; }

  /* ---------- status of one requirement ---------- */
  function cell(M, person, req, now) {
    now = now || today(); const lead = (M.settings && M.settings.leadDays) || 60; const rec = latestRecord(M, person.id, req.cid);
    if (req.level === 'exempt') return { st: 'na', rec, next: null, days: null, reason: req.exempt && req.exempt.reason };
    if (!rec) { const inStart = person.start && daysUntil(person.start, now) > -((M.settings && M.settings.inductionDays) || 14); return { st: inStart ? 'grace' : 'none', rec: null, next: null, days: null }; }
    const expires = req.comp.months ? iso(addMonths(new Date(rec.date), req.comp.months)) : null;
    const d = expires ? daysUntil(expires, now) : null;
    const st = !expires ? 'ok' : d < 0 ? 'over' : d <= lead ? 'soon' : 'ok';
    return { st, rec, next: expires, days: d };
  }
  function matrixRow(M, person, now) { return requirements(M, person).map(req => Object.assign({ req }, cell(M, person, req, now))); }

  /* ---------- gaps across the org ---------- */
  const SEVERITY = { none: 0, over: 1, soon: 2, grace: 3 };
  function gaps(M, now) {
    const out = [];
    activePeople(M).forEach(p => matrixRow(M, p, now).forEach(c => { if (c.st !== 'ok' && c.req.level === 'mandatory') out.push({ person: p, comp: c.req.comp, st: c.st, next: c.next, days: c.days }); }));
    return out.sort((a, b) => SEVERITY[a.st] - SEVERITY[b.st] || ((a.next || '0') < (b.next || '0') ? -1 : 1));
  }
  function personSummary(M, person, now) { const row = matrixRow(M, person, now); const m = row.filter(c => c.req.level === 'mandatory'); return { total: m.length, ok: m.filter(c => c.st === 'ok').length, soon: m.filter(c => c.st === 'soon').length, over: m.filter(c => c.st === 'over').length, none: m.filter(c => c.st === 'none').length, grace: m.filter(c => c.st === 'grace').length, compliant: m.every(c => c.st === 'ok' || c.st === 'soon') }; }

  /* ---------- the question other modules ask ---------- */
  function isCompetent(M, personId, covers, now) {
    const p = byId(M.people, personId); if (!p || p.status === 'Leaver') return { ok: false, reason: 'not an active person' };
    const comps = (M.competencies || []).filter(c => (c.covers || []).includes(covers)); if (!comps.length) return { ok: true, reason: 'no competency defined for ' + covers };
    const held = comps.filter(c => { const r = latestRecord(M, personId, c.id); if (!r) return false; if (!c.months) return true; return daysUntil(iso(addMonths(new Date(r.date), c.months)), now) >= 0; });
    return held.length ? { ok: true, reason: 'holds ' + held.map(c => c.name).join(', '), competencies: held.map(c => c.id) } : { ok: false, reason: 'no valid ' + comps.map(c => c.name).join(' / '), required: comps.map(c => c.id) };
  }

  /* ---------- mutations ---------- */
  function validateRecord(M, input, now) {
    if (!byId(M.people, input.personId)) throw err('not_found', 'Person not found');
    const c = byId(M.competencies, input.cid); if (!c) throw err('invalid_competency', 'Unknown competency');
    if (!RESULTS.includes(input.result || 'Pass')) throw err('invalid_result', 'Result must be one of ' + RESULTS.join(', '));
    const date = input.date || iso(now || today()); if (new Date(date) > addDays(now || today(), 1)) throw err('invalid_date', 'Date cannot be in the future');
    if (c.evidence === 'Certificate' && !(input.ref || input.fileId) && input.result !== 'Fail') throw err('evidence_required', `${c.name} needs a certificate reference or upload`);
    return { date, comp: c };
  }
  function addRecord(M, input, by, now) {
    const { date } = validateRecord(M, input, now);
    const rec = { id: uid(), personId: input.personId, cid: input.cid, date, result: input.result || 'Pass', provider: input.provider || '', ref: input.ref || '', fileId: input.fileId || null, verifiedBy: by || '', note: input.note || '', t: (now || new Date()).toISOString().slice(0, 16) };
    M.records = M.records || []; M.records.unshift(rec);
    const p = byId(M.people, input.personId); history(p, `${byId(M.competencies, input.cid).name}: ${rec.result}${rec.ref ? ' · ' + rec.ref : ''}${rec.provider ? ' · ' + rec.provider : ''}`, by, now);
    return rec;
  }
  function acknowledgePolicy(M, personId, cid, answers, by, now) {
    const c = byId(M.competencies, cid); if (!c || c.evidence !== 'Acknowledgement') throw err('invalid_competency', 'Not an acknowledgement item');
    const q = c.quiz || []; const wrong = q.filter((x, i) => answers && answers[i] != null && answers[i] !== x.a).length;
    if (q.length && (!answers || answers.length < q.length)) throw err('quiz_required', 'Answer all questions');
    if (wrong) throw err('quiz_failed', `${wrong} answer(s) incorrect — read the policy again`);
    return addRecord(M, { personId, cid, result: 'Pass', ref: 'ack ' + iso(now || today()), provider: 'Self-service' }, by || byId(M.people, personId).name, now);
  }
  function history(p, what, by, now) { p.hist = p.hist || []; p.hist.unshift({ t: (now || new Date()).toISOString().slice(0, 16), by: by || 'system', what }); }
  function validatePerson(M, p) {
    const pr = [];
    if (!p.name || !p.name.trim()) pr.push('name is required');
    if (!STATUS.includes(p.status)) pr.push('status: unknown');
    if (!p.site) pr.push('site is required');
    (p.roles || []).forEach(r => { if (!byId(M.roles, r)) pr.push('role: unknown ' + r); });
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) pr.push('email: invalid');
    return pr;
  }
  function setExemption(M, personId, cid, reason, by, now) {
    const p = byId(M.people, personId); if (!p) throw err('not_found', 'Person not found'); const c = byId(M.competencies, cid); if (!c) throw err('invalid_competency', 'Unknown competency');
    if (!reason || !reason.trim()) throw err('validation', 'A reason is required (the auditor will ask)');
    p.exempt = (p.exempt || []).filter(e => e.cid !== cid); p.exempt.push({ cid, reason: reason.trim(), by: by || '', date: iso(now || today()) });
    history(p, `Not applicable: ${c.name} — ${reason.trim()}`, by, now); return p;
  }
  function clearExemption(M, personId, cid, by, now) { const p = byId(M.people, personId); if (!p) throw err('not_found', 'Person not found'); const had = (p.exempt || []).some(e => e.cid === cid); p.exempt = (p.exempt || []).filter(e => e.cid !== cid); if (had) history(p, `${(byId(M.competencies, cid) || {}).name || cid} applies again`, by, now); return p; }
  function markLeaver(M, p, date, by, now) { p.status = 'Leaver'; p.end = date || iso(now || today()); history(p, 'Marked as leaver · ' + p.end, by, now); }
  function planSession(M, input, by, now) { return planSession2(M, input, by, now); }
  function completeSession(M, sessionId, outcomes, by, now) {
    const s = byId(M.sessions, sessionId); if (!s) throw err('not_found', 'Session not found'); const made = [];
    if (s.status === 'Cancelled') throw err('validation', 'Session was cancelled');
    s.attendees.forEach(pid => { const o = (outcomes && outcomes[pid]) || { result: 'Pass' }; if (o.result === 'Absent') { const p = byId(M.people, pid); if (p) history(p, `Did not attend: ${byId(M.competencies, s.cid).name} on ${s.date}`, by, now); return; } made.push(addRecord(M, { personId: pid, cid: s.cid, date: s.date, result: o.result || 'Pass', provider: s.provider, ref: o.ref || ('session ' + s.id), fileId: o.fileId || ((s.outputs || [])[0] || {}).fileId || null, note: o.note }, by, now)); });
    s.status = 'Completed'; s.completedBy = by; s.completedAt = iso(now || today()); return made;
  }

  /* ---------- reminders (daily job) ---------- */
  function remindersDue(M, now) {
    now = now || today(); const S = Object.assign({}, DEFAULT_SETTINGS, M.settings || {}); const out = [];
    (M.sessions || []).filter(s => s.status === 'Planned').forEach(s => { const d = daysUntil(s.date, now); if (S.reminderDays.includes(d)) s.attendees.forEach(pid => { const r = rsvpOf(s, pid); if (r !== 'declined') out.push({ kind: 'session', days: d, sessionId: s.id, personId: pid, rsvp: r }); }); });
    activePeople(M).forEach(p => matrixRow(M, p, now).forEach(c => { if (c.req.level !== 'mandatory') return; if (c.st === 'soon' && (c.days === S.leadDays || c.days === 14)) out.push({ kind: 'expiring', days: c.days, personId: p.id, cid: c.req.cid, manager: p.manager }); if (c.st === 'over' && c.days === -1) out.push({ kind: 'expired', days: -1, personId: p.id, cid: c.req.cid, manager: p.manager }); }));
    return out;
  }

  /* ---------- planning & readiness ---------- */
  function plan(M, months, now) {
    now = now || today(); const until = iso(addMonths(now, months || 3)); const need = {};
    activePeople(M).forEach(p => matrixRow(M, p, now).forEach(c => { if (c.req.level !== 'mandatory') return; if (c.st === 'none' || c.st === 'grace' || c.st === 'over' || (c.next && c.next <= until)) { const k = c.req.cid; need[k] = need[k] || { comp: c.req.comp, people: [], soonest: null }; need[k].people.push(p); if (!need[k].soonest || (c.next && c.next < need[k].soonest)) need[k].soonest = c.next || iso(now); } }));
    const booked = new Set((M.sessions || []).filter(s => s.status === 'Planned').flatMap(s => s.attendees.filter(pid => !(s.rsvp && s.rsvp[pid] && s.rsvp[pid].status === 'declined')).map(pid => s.cid + ':' + pid)));
    return Object.values(need).map(n => ({ comp: n.comp, people: n.people, soonest: n.soonest, unbooked: n.people.filter(p => !booked.has(n.comp.id + ':' + p.id)) })).sort((a, b) => (a.soonest || '0') < (b.soonest || '0') ? -1 : 1);
  }
  function readiness(M, now) {
    now = now || today(); const ppl = activePeople(M); const g = gaps(M, now);
    const starters = ppl.filter(p => p.start && daysUntil(p.start, now) < -((M.settings && M.settings.inductionDays) || 14));
    const inducted = starters.every(p => latestRecord(M, p.id, 'induction'));
    const certs = (M.records || []).filter(r => { const c = byId(M.competencies, r.cid); return c && c.evidence === 'Certificate' && r.result !== 'Fail'; });
    return [
      { id: 'roles', ok: (M.roles || []).length > 0 && ppl.every(p => (p.roles || []).length || true), text: 'Competence requirements are defined per role', basis: 'ISO 9001 7.2 a) · ISO 45001 7.2', tag: '7.2' },
      { id: 'records', ok: !g.some(x => x.st === 'none' && x.comp.evidence !== 'Acknowledgement'), text: 'Every active person holds the mandatory competencies for their roles', basis: `${g.filter(x => x.st === 'none').length} missing`, tag: '7.2' },
      { id: 'expiry', ok: !g.some(x => x.st === 'over'), text: 'No expired mandatory training in use', basis: `${g.filter(x => x.st === 'over').length} expired`, tag: '7.2' },
      { id: 'evidence', ok: certs.every(r => r.ref || r.fileId), text: 'Certificates are retained as evidence', basis: 'ISO 9001 7.2 d) · 7.5.3', tag: 'Records' },
      { id: 'induction', ok: inducted, text: 'New starters inducted within the induction window', basis: `${(M.settings && M.settings.inductionDays) || 14} days · ISO 45001 7.3`, tag: '7.3' },
      { id: 'policies', ok: ppl.every(p => matrixRow(M, p, now).filter(c => c.req.comp.evidence === 'Acknowledgement').every(c => c.st === 'ok' || c.st === 'soon' || c.st === 'grace' || c.st === 'na')), text: 'Policies acknowledged by all staff within the year', basis: 'ISO 9001 7.3 · 27001 A.5.1', tag: '7.3' },
      { id: 'equipment', ok: ppl.every(p => (p.roles || []).every(r => { const role = byId(M.roles, r); return !role || (role.mandatory || []).every(cid => { const c = byId(M.competencies, cid); if (!c || !c.covers.length || (p.exempt || []).some(e => e.cid === cid)) return true; const st = cell(M, p, { cid, level: 'mandatory', comp: c }, now).st; return st !== 'over' && st !== 'none'; }); })), text: 'Nobody assigned to controlled equipment without a valid competence', basis: 'PUWER reg 9 · LOLER reg 8', tag: '45001' },
      { id: 'leavers', ok: (M.people || []).filter(p => p.status === 'Leaver').every(p => p.end), text: 'Leavers dated and removed from the matrix', basis: 'ISO 27001 A.6.5', tag: '27001' },
      { id: 'plan', ok: plan(M, 3, now).every(n => n.unbooked.length === 0), text: 'Training due in the next 90 days is booked', basis: 'ISO 9001 7.2 b)', tag: '7.2' },
      { id: 'trail', ok: (M.people || []).every(p => p.hist && p.hist.length), text: 'Training actions logged with who, when and what', basis: 'Records · 7.5.3', tag: 'Records' },
    ];
  }

  /* ---------- tenant configuration: competencies, roles, settings ---------- */
  const slug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'item';
  function upsertCompetency(M, input, by, now) {
    const pr = [];
    if (!input.name || !input.name.trim()) pr.push('name is required');
    const months = Number(input.months); if (!(months >= 0 && months <= 240)) pr.push('renewal months must be 0–240 (0 = never expires)');
    if (!EVIDENCE.includes(input.evidence)) pr.push('evidence must be one of ' + EVIDENCE.join(', '));
    const quiz = Array.isArray(input.quiz) ? input.quiz : [];
    quiz.forEach((q, i) => { if (!q.q || !Array.isArray(q.opts) || q.opts.length < 2 || !(q.a >= 0 && q.a < q.opts.length)) pr.push(`question ${i + 1}: needs text, 2+ options and a correct answer`); });
    if (pr.length) throw err('validation', pr.join(' · '));
    M.competencies = M.competencies || [];
    let c = input.id ? byId(M.competencies, input.id) : null;
    const data = { name: input.name.trim(), months, evidence: input.evidence, basis: (input.basis || '').trim(), covers: (input.covers || []).map(x => String(x).trim()).filter(Boolean), quiz, description: (input.description || '').trim(), provider: (input.provider || '').trim(), archived: !!input.archived, custom: c ? c.custom !== false : true };
    if (c) { Object.assign(c, data); } else { let id = slug(input.name); while (byId(M.competencies, id)) id += '-' + Math.random().toString(36).slice(2, 5); c = Object.assign({ id }, data); M.competencies.push(c); }
    log(M, `${input.id ? 'Updated' : 'Added'} competency "${c.name}" (${c.months ? 'renews every ' + c.months + ' mo' : 'no expiry'}, ${c.evidence})`, by, now);
    return c;
  }
  function archiveCompetency(M, id, by, now) { const c = byId(M.competencies, id); if (!c) throw err('not_found', 'Competency not found'); c.archived = true; (M.roles || []).forEach(r => { r.mandatory = (r.mandatory || []).filter(x => x !== id); r.desirable = (r.desirable || []).filter(x => x !== id); }); log(M, `Archived competency "${c.name}" (records retained)`, by, now); return c; }
  function upsertRole(M, input, by, now) {
    if (!input.name || !input.name.trim()) throw err('validation', 'role name is required');
    const ids = new Set((M.competencies || []).map(c => c.id));
    const mand = (input.mandatory || []).filter(x => ids.has(x)), des = (input.desirable || []).filter(x => ids.has(x) && !mand.includes(x));
    M.roles = M.roles || []; let r = input.id ? byId(M.roles, input.id) : null;
    if (r) { Object.assign(r, { name: input.name.trim(), mandatory: mand, desirable: des, description: input.description || '' }); } else { let id = slug(input.name); while (byId(M.roles, id)) id += '-' + Math.random().toString(36).slice(2, 5); r = { id, name: input.name.trim(), mandatory: mand, desirable: des, description: input.description || '' }; M.roles.push(r); }
    log(M, `${input.id ? 'Updated' : 'Added'} role "${r.name}": ${mand.length} mandatory, ${des.length} desirable`, by, now); return r;
  }
  function removeRole(M, id, by, now) { if (id === 'all') throw err('validation', 'The "All staff" role cannot be removed'); const r = byId(M.roles, id); if (!r) throw err('not_found', 'Role not found'); M.roles = M.roles.filter(x => x.id !== id); (M.people || []).forEach(p => { p.roles = (p.roles || []).filter(x => x !== id); }); log(M, `Removed role "${r.name}"`, by, now); }
  const DEFAULT_SETTINGS = { leadDays: 60, inductionDays: 14, siteLabel: 'Site', sites: [], requireVerification: true, allowSelfUpload: true, selfTokenDays: 90, providers: [], inviteSubject: '{{course}} · {{date}} · {{org}}', inviteBody: 'Hello {{name}},\n\nYou are invited to {{course}} on {{date}}{{time}}{{location}}.\n{{materials}}\nPlease let us know whether you can attend:\n  Accept:  {{accept}}\n  Decline: {{decline}}\n\n{{org}} · Training & competency' , organiserEmail: 'training@ims-os.example', reminderDays: [14, 1] };
  function updateSettings(M, input, by, now) {
    const S = Object.assign({}, DEFAULT_SETTINGS, M.settings || {}); const pr = [];
    if (input.leadDays != null) { const v = Number(input.leadDays); if (!(v >= 0 && v <= 365)) pr.push('leadDays 0–365'); else S.leadDays = v; }
    if (input.inductionDays != null) { const v = Number(input.inductionDays); if (!(v >= 0 && v <= 90)) pr.push('inductionDays 0–90'); else S.inductionDays = v; }
    if (input.selfTokenDays != null) { const v = Number(input.selfTokenDays); if (!(v >= 1 && v <= 365)) pr.push('selfTokenDays 1–365'); else S.selfTokenDays = v; }
    ['siteLabel', 'inviteSubject', 'inviteBody', 'org', 'organiserEmail'].forEach(k => { if (typeof input[k] === 'string') S[k] = input[k]; });
    ['requireVerification', 'allowSelfUpload'].forEach(k => { if (typeof input[k] === 'boolean') S[k] = input[k]; });
    ['sites', 'providers'].forEach(k => { if (Array.isArray(input[k])) S[k] = input[k].map(x => String(x).trim()).filter(Boolean); });
    if (Array.isArray(input.reminderDays)) S.reminderDays = input.reminderDays.map(Number).filter(n => n >= 0 && n <= 90);
    if (pr.length) throw err('validation', pr.join(' · '));
    if (S.org) { M.org = S.org; delete S.org; }
    M.settings = S; log(M, 'Settings updated: ' + Object.keys(input).join(', '), by, now); return S;
  }
  function log(M, what, by, now) { M.log = M.log || []; M.log.unshift({ t: (now || new Date()).toISOString().slice(0, 16), by: by || 'system', what }); if (M.log.length > 500) M.log.length = 500; }

  /* ---------- people: external attendees ---------- */
  function addExternal(M, input, by, now) {
    if (!input.name || !input.name.trim()) throw err('validation', 'name is required');
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw err('validation', 'a valid email is required for external people');
    let p = (M.people || []).find(x => x.external && x.email && x.email.toLowerCase() === input.email.toLowerCase());
    if (p) return p;
    p = { id: uid(), name: input.name.trim(), email: input.email.trim(), roles: [], site: input.company || 'External', manager: '', start: '', status: 'Active', end: '', extra: [], external: true, company: input.company || '', hist: [] };
    history(p, 'Added as external attendee', by, now); M.people.push(p); return p;
  }

  /* ---------- sessions: invitations, materials, outputs ---------- */
  function sessionFields(M, input, s, by, now) {
    const c = byId(M.competencies, input.cid || s.cid); if (!c) throw err('invalid_competency', 'Unknown competency');
    if (!input.date && !s.date) throw err('invalid_argument', 'Session date is required');
    Object.assign(s, { cid: c.id, date: input.date || s.date, time: input.time != null ? input.time : (s.time || ''), duration: input.duration != null ? Number(input.duration) || 0 : (s.duration || 0), location: input.location != null ? input.location : (s.location || ''), provider: input.provider != null ? input.provider : (s.provider || ''), cost: input.cost != null ? Number(input.cost) || 0 : (s.cost || 0), note: input.note != null ? input.note : (s.note || ''), trainer: input.trainer != null ? input.trainer : (s.trainer || '') });
    if (input.attendees) { const add = input.attendees.filter(id => !s.attendees.includes(id)); s.attendees = [...new Set(input.attendees)]; add.forEach(pid => { const p = byId(M.people, pid); if (p) history(p, `Booked: ${c.name} on ${s.date}${s.provider ? ' · ' + s.provider : ''}`, by, now); }); }
    return s;
  }
  function planSession2(M, input, by, now) { const s = { id: uid(), attendees: [], materials: [], outputs: [], invites: [], status: 'Planned', by, created: iso(now || today()) }; sessionFields(M, input, s, by, now); M.sessions = M.sessions || []; M.sessions.push(s); return s; }
  function updateSession(M, id, input, by, now) { const s = byId(M.sessions, id); if (!s) throw err('not_found', 'Session not found'); if (s.status === 'Completed' && (input.date || input.cid)) throw err('validation', 'A completed session cannot be re-dated'); sessionFields(M, input, s, by, now); return s; }
  function cancelSession(M, id, reason, by, now) { const s = byId(M.sessions, id); if (!s) throw err('not_found', 'Session not found'); s.status = 'Cancelled'; s.cancelReason = reason || ''; s.attendees.forEach(pid => { const p = byId(M.people, pid); if (p) history(p, `Session cancelled: ${byId(M.competencies, s.cid).name} on ${s.date}${reason ? ' · ' + reason : ''}`, by, now); }); return s; }
  function addAttachment(M, sessionId, kind, file, by, now) {
    const s = byId(M.sessions, sessionId); if (!s) throw err('not_found', 'Session not found');
    if (!['materials', 'outputs'].includes(kind)) throw err('validation', 'kind must be materials or outputs');
    if (!file || !file.name) throw err('validation', 'file name is required');
    const a = { id: uid(), name: file.name, size: Number(file.size) || 0, type: file.type || '', fileId: file.fileId || null, url: file.url || null, by, t: (now || new Date()).toISOString().slice(0, 16), shared: kind === 'materials' ? file.shared !== false : false, note: file.note || '' };
    s[kind] = s[kind] || []; s[kind].push(a); return a;
  }
  function removeAttachment(M, sessionId, kind, id) { const s = byId(M.sessions, sessionId); if (!s) throw err('not_found', 'Session not found'); s[kind] = (s[kind] || []).filter(a => a.id !== id); }
  function fmtDate(d) { const x = new Date(d); return x.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function render(tpl, vars) { return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] != null ? vars[k] : ''); }
  function buildInvite(M, session, person, opts) {
    opts = opts || {}; const S = Object.assign({}, DEFAULT_SETTINGS, M.settings || {}); const c = byId(M.competencies, session.cid);
    const materials = (session.materials || []).filter(a => a.shared);
    const vars = { name: person.name, course: c ? c.name : '', date: fmtDate(session.date), time: session.time ? ' at ' + session.time : '', location: session.location ? ' (' + session.location + ')' : '', org: M.org || '', provider: session.provider || '', trainer: session.trainer || '',
      materials: materials.length ? '\nMaterials to read before the session:\n' + materials.map(a => `• ${a.name}${opts.baseUrl && (a.url || a.fileId) ? ' — ' + opts.baseUrl + (a.url || '/files/' + a.fileId) : ''}`).join('\n') + '\n' : '',
      link: opts.selfBase ? opts.selfBase + encodeURIComponent(person.id) : '',
      accept: opts.rsvpBase ? rsvpLink(opts.rsvpBase, session, person, 'accept') : '(accept in iMS OS)',
      decline: opts.rsvpBase ? rsvpLink(opts.rsvpBase, session, person, 'decline') : '(decline in iMS OS)' };
    const subject = render(S.inviteSubject, vars); let body = render(S.inviteBody, vars);
    if (vars.link) body += `\n\nYour training record: ${vars.link}`;
    return { to: person.email || '', toName: person.name, subject, body, ics: buildIcs(M, session, c, opts.uidDomain || 'ims-os', person, S.organiserEmail) };
  }
  /* rsvpBase: '<origin>/r/' → '<origin>/r/<sessionId>/<personId>?a=accept'. Production signs the token; the reference uses the ids. */
  function rsvpLink(base, session, person, action) { return base + encodeURIComponent(session.id) + '/' + encodeURIComponent(person.id) + '?a=' + action; }
  const RSVP = ['accepted', 'declined', 'tentative'];
  function respond(M, sessionId, personId, status, note, now) {
    const s = byId(M.sessions, sessionId); if (!s) throw err('not_found', 'Session not found');
    if (!s.attendees.includes(personId)) throw err('forbidden', 'Not invited to this session');
    if (!RSVP.includes(status)) throw err('validation', 'Response must be accepted, declined or tentative');
    if (s.status !== 'Planned') throw err('validation', 'This session is ' + s.status.toLowerCase());
    s.rsvp = s.rsvp || {}; s.rsvp[personId] = { status, note: (note || '').trim().slice(0, 300), t: (now || new Date()).toISOString().slice(0, 16) };
    const p = byId(M.people, personId); if (p) history(p, `${status.charAt(0).toUpperCase() + status.slice(1)}: ${byId(M.competencies, s.cid).name} on ${s.date}${note ? ' · ' + note.trim().slice(0, 120) : ''}`, p.name, now);
    return s.rsvp[personId];
  }
  function rsvpSummary(s) { const r = s.rsvp || {}; const invited = new Set((s.invites || []).filter(i => i.status === 'sent').map(i => i.personId)); const out = { accepted: 0, declined: 0, tentative: 0, pending: 0, notInvited: 0 }; (s.attendees || []).forEach(pid => { const x = r[pid]; if (x) out[x.status]++; else if (invited.has(pid)) out.pending++; else out.notInvited++; }); return out; }
  function rsvpOf(s, pid) { const x = (s.rsvp || {})[pid]; if (x) return x.status; return (s.invites || []).some(i => i.personId === pid && i.status === 'sent') ? 'pending' : 'not-invited'; }
  function buildIcs(M, s, c, domain, person, organiserEmail) {
    const d = s.date.replace(/-/g, ''); const t = (s.time || '09:00').replace(':', ''); const start = d + 'T' + t + '00'; const dur = s.duration || 60;
    const e = new Date(Date.UTC(+s.date.slice(0, 4), +s.date.slice(5, 7) - 1, +s.date.slice(8, 10), +(s.time || '09:00').slice(0, 2), +(s.time || '09:00').slice(3, 5) + dur)); const end = e.toISOString().replace(/[-:]/g, '').slice(0, 15);
    const escT = x => String(x || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//iMS OS//Training//EN', 'METHOD:REQUEST', 'BEGIN:VEVENT', `UID:${s.id}@${domain}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escT((c ? c.name : 'Training') + ' · ' + (M.org || ''))}`, `LOCATION:${escT(s.location)}`, `ORGANIZER;CN=${escT(M.org || 'iMS OS')}:mailto:${organiserEmail || 'training@ims-os.example'}`, ...(person && person.email ? [`ATTENDEE;CN=${escT(person.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${person.email}`] : []), `DESCRIPTION:${escT((s.provider ? 'Provider: ' + s.provider + '\n' : '') + (s.note || ''))}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function recordInvites(M, sessionId, results, by, now) { const s = byId(M.sessions, sessionId); if (!s) throw err('not_found', 'Session not found'); s.invites = s.invites || []; results.forEach(r => s.invites.push({ personId: r.personId, to: r.to, status: r.status, t: (now || new Date()).toISOString().slice(0, 16), by, error: r.error || '' })); (M.log = M.log || []).unshift({ t: (now || new Date()).toISOString().slice(0, 16), by, what: `Invitations for ${byId(M.competencies, s.cid).name} on ${s.date}: ${results.filter(r => r.status === 'sent').length} sent, ${results.filter(r => r.status !== 'sent').length} not sent` }); return s; }

  const csv = rows => rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
  function matrixCsv(M, now) { const comps = M.competencies; const rows = [['Person', 'Roles', 'Site', ...comps.map(c => c.name)]]; activePeople(M).forEach(p => { const row = matrixRow(M, p, now); rows.push([p.name, (p.roles || []).map(r => (byId(M.roles, r) || {}).name).join('; '), p.site, ...comps.map(c => { const x = row.find(y => y.req.cid === c.id); return x ? (x.st === 'ok' ? 'OK' + (x.next ? ' to ' + x.next : '') : x.st === 'na' ? 'N/A' : x.st) : ''; })]); }); return csv(rows); }

  return { iso, today, addMonths, addDays, daysUntil, uid, slug, setExemption, clearExemption, RSVP, respond, rsvpSummary, rsvpOf, rsvpLink, remindersDue, EVIDENCE, RESULTS, STATUS, DEFAULT_SETTINGS, upsertCompetency, archiveCompetency, upsertRole, removeRole, updateSettings, log, addExternal, updateSession, cancelSession, addAttachment, removeAttachment, buildInvite, buildIcs, recordInvites, render, DEFAULT_COMPETENCIES, DEFAULT_ROLES, SEVERITY, byId, activePeople, requirements, latestRecord, cell, matrixRow, gaps, personSummary, isCompetent, validateRecord, addRecord, acknowledgePolicy, history, validatePerson, markLeaver, planSession, completeSession, plan, readiness, matrixCsv, csv };
});
