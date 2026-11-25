const test = require('node:test'), assert = require('node:assert');
const R = require('../../public/js/rules.js');
const now = new Date('2026-11-19');
function model() { return { settings: { leadDays: 60, inductionDays: 14 }, competencies: R.DEFAULT_COMPETENCIES.map(c => Object.assign({}, c)), roles: R.DEFAULT_ROLES.map(r => Object.assign({}, r)), people: [
  { id: 'a', name: 'Ann', roles: ['crane'], site: 'S', start: '2024-01-01', status: 'Active', extra: [], hist: [{ t: '', by: '', what: 'x' }] },
  { id: 'b', name: 'Ben', roles: [], site: 'S', start: '2026-11-15', status: 'Active', extra: [], hist: [{ t: '', by: '', what: 'x' }] }], records: [], sessions: [] }; }
const rec = (pid, cid, date, ref) => ({ personId: pid, cid, date, result: 'Pass', ref: ref || 'r' });

test('requirements = all-staff + role + extras', () => { const m = model(); const ids = R.requirements(m, m.people[0]).map(r => r.cid); assert.ok(ids.includes('induction') && ids.includes('slinger') && ids.includes('crane-op')); m.people[0].extra = ['first-aid']; assert.ok(R.requirements(m, m.people[0]).some(r => r.cid === 'first-aid' && r.level === 'mandatory')); });
test('cell states: none, ok, soon, over, never-expiring, induction grace', () => {
  const m = model(); const req = cid => ({ cid, level: 'mandatory', comp: R.byId(m.competencies, cid) });
  assert.equal(R.cell(m, m.people[0], req('fire'), now).st, 'none');
  assert.equal(R.cell(m, m.people[1], req('fire'), now).st, 'grace');
  m.records.push(rec('a', 'fire', '2026-06-01')); assert.equal(R.cell(m, m.people[0], req('fire'), now).st, 'ok');
  m.records.push(rec('a', 'ig', '2025-12-15')); assert.equal(R.cell(m, m.people[0], req('ig'), now).st, 'soon');
  m.records.push(rec('a', 'gdpr', '2025-01-01')); assert.equal(R.cell(m, m.people[0], req('gdpr'), now).st, 'over');
  m.records.push(rec('a', 'induction', '2020-01-01')); assert.equal(R.cell(m, m.people[0], req('induction'), now).st, 'ok');
});
test('a Fail does not count; latest pass wins', () => { const m = model(); m.records.push(Object.assign(rec('a', 'fire', '2026-10-01'), { result: 'Fail' })); assert.equal(R.latestRecord(m, 'a', 'fire'), null); m.records.push(rec('a', 'fire', '2025-01-01'), rec('a', 'fire', '2026-03-01')); assert.equal(R.latestRecord(m, 'a', 'fire').date, '2026-03-01'); });
test('addRecord validates competency, date and certificate evidence', () => {
  const m = model();
  assert.throws(() => R.addRecord(m, { personId: 'a', cid: 'nope' }, 'x', now), /Unknown competency/);
  assert.throws(() => R.addRecord(m, { personId: 'a', cid: 'fire', date: '2027-01-01' }, 'x', now), /future/);
  assert.throws(() => R.addRecord(m, { personId: 'a', cid: 'hs-awareness' }, 'x', now), /certificate/);
  const r = R.addRecord(m, { personId: 'a', cid: 'hs-awareness', ref: 'C1', provider: 'IOSH' }, 'S. Ahmed', now); assert.equal(r.verifiedBy, 'S. Ahmed'); assert.match(m.people[0].hist[0].what, /H&S awareness: Pass · C1/);
});
test('policy acknowledgement needs a full, correct quiz', () => {
  const m = model(); R.byId(m.competencies, 'pol-hs').quiz = [{ q: 'q', opts: ['a', 'b'], a: 1 }];
  assert.throws(() => R.acknowledgePolicy(m, 'a', 'pol-hs', [], 'Ann', now), /Answer all/);
  assert.throws(() => R.acknowledgePolicy(m, 'a', 'pol-hs', [0], 'Ann', now), /incorrect/);
  assert.throws(() => R.acknowledgePolicy(m, 'a', 'fire', [], 'Ann', now), /Not an acknowledgement/);
  R.acknowledgePolicy(m, 'a', 'pol-hs', [1], 'Ann', now); assert.equal(R.latestRecord(m, 'a', 'pol-hs').provider, 'Self-service');
});
test('isCompetent answers the asset module', () => {
  const m = model();
  assert.equal(R.isCompetent(m, 'a', 'Lifting equipment', now).ok, false);
  m.records.push(rec('a', 'slinger', '2023-01-01')); assert.equal(R.isCompetent(m, 'a', 'Lifting equipment', now).ok, true);
  m.records.length = 0; m.records.push(rec('a', 'slinger', '2020-01-01')); assert.equal(R.isCompetent(m, 'a', 'Lifting equipment', now).ok, false, 'expired licence');
  assert.equal(R.isCompetent(m, 'zz', 'Lifting equipment', now).ok, false);
  assert.equal(R.isCompetent(m, 'a', 'Furniture', now).ok, true, 'no competency defined → allowed');
});
test('gaps are ordered none > over > soon; leavers excluded', () => { const m = model(); m.records.push(rec('a', 'fire', '2025-01-01'), rec('a', 'ig', '2025-12-15')); const g = R.gaps(m, now); assert.equal(g[0].st, 'none'); assert.ok(g.some(x => x.st === 'over') && g.some(x => x.st === 'soon')); m.people[0].status = 'Leaver'; assert.ok(!R.gaps(m, now).some(x => x.person.id === 'a')); });
test('plan groups by course and marks booked people', () => { const m = model(); const pl = R.plan(m, 3, now); const fire = pl.find(n => n.comp.id === 'fire'); assert.equal(fire.people.length, 2); assert.equal(fire.unbooked.length, 2); R.planSession(m, { cid: 'fire', date: '2026-12-01', attendees: ['a'] }, 'S', now); assert.equal(R.plan(m, 3, now).find(n => n.comp.id === 'fire').unbooked.length, 1); });
test('completing a session writes a record per attendee', () => { const m = model(); const s = R.planSession(m, { cid: 'fire', date: '2026-11-10', attendees: ['a', 'b'], provider: 'Internal' }, 'S', now); const made = R.completeSession(m, s.id, { b: { result: 'Fail' } }, 'S', now); assert.equal(made.length, 2); assert.equal(R.latestRecord(m, 'a', 'fire').provider, 'Internal'); assert.equal(R.latestRecord(m, 'b', 'fire'), null); assert.equal(s.status, 'Completed'); });
test('validatePerson and markLeaver', () => { const m = model(); assert.ok(R.validatePerson(m, { name: '', status: 'Active', site: '' }).length >= 2); assert.ok(R.validatePerson(m, { name: 'x', status: 'Active', site: 's', roles: ['pilot'] }).some(p => /role/.test(p))); R.markLeaver(m, m.people[0], '2026-11-01', 'S', now); assert.equal(m.people[0].status, 'Leaver'); assert.equal(m.people[0].end, '2026-11-01'); });
test('readiness reflects the model', () => { const m = model(); const rd = R.readiness(m, now); assert.equal(rd.find(r => r.id === 'records').ok, false); m.people = []; assert.ok(R.readiness(m, now).every(r => r.ok)); });
test('matrix CSV has a column per competency', () => { const m = model(); const csv = R.matrixCsv(m, now); assert.equal(csv.split('\n')[0].split('","').length, 3 + m.competencies.length); });

