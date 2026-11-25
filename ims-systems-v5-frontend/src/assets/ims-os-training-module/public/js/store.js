/*  iMS OS · Training & Competency module · data access
 *  LocalAdapter (localStorage + data/seed.json) | RestAdapter (openapi.yaml). Chosen by window.IMS_CONFIG.
 */
(function (root) {
  'use strict';
  const CONFIG = Object.assign({ adapter: 'local', apiBase: '/api', seedUrl: 'data/seed.json', storageKey: 'ims-training-v1', selfBase: null, rsvpBase: null, token: null, user: null }, root.IMS_CONFIG || {});
  const R = () => root.IMSTraining;

  class LocalAdapter {
    constructor() { this.key = CONFIG.storageKey; }
    async load() {
      try { const j = JSON.parse(localStorage.getItem(this.key)); if (j && j.people) return j; } catch (e) { /* ignore */ }
      const seed = await (await fetch(CONFIG.seedUrl)).json(); const base = R().today();
      const fix = v => { const m = typeof v === 'string' && v.match(/^@(-?\d+)d(.*)$/); return m ? R().iso(R().addDays(base, Number(m[1]))) + m[2] : v; };
      const walk = o => Array.isArray(o) ? o.map(walk) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : fix(o);
      const m = walk(seed); this._persist(m); return m;
    }
    _persist(m) { try { localStorage.setItem(this.key, JSON.stringify(m)); } catch (e) { /* ignore */ } }
    async act(model, action, by) {
      const T = R(); let out = null;
      switch (action.type) {
        case 'record': out = T.addRecord(model, action, by); break;
        case 'acknowledge': out = T.acknowledgePolicy(model, action.personId, action.cid, action.answers, by); break;
        case 'person': { let p = T.byId(model.people, action.person.id); const pr = T.validatePerson(model, action.person); if (pr.length) { const e = new Error(pr.join(' · ')); e.code = 'validation'; throw e; } if (p) { const ch = Object.keys(action.person).filter(k => k !== 'hist' && JSON.stringify(action.person[k]) !== JSON.stringify(p[k])); Object.assign(p, action.person); if (ch.length) T.history(p, 'Updated: ' + ch.join(', '), by); } else { p = Object.assign({ hist: [] }, action.person); T.history(p, 'Added to the matrix', by); model.people.push(p); } out = p; break; }
        case 'leaver': T.markLeaver(model, T.byId(model.people, action.personId), action.date, by); break;
        case 'exempt': out = T.setExemption(model, action.personId, action.cid, action.reason, by); break;
        case 'rsvp': out = T.respond(model, action.sessionId, action.personId, action.status, action.note); break;
        case 'unexempt': out = T.clearExemption(model, action.personId, action.cid, by); break;
        case 'session': out = T.planSession(model, action, by); break;
        case 'complete': out = T.completeSession(model, action.sessionId, action.outcomes, by); break;
        case 'settings': out = T.updateSettings(model, action.settings, by); break;
        case 'role': out = T.upsertRole(model, action.role, by); break;
        case 'removeRole': T.removeRole(model, action.id, by); break;
        case 'competency': out = T.upsertCompetency(model, action.competency, by); break;
        case 'archiveCompetency': out = T.archiveCompetency(model, action.id, by); break;
        case 'external': out = T.addExternal(model, action, by); break;
        case 'updateSession': out = T.updateSession(model, action.sessionId, action, by); break;
        case 'cancelSession': out = T.cancelSession(model, action.sessionId, action.reason, by); break;
        case 'attach': out = T.addAttachment(model, action.sessionId, action.kind, action.file, by); break;
        case 'detach': T.removeAttachment(model, action.sessionId, action.kind, action.id); break;
        case 'invite': { const s = T.byId(model.sessions, action.sessionId); const results = s.attendees.map(pid => { const p = T.byId(model.people, pid); const inv = T.buildInvite(model, s, p, { selfBase: CONFIG.selfBase || '', rsvpBase: CONFIG.rsvpBase || '', baseUrl: '' }); return { personId: pid, to: inv.to, status: inv.to ? 'sent' : 'no-email', subject: inv.subject, body: inv.body, ics: inv.ics }; }); T.recordInvites(model, s.id, results, by); out = { results, mode: 'local' }; break; }
        default: throw new Error('Unknown action ' + action.type);
      }
      this._persist(model); return out;
    }
    async upload(file) { const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); if (data.length > 3e6) throw Object.assign(new Error('Demo mode keeps files under 2 MB; the API has no such limit'), { code: 'too_large' }); return { fileId: 'local-' + Date.now().toString(36), url: data, name: file.name, size: file.size, type: file.type }; }
    async reset() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
    get me() { return CONFIG.user || { name: 'S. Ahmed', role: 'manager', personId: 'p01' }; }
  }

  class RestAdapter {
    constructor() { this.base = CONFIG.apiBase.replace(/\/$/, ''); }
    async _req(method, path, body, extra) {
      const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {}); if (CONFIG.token) h.Authorization = 'Bearer ' + CONFIG.token;
      const r = await fetch(this.base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
      if (r.status === 204) return null; const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.message || r.statusText); e.code = j.code || 'http_' + r.status; e.status = r.status; throw e; } return j;
    }
    async load() { const m = await this._req('GET', '/model'); this.user = m.user; this.version = m.version; return m; }
    async changed() { try { const m = await this._req('GET', '/model'); return m.version !== this.version ? m : null; } catch (e) { return null; } }
    async act(model, action, by) {
      const h = (!CONFIG.token && action.selfToken) ? { 'X-Self-Token': action.selfToken } : {};
      let r;
      switch (action.type) {
        case 'record': r = await this._req('POST', '/records', action, h); break;
        case 'acknowledge': r = await this._req('POST', `/people/${encodeURIComponent(action.personId)}/acknowledge`, { cid: action.cid, answers: action.answers }, h); break;
        case 'person': r = action.person.id && R().byId(model.people, action.person.id) ? await this._req('PUT', `/people/${encodeURIComponent(action.person.id)}`, action.person) : await this._req('POST', '/people', action.person); break;
        case 'leaver': r = await this._req('POST', `/people/${encodeURIComponent(action.personId)}/leaver`, { date: action.date }); break;
        case 'exempt': r = await this._req('POST', `/people/${encodeURIComponent(action.personId)}/exempt`, { cid: action.cid, reason: action.reason }); break;
        case 'rsvp': r = await this._req('POST', `/sessions/${encodeURIComponent(action.sessionId)}/rsvp`, { personId: action.personId, status: action.status, note: action.note }, h); break;
        case 'unexempt': r = await this._req('DELETE', `/people/${encodeURIComponent(action.personId)}/exempt/${encodeURIComponent(action.cid)}`); break;
        case 'session': r = await this._req('POST', '/sessions', action); break;
        case 'complete': r = await this._req('POST', `/sessions/${encodeURIComponent(action.sessionId)}/complete`, { outcomes: action.outcomes }); break;
        case 'settings': r = await this._req('PUT', '/settings', action.settings); break;
        case 'role': r = action.role.id ? await this._req('PUT', `/roles/${encodeURIComponent(action.role.id)}`, action.role) : await this._req('POST', '/roles', action.role); break;
        case 'removeRole': r = await this._req('DELETE', `/roles/${encodeURIComponent(action.id)}`); break;
        case 'competency': r = action.competency.id ? await this._req('PUT', `/competencies/${encodeURIComponent(action.competency.id)}`, action.competency) : await this._req('POST', '/competencies', action.competency); break;
        case 'archiveCompetency': r = await this._req('DELETE', `/competencies/${encodeURIComponent(action.id)}`); break;
        case 'external': r = await this._req('POST', '/people/external', action); break;
        case 'updateSession': r = await this._req('PUT', `/sessions/${encodeURIComponent(action.sessionId)}`, action); break;
        case 'cancelSession': r = await this._req('POST', `/sessions/${encodeURIComponent(action.sessionId)}/cancel`, { reason: action.reason }); break;
        case 'attach': r = await this._req('POST', `/sessions/${encodeURIComponent(action.sessionId)}/${action.kind}`, action.file); break;
        case 'detach': r = await this._req('DELETE', `/sessions/${encodeURIComponent(action.sessionId)}/${action.kind}/${encodeURIComponent(action.id)}`); break;
        case 'invite': r = await this._req('POST', `/sessions/${encodeURIComponent(action.sessionId)}/invite`, { personIds: action.personIds, attachFiles: !!action.attachFiles }); break;
        default: throw new Error('Unknown action ' + action.type);
      }
      const m = await this.load(); Object.assign(model, m); return r;
    }
    async upload(file) { const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); return this._req('POST', '/files', { name: file.name, type: file.type, size: file.size, data }); }
    async reset() { /* not in production */ }
    get me() { return this.user || CONFIG.user || { name: 'Unknown', role: 'viewer' }; }
  }

  class TrainingStore {
    constructor() { this.adapter = CONFIG.adapter === 'rest' ? new RestAdapter() : new LocalAdapter(); this.model = null; this.listeners = new Set(); this.status = 'loading'; }
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    _emit() { this.listeners.forEach(fn => { try { fn(this.model); } catch (e) { console.error(e); } }); }
    get me() { return this.adapter.me; }
    get isRest() { return this.adapter instanceof RestAdapter; }
    get selfBase() { return CONFIG.selfBase || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?me='); }
    get rsvpBase() { return CONFIG.rsvpBase || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?rsvp='); }
    async load() { this.model = await this.adapter.load(); this.status = 'ready'; this._emit(); return this.model; }
    async reload() { return this.load(); }
    async upload(file) { return this.adapter.upload(file); }
    get settings() { return Object.assign({}, root.IMSTraining.DEFAULT_SETTINGS, (this.model && this.model.settings) || {}); }
    async act(action, by) { this.status = 'saving'; try { const out = await this.adapter.act(this.model, action, by || this.me.name); this.status = 'ready'; return out; } catch (e) { this.status = 'error'; throw e; } finally { this._emit(); } }
    startSync(ms) { if (!this.adapter.changed) return; const tick = async () => { if (this.status === 'saving' || document.hidden) return; const m = await this.adapter.changed(); if (m) { this.adapter.user = m.user; this.adapter.version = m.version; this.model = m; this._emit(); } }; setInterval(tick, ms || 20000); addEventListener('focus', tick); }
    async reset() { await this.adapter.reset(); return this.load(); }
  }
  root.TrainingStore = TrainingStore;
})(typeof self !== 'undefined' ? self : this);
