/*  iMS OS · Inventory & Asset module · data access
 *  -----------------------------------------------
 *  The UI talks to `IMSStore` only. Two adapters:
 *    LocalAdapter  – browser localStorage, seeded from /data/seed.json (demo, offline, tests)
 *    RestAdapter   – the iMS OS API described in openapi.yaml (production)
 *  Pick with window.IMS_CONFIG = { adapter: 'rest', apiBase: '/api', scanBase: 'https://app.ims-os.com/a/', token: '…' }
 */
(function (root) {
  'use strict';
  const CONFIG = Object.assign({ adapter: 'local', apiBase: '/api', seedUrl: 'data/seed.json', storageKey: 'ims-assets-v2', scanBase: null, token: null, user: null }, root.IMS_CONFIG || {});

  class LocalAdapter {
    constructor() { this.key = CONFIG.storageKey; }
    async load() {
      try { const j = JSON.parse(localStorage.getItem(this.key)); if (j && j.assets) return j; } catch (e) { /* ignore */ }
      const r = await fetch(CONFIG.seedUrl); const seed = await r.json();
      // make the seed's relative dates current
      const R = root.IMSRules, base = R.today();
      const fix = v => { const m = typeof v === 'string' && v.match(/^@(-?\d+)d(.*)$/); return m ? R.iso(R.addDays(base, Number(m[1]))) + m[2] : v; };
      const walk = o => { if (Array.isArray(o)) return o.map(walk); if (o && typeof o === 'object') { const n = {}; for (const k in o) n[k] = walk(o[k]); return n; } return fix(o); };
      const m = walk(seed); this._persist(m); return m;
    }
    _persist(m) { try { localStorage.setItem(this.key, JSON.stringify(m)); } catch (e) { /* storage may be unavailable */ } }
    async saveAsset(model, asset) { this._persist(model); return asset; }
    async createAsset(model, asset) { this._persist(model); return asset; }
    /* intent-level actions: apply the shared rules here; the REST adapter sends them to the server instead */
    async act(model, asset, action, by) {
      const R = root.IMSRules, S = model.settings; let out = null;
      switch (action.type) {
        case 'result': out = R.applyResult(asset, action, by, S); break;
        case 'stage': R.moveStage(asset, action, by); break;
        case 'fault': R.reportFault(asset, action.description, by); break;
        case 'move': R.moveLocation(asset, action.loc, by); break;
        case 'eachUse': R.recordEachUse(asset, by, S); break;
        case 'sighting': R.history(asset, `Seen at ${asset.loc} · location confirmed by scan`, by); break;
        default: throw new Error('Unknown action ' + action.type);
      }
      this._persist(model); return out;
    }
    async stockMove(model, item, move, by) { const r = root.IMSRules.applyStockMove(item, move, by); this._persist(model); return r; }
    async saveStock(model, item) { this._persist(model); return item; }
    async saveSettings(model) { this._persist(model); }
    async reset() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }
    get me() { return CONFIG.user || { name: 'S. Ahmed', role: 'quality_manager' }; }
  }

  class RestAdapter {
    constructor() { this.base = CONFIG.apiBase.replace(/\/$/, ''); }
    async _req(method, path, body, extra) {
      const h = Object.assign({ 'Content-Type': 'application/json' }, extra || {}); if (CONFIG.token) h.Authorization = 'Bearer ' + CONFIG.token;
      const r = await fetch(this.base + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
      if (r.status === 204) return null;
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error(j.message || r.statusText); e.code = j.code || 'http_' + r.status; e.status = r.status; throw e; }
      return j;
    }
    async load() { const m = await this._req('GET', '/model'); this.user = m.user; this.version = m.version; return m; }
    /* cheap change check for other devices' writes: compare the server version */
    async changed() { try { const m = await this._req('GET', '/model'); return m.version !== this.version ? m : null; } catch (e) { return null; } }
    async saveAsset(model, asset) { const saved = await this._req('PUT', `/assets/${encodeURIComponent(asset.id)}`, asset); Object.assign(asset, saved); return asset; }
    async act(model, asset, action, by) {
      const id = encodeURIComponent(asset.id); const h = this._scanHeaders(by); let r;
      switch (action.type) {
        case 'result': r = await this._req('POST', `/assets/${id}/results`, { check: action.check, result: action.result, date: action.date, ref: action.ref, by }, h); Object.assign(asset, r.asset); return r.nextDue;
        case 'stage': r = await this._req('POST', `/assets/${id}/stage`, action, h); break;
        case 'fault': r = await this._req('POST', `/assets/${id}/fault`, { description: action.description }, h); break;
        case 'move': r = await this._req('POST', `/assets/${id}/move`, { loc: action.loc }, h); break;
        case 'eachUse': r = await this._req('POST', `/assets/${id}/each-use`, {}, h); break;
        case 'sighting': r = await this._req('POST', `/assets/${id}/sighting`, {}, h); break;
        default: throw new Error('Unknown action ' + action.type);
      }
      Object.assign(asset, r); return null;
    }
    async stockMove(model, item, move, by) { const r = await this._req('POST', `/stock/${encodeURIComponent(item.id)}/move`, move, this._scanHeaders(by)); Object.assign(item, r.item); return r; }
    _scanHeaders(by) { return (!CONFIG.token && by) ? { 'X-Scan-Name': by } : {}; }
    async createAsset(model, asset) { const saved = await this._req('POST', '/assets', asset); Object.assign(asset, saved); return asset; }
    async saveStock(model, item) { const saved = await this._req('PUT', `/stock/${encodeURIComponent(item.id)}`, item); Object.assign(item, saved); return item; }
    async saveSettings(model) { await this._req('PUT', '/settings', model.settings); }
    async reset() { /* not available in production */ }
    get me() { return this.user || CONFIG.user || { name: 'Unknown', role: 'viewer' }; }
  }

  class IMSStore {
    constructor() { this.adapter = CONFIG.adapter === 'rest' ? new RestAdapter() : new LocalAdapter(); this.model = null; this.listeners = new Set(); this.status = 'loading'; }
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    _emit() { this.listeners.forEach(fn => { try { fn(this.model); } catch (e) { console.error(e); } }); }
    get me() { return this.adapter.me; }
    get scanBase() { return CONFIG.scanBase || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?asset='); }
    async load() { this.model = await this.adapter.load(); this.status = 'ready'; this._emit(); return this.model; }
    /* keep in step with other devices (REST only): poll every `ms` and on tab focus; skips while a save is in flight */
    startSync(ms) { if (!this.adapter.changed) return; const tick = async () => { if (this.status === 'saving' || document.hidden) return; const m = await this.adapter.changed(); if (m) { this.adapter.user = m.user; this.adapter.version = m.version; this.model = m; this._emit(); } }; this._timer = setInterval(tick, ms || 20000); addEventListener('focus', tick); document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); }
    async reload() { return this.load(); }
    /* each mutation: apply in memory (already done by caller via IMSRules), then persist that record */
    async commitAsset(asset) { this.status = 'saving'; try { await this.adapter.saveAsset(this.model, asset); this.status = 'ready'; } catch (e) { this.status = 'error'; throw e; } finally { this._emit(); } }
    async createAsset(asset) { this.model.assets.unshift(asset); try { await this.adapter.createAsset(this.model, asset); } finally { this._emit(); } return asset; }
    async commitStock(item) { try { await this.adapter.saveStock(this.model, item); } finally { this._emit(); } }
    /* intent-level mutation: the adapter applies the rules (local) or asks the server (rest); both return the same shape */
    async act(asset, action, by) { this.status = 'saving'; try { const out = await this.adapter.act(this.model, asset, action, by || this.me.name); this.status = 'ready'; return out; } catch (e) { this.status = 'error'; throw e; } finally { this._emit(); } }
    async stockMove(item, move, by) { try { return await this.adapter.stockMove(this.model, item, move, by || this.me.name); } finally { this._emit(); } }
    async commitSettings() { try { await this.adapter.saveSettings(this.model); } finally { this._emit(); } }
    async reset() { await this.adapter.reset(); return this.load(); }
    findByTag(tag) { return (this.model.assets || []).find(a => a.tag === tag) || null; }
    findById(id) { return (this.model.assets || []).find(a => a.id === id) || null; }
  }

  root.IMSStore = IMSStore; root.IMS_CONFIG_RESOLVED = CONFIG;
})(typeof self !== 'undefined' ? self : this);