test('tenant can add, edit and archive competencies; archived ones leave the matrix', () => {
  const m = model(); const c = R.upsertCompetency(m, { name: 'Abrasive wheels', months: 36, evidence: 'Certificate', basis: 'PUWER reg 9', covers: ['Production machinery'] }, 'S', now);
  assert.equal(c.id, 'abrasive-wheels'); assert.equal(c.custom, true);
  assert.throws(() => R.upsertCompetency(m, { name: '', months: 12, evidence: 'Certificate' }, 'S', now), /name/);
  assert.throws(() => R.upsertCompetency(m, { name: 'x', months: 12, evidence: 'Magic' }, 'S', now), /evidence/);
  assert.throws(() => R.upsertCompetency(m, { name: 'x', months: 12, evidence: 'Acknowledgement', quiz: [{ q: 'q', opts: ['a'], a: 0 }] }, 'S', now), /2\+ options/);
  R.upsertRole(m, { id: 'operator', name: 'Machine operator', mandatory: ['abrasive-wheels'] }, 'S', now); m.people[0].roles = ['operator'];
  assert.ok(R.requirements(m, m.people[0]).some(r => r.cid === 'abrasive-wheels'));
  R.archiveCompetency(m, 'abrasive-wheels', 'S', now); assert.ok(!R.requirements(m, m.people[0]).some(r => r.cid === 'abrasive-wheels')); assert.ok(m.log[0].what.includes('Archived'));
});
test('roles: add, remove, cannot remove all-staff', () => { const m = model(); const r = R.upsertRole(m, { name: 'Night supervisor', mandatory: ['fire', 'nope'] }, 'S', now); assert.deepEqual(r.mandatory, ['fire']); m.people[0].roles = [r.id]; R.removeRole(m, r.id, 'S', now); assert.deepEqual(m.people[0].roles, []); assert.throws(() => R.removeRole(m, 'all', 'S', now), /All staff/); });
test('settings validate and log', () => { const m = model(); R.updateSettings(m, { leadDays: 45, siteLabel: 'Branch', sites: ['A', ' B '], inviteSubject: 'X {{course}}' }, 'S', now); assert.equal(m.settings.leadDays, 45); assert.deepEqual(m.settings.sites, ['A', 'B']); assert.throws(() => R.updateSettings(m, { leadDays: 999 }, 'S', now), /leadDays/); });
test('external attendees are deduplicated by email and need a valid address', () => { const m = model(); const a = R.addExternal(m, { name: 'Jo', email: 'jo@x.com', company: 'Acme' }, 'S', now); const b = R.addExternal(m, { name: 'Jo again', email: 'JO@x.com' }, 'S', now); assert.equal(a.id, b.id); assert.equal(a.external, true); assert.throws(() => R.addExternal(m, { name: 'No mail', email: 'bad' }, 'S', now), /email/); });
test('invitation renders the tenant template with materials and a calendar file', () => {
  const m = model(); m.org = 'Org'; m.people[0].email = 'ann@x.com'; R.updateSettings(m, { inviteSubject: '{{course}} on {{date}}', inviteBody: 'Hi {{name}}{{materials}}' }, 'S', now);
  const s = R.planSession(m, { cid: 'fire', date: '2026-12-03', time: '14:00', duration: 60, location: 'Room 1', attendees: ['a'] }, 'S', now);
  R.addAttachment(m, s.id, 'materials', { name: 'slides.pdf', fileId: 'f1', size: 10 }, 'S', now); R.addAttachment(m, s.id, 'materials', { name: 'internal.docx', fileId: 'f2', size: 10, shared: false }, 'S', now);
  const inv = R.buildInvite(m, s, m.people[0], { baseUrl: 'http://h', selfBase: 'http://h/t/' });
  assert.equal(inv.subject, 'Fire safety & evacuation on Thursday, 3 December 2026'); assert.match(inv.body, /slides\.pdf — http:\/\/h\/files\/f1/); assert.ok(!/internal\.docx/.test(inv.body)); assert.match(inv.body, /http:\/\/h\/t\/a$/);
  assert.match(inv.ics, /DTSTART:20261203T140000/); assert.match(inv.ics, /DTEND:20261203T150000/); assert.match(inv.ics, /LOCATION:Room 1/);
  R.recordInvites(m, s.id, [{ personId: 'a', to: 'ann@x.com', status: 'sent' }], 'S', now); assert.equal(s.invites.length, 1);
});
test('session update, cancel, outputs linked on completion, absent attendees skipped', () => {
  const m = model(); const s = R.planSession(m, { cid: 'fire', date: '2026-11-10', attendees: ['a', 'b'] }, 'S', now);
  R.updateSession(m, s.id, { location: 'Yard', attendees: ['a', 'b'] }, 'S', now); assert.equal(s.location, 'Yard');
  R.addAttachment(m, s.id, 'outputs', { name: 'attendance.pdf', fileId: 'o1', size: 5 }, 'S', now);
  const made = R.completeSession(m, s.id, { b: { result: 'Absent' } }, 'S', now); assert.equal(made.length, 1); assert.equal(made[0].fileId, 'o1'); assert.match(m.people[1].hist[0].what, /Did not attend/);
  assert.throws(() => R.updateSession(m, s.id, { date: '2026-12-01' }, 'S', now), /completed/);
  const s2 = R.planSession(m, { cid: 'fire', date: '2026-12-10', attendees: ['a'] }, 'S', now); R.cancelSession(m, s2.id, 'trainer ill', 'S', now); assert.equal(s2.status, 'Cancelled'); assert.throws(() => R.completeSession(m, s2.id, {}, 'S', now), /cancelled/);
});

