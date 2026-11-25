/*  iMS OS · Tender Autopilot · data access
 *  LocalAdapter (localStorage + data/seed.json, drafting runs in the browser) | RestAdapter (openapi.yaml; drafting runs on the server / ALICE).
 *  Chosen by window.IMS_CONFIG = { adapter:'local'|'rest', apiBase, token, user }.
 */
(function (root) {
  'use strict';
  const CONFIG = Object.assign({ adapter: 'local', apiBase: '/api', seedUrl: 'data/seed.json', storageKey: 'ims-tender-v1', token: null, user: null }, root.IMS_CONFIG || {});
  const R = () => root.IMSTender, Z = () => root.IMSZip;
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function parseFile(file) { // → { source, parsed } using IMSZip in the browser
    const name = file.name.toLowerCase(); const u8 = new Uint8Array(await file.arrayBuffer());
    if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) { const sheets = await Z().readXlsx(u8); const scored = sheets.map(s => ({ s, p: R().fromRows(s.rows), pr: R().pricingFromRows(s.rows) })); const best = scored.sort((a, b) => b.p.questions.length - a.p.questions.length)[0]; const pricing = scored.find(x => x.pr); return { source: 'xlsx', parsed: best.p, sheet: best.s.name, rows: (pricing || best).s.rows, doc: R().analyseDocument(file.name, 'xlsx', null, (pricing || best).s.rows), bytes: u8 }; }
    if (name.endsWith('.docx')) { const paras = await Z().readDocx(u8); return { source: 'docx', parsed: R().fromParagraphs(paras), paras, doc: R().analyseDocument(file.name, 'docx', paras), bytes: u8 }; }
    if (name.endsWith('.csv') || name.endsWith('.txt')) { const text = new TextDecoder().decode(u8); const rows = name.endsWith('.csv') ? csv(text) : null; const paras = rows ? null : text.split(/\r?\n/).map(t => ({ text: t })); return { source: name.endsWith('.csv') ? 'csv' : 'portal', parsed: rows ? R().fromRows(rows) : R().fromText(text), doc: R().analyseDocument(file.name, rows ? 'csv' : 'portal', paras, rows), bytes: u8 }; }
    throw Object.assign(new Error('Upload an Excel (.xlsx), Word (.docx), CSV or text file, or paste the questions from the portal'), { code: 'unsupported' });
  }
  function csv(text) { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; }

  class LocalAdapter {
    constructor() { this.key = CONFIG.storageKey; }
    async load() {
      try { const j = JSON.parse(localStorage.getItem(this.key)); if (j && j.library) return j; } catch (e) { /* ignore */ }
      const seed = root.IMS_SEED || await (await fetch(CONFIG.seedUrl)).json(); const base = R().today();
      const fix = v => { const m = typeof v === 'string' && v.match(/^@([+-]?\d+)d(.*)$/); return m ? R().iso(R().addDays(base, Number(m[1]))) + m[2] : v; };
      const walk = o => Array.isArray(o) ? o.map(walk) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : fix(o);
      const m = walk(seed); this._persist(m); return m;
    }
    _persist(m) { try { localStorage.setItem(this.key, JSON.stringify(m)); } catch (e) { /* ignore */ } }
    async act(M, a, by) {
      const T = R(); let out = null; const now = new Date();
      switch (a.type) {
        case 'import': { const Q = T.newQuestionnaire(M, a.meta, a.parsed, by, now); if (a.draft !== false) T.draftAll(M, Q.id, 'ALICE', now); out = Q; break; }
        case 'draft': out = T.draftAll(M, a.qid, 'ALICE', now, a.only); break;
        case 'answer': out = T.setAnswer(M, a.qid, a.questionId, a.patch, by, now); break;
        case 'accept': out = T.accept(M, a.qid, a.questionId, by, now); break;
        case 'approve': out = T.approve(M, a.qid, a.questionIds, by, now, this.me.role); break;
        case 'export': { const Q = T.byId(M.questionnaires, a.qid); let bytes, mime, ext; if (a.format === 'xlsx') { bytes = Z().writeXlsx(T.exportRows(Q), 'Responses'); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; ext = 'xlsx'; } else if (a.format === 'docx') { bytes = Z().writeDocx(T.exportBlocks(M, Q)); mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; ext = 'docx'; } else { bytes = new TextEncoder().encode(T.exportRows(Q).map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')); mime = 'text/csv'; ext = 'csv'; } T.recordExport(M, a.qid, a.format, by, now); out = { blob: new Blob([bytes], { type: mime }), name: `${Q.buyer} - ${Q.title}.${ext}`.replace(/[\\/:*?"<>|]/g, '-') }; break; }
        case 'submitted': out = T.markSubmitted(M, a.qid, by, now, a.how); break;
        case 'bid': out = T.updateBid(M, a.qid, a.patch, by, now); break;
        case 'pack': { const d = T.addPackDocument(M, a.qid, a.doc, by, now); if (a.draft !== false) T.draftAll(M, a.qid, 'ALICE', now); T.autoAssess(M, a.qid); out = d; break; }
        case 'assess': out = T.assessRequirement(M, a.qid, a.rid, a.patch, by, now); break;
        case 'autoAssess': out = { assessed: T.autoAssess(M, a.qid) }; break;
        case 'pricing': out = T.setPricing(M, a.qid, a.patch, by, now); break;
        case 'service': out = T.upsertService(M, a.service, by, now); break;
        case 'case': out = T.upsertCase(M, a.case, by, now); break;
        case 'rate': out = T.upsertRate(M, a.rate, by, now); break;
        case 'bidExport': { const Q = T.byId(M.questionnaires, a.qid); let bytes, mime, name; if (a.what === 'bid') { bytes = Z().writeDocx(T.bidBlocks(M, Q)); mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; name = `${Q.buyer} - Tender response.docx`; } else { bytes = Z().writeXlsx(T.pricingRows(Q), 'Pricing'); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; name = `${Q.buyer} - Pricing schedule.xlsx`; } T.recordExport(M, a.qid, a.what === 'bid' ? 'bid-docx' : 'pricing-xlsx', by, now); out = { blob: new Blob([bytes], { type: mime }), name: name.replace(/[\\/:*?"<>|]/g, '-') }; break; }
        case 'submit': { const Q = T.byId(M.questionnaires, a.qid); const c = T.canSubmit(M, Q, now); if (!c.ok && !a.force) { const e = new Error(c.errs.join(' · ')); e.code = 'validation'; throw e; } const pk = T.submissionPackage(M, Q); T.markSubmitted(M, a.qid, by, now, 'email'); out = Object.assign(pk, { mode: 'local' }); break; }
        case 'remove-questionnaire': { const i = M.questionnaires.findIndex(q => q.id === a.qid); if (i >= 0) { const [q] = M.questionnaires.splice(i, 1); T.log(M, 'Removed ' + q.buyer + ' · ' + q.title, by, now); } break; }
        case 'answerLib': out = T.upsertAnswer(M, a.answer, by, now); break;
        case 'removeAnswer': T.removeAnswer(M, a.id, by, now); break;
        case 'certificate': out = T.upsertCertificate(M, a.certificate, by, now); break;
        case 'policy': out = T.upsertPolicy(M, a.policy, by, now); break;
        case 'removeItem': T.removeItem(M, a.kind, a.id, by, now); break;
        case 'settings': out = T.updateSettings(M, a.settings, by, now); break;
        case 'facts': out = T.updateFacts(M, a.facts, by, now); break;
        default: throw new Error('Unknown action ' + a.type);
      }
      this._persist(M); return out;
    }
    async parse(file) { return parseFile(file); }
    async upload(file) { const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); if (data.length > 3e6) throw Object.assign(new Error('Demo mode keeps files under 2 MB; the API has no such limit'), { code: 'too_large' }); return { fileId: 'local-' + Date.now().toString(36), url: data, name: file.name, size: file.size, type: file.type }; }
    async reset() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
    get me() { return CONFIG.user || { name: 'S. Ahmed', role: 'admin', personId: 'p01' }; }
  }

  class RestAdapter {
    constructor() { this.base = CONFIG.apiBase.replace(/\/$/, ''); }
    async _req(method, path, body, raw) {
      const h = { 'Content-Type': 'application/json' }; if (CONFIG.token) h.Authorization = 'Bearer ' + CONFIG.token;
      const r = await fetch(this.base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
      if (raw) { if (!r.ok) { const j = await r.json().catch(() => ({})); throw Object.assign(new Error(j.message || r.statusText), { code: j.code || 'http_' + r.status }); } return r; }
      if (r.status === 204) return null; const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.message || r.statusText); e.code = j.code || 'http_' + r.status; e.status = r.status; throw e; } return j;
    }
    async load() { const m = await this._req('GET', '/model'); this.user = m.user; this.version = m.version; return m; }
    async changed() { try { const m = await this._req('GET', '/model'); return m.version !== this.version ? m : null; } catch (e) { return null; } }
    async parse(file) { const u8 = new Uint8Array(await file.arrayBuffer()); return this._req('POST', '/parse', { name: file.name, data: b64(u8) }); }
    async act(M, a, by) {
      let r;
      switch (a.type) {
        case 'import': r = await this._req('POST', '/questionnaires', { meta: a.meta, parsed: a.parsed, draft: a.draft !== false }); break;
        case 'draft': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/draft`, { only: a.only || null }); break;
        case 'answer': r = await this._req('PUT', `/questionnaires/${enc(a.qid)}/questions/${enc(a.questionId)}`, a.patch); break;
        case 'accept': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/questions/${enc(a.questionId)}/accept`); break;
        case 'approve': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/approve`, { questionIds: a.questionIds || null }); break;
        case 'export': { const res = await this._req('GET', `/questionnaires/${enc(a.qid)}/export?format=${a.format}`, null, true); const blob = await res.blob(); const cd = res.headers.get('Content-Disposition') || ''; const m2 = cd.match(/filename\*=UTF-8''([^;]+)/); const name = m2 ? decodeURIComponent(m2[1]) : (cd.match(/filename="([^"]+)"/) || [])[1] || 'response.' + a.format; r = { blob, name }; break; }
        case 'submitted': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/submitted`, { how: a.how }); break;
        case 'bid': r = await this._req('PUT', `/questionnaires/${enc(a.qid)}`, a.patch); break;
        case 'pack': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/documents`, { doc: a.doc, draft: a.draft !== false }); break;
        case 'assess': r = await this._req('PUT', `/questionnaires/${enc(a.qid)}/requirements/${enc(a.rid)}`, a.patch); break;
        case 'autoAssess': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/requirements/assess`); break;
        case 'pricing': r = await this._req('PUT', `/questionnaires/${enc(a.qid)}/pricing`, a.patch); break;
        case 'service': r = a.service.id ? await this._req('PUT', `/library/services/${enc(a.service.id)}`, a.service) : await this._req('POST', '/library/services', a.service); break;
        case 'case': r = a.case.id ? await this._req('PUT', `/library/cases/${enc(a.case.id)}`, a.case) : await this._req('POST', '/library/cases', a.case); break;
        case 'rate': r = a.rate.id ? await this._req('PUT', `/library/rates/${enc(a.rate.id)}`, a.rate) : await this._req('POST', '/library/rates', a.rate); break;
        case 'bidExport': { const res = await this._req('GET', `/questionnaires/${enc(a.qid)}/bid?what=${a.what}`, null, true); const blob = await res.blob(); const cd = res.headers.get('Content-Disposition') || ''; const m2 = cd.match(/filename\*=UTF-8''([^;]+)/); r = { blob, name: m2 ? decodeURIComponent(m2[1]) : (cd.match(/filename="([^"]+)"/) || [])[1] || 'bid' }; break; }
        case 'submit': r = await this._req('POST', `/questionnaires/${enc(a.qid)}/submit`, { force: !!a.force }); break;
        case 'remove-questionnaire': r = await this._req('DELETE', `/questionnaires/${enc(a.qid)}`); break;
        case 'answerLib': r = a.answer.id ? await this._req('PUT', `/library/answers/${enc(a.answer.id)}`, a.answer) : await this._req('POST', '/library/answers', a.answer); break;
        case 'removeAnswer': r = await this._req('DELETE', `/library/answers/${enc(a.id)}`); break;
        case 'certificate': r = a.certificate.id ? await this._req('PUT', `/library/certificates/${enc(a.certificate.id)}`, a.certificate) : await this._req('POST', '/library/certificates', a.certificate); break;
        case 'policy': r = a.policy.id ? await this._req('PUT', `/library/policies/${enc(a.policy.id)}`, a.policy) : await this._req('POST', '/library/policies', a.policy); break;
        case 'removeItem': r = await this._req('DELETE', `/library/${a.kind}/${enc(a.id)}`); break;
        case 'settings': r = await this._req('PUT', '/settings', a.settings); break;
        case 'facts': r = await this._req('PUT', '/facts', a.facts); break;
        default: throw new Error('Unknown action ' + a.type);
      }
      const m = await this.load(); Object.assign(M, m); return r;
    }
    async upload(file) { const u8 = new Uint8Array(await file.arrayBuffer()); return this._req('POST', '/files', { name: file.name, type: file.type, size: file.size, data: b64(u8) }); }
    async reset() { /* not in production */ }
    get me() { return this.user || CONFIG.user || { name: 'Unknown', role: 'viewer' }; }
  }
  const enc = encodeURIComponent;

  class TenderStore {
    constructor() { this.adapter = CONFIG.adapter === 'rest' ? new RestAdapter() : new LocalAdapter(); this.model = null; this.listeners = new Set(); this.status = 'loading'; }
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    _emit() { this.listeners.forEach(fn => { try { fn(this.model); } catch (e) { console.error(e); } }); }
    get me() { return this.adapter.me; }
    get isRest() { return this.adapter instanceof RestAdapter; }
    async load() { this.model = await this.adapter.load(); this.status = 'ready'; this._emit(); return this.model; }
    async parse(file) { return this.adapter.parse(file); }
    async upload(file) { return this.adapter.upload(file); }
    get settings() { return Object.assign({}, root.IMSTender.DEFAULT_SETTINGS, (this.model && this.model.settings) || {}); }
    async act(action, by) { this.status = 'saving'; try { const out = await this.adapter.act(this.model, action, by || this.me.name); this.status = 'ready'; return out; } catch (e) { this.status = 'error'; throw e; } finally { this._emit(); } }
    startSync(ms) { if (!this.adapter.changed) return; const tick = async () => { if (this.status === 'saving' || document.hidden) return; const m = await this.adapter.changed(); if (m) { this.adapter.user = m.user; this.adapter.version = m.version; this.model = m; this._emit(); } }; setInterval(tick, ms || 20000); addEventListener('focus', tick); }
    async reset() { await this.adapter.reset(); return this.load(); }
  }
  root.TenderStore = TenderStore; root.IMSTenderFiles = { parseFile, csv, b64, unb64 };
})(typeof self !== 'undefined' ? self : this);