test('not-applicable exemptions need a reason, show as na and drop out of gaps', () => {
  const m = model(); assert.ok(R.gaps(m, now).some(g => g.person.id === 'a' && g.comp.id === 'slinger'));
  assert.throws(() => R.setExemption(m, 'a', 'slinger', '', 'S', now), /reason/);
  R.setExemption(m, 'a', 'slinger', 'Does not sling; crane driver only', 'S', now);
  const row = R.matrixRow(m, m.people[0], now); assert.equal(row.find(x => x.req.cid === 'slinger').st, 'na'); assert.ok(!R.gaps(m, now).some(g => g.person.id === 'a' && g.comp.id === 'slinger'));
  assert.match(m.people[0].hist[0].what, /Not applicable/); R.clearExemption(m, 'a', 'slinger', 'S', now); assert.ok(R.gaps(m, now).some(g => g.person.id === 'a' && g.comp.id === 'slinger'));
});

test('RSVP: respond, summary, invite links and plan exclude declined', () => {
  const m = model(); m.people.forEach(p => { p.email = p.name.toLowerCase() + '@x.test'; }); const s = R.planSession(m, { cid: 'fire', date: '2026-12-01', attendees: ['a', 'b'], provider: 'Internal' }, 'tester'); const pid = 'a';
  assert.equal(R.rsvpOf(s, pid), 'not-invited'); R.recordInvites(m, s.id, s.attendees.map(x => ({ personId: x, to: 't@x', status: 'sent' })), 'tester'); assert.equal(R.rsvpOf(s, pid), 'pending');
  const r = R.respond(m, s.id, pid, 'declined', 'On leave', new Date('2026-11-01T09:00:00Z')); assert.equal(r.status, 'declined');
  assert.equal(R.rsvpOf(s, pid), 'declined'); assert.equal(R.rsvpSummary(s).declined, 1); assert.equal(R.rsvpSummary(s).pending, s.attendees.length - 1);
  assert.throws(() => R.respond(m, s.id, 'nobody', 'accepted'), /not an attendee|not invited/i);
  assert.throws(() => R.respond(m, s.id, pid, 'maybe'), /accepted, declined or tentative/);
  const p = R.byId(m.people, pid); const inv = R.buildInvite(m, s, p, { rsvpBase: 'https://x/r/', selfBase: 'https://x/t/' });
  assert.match(inv.body, /https:\/\/x\/r\/.*a=accept/); assert.match(inv.body, /a=decline/); assert.match(inv.ics, /ATTENDEE;CN=.*RSVP=TRUE/);
  assert.ok(R.remindersDue(m, new Date('2026-11-01')).every(x => x.kind));
});
