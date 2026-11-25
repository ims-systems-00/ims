/*  iMS OS · Inventory & Asset module · UI
 *  --------------------------------------
 *  Depends on: rules.js (IMSRules), store.js (IMSStore), qrcode.js (qrcode).
 *  All business logic lives in rules.js; this file renders and wires events.
 */
(function () {
  'use strict';
  const R = window.IMSRules, store = new window.IMSStore();
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const NOW = R.today();
  const S = () => store.model.settings || {};
  const me = () => store.me.name;

  function toast(t, bad) { const e = $('#toast'); e.textContent = t; e.style.background = bad ? 'var(--bad)' : ''; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2800); }
  function ask(title, hint, value) {
    return new Promise(res => { $('#mp-title').textContent = title; $('#mp-hint').textContent = hint || ''; const i = $('#mp-input'); i.value = value || ''; $('#m-prompt').classList.add('on'); i.focus();
      const done = v => { $('#m-prompt').classList.remove('on'); $('#mp-ok').onclick = $('#mp-cancel').onclick = null; i.onkeydown = null; res(v); };
      $('#mp-ok').onclick = () => done(i.value.trim()); $('#mp-cancel').onclick = () => done(null); i.onkeydown = e => { if (e.key === 'Enter') done(i.value.trim()); if (e.key === 'Escape') done(null); }; });
  }
  async function whoAmI() {
    if (store.me && store.me.name && store.me.name !== 'Scanner') return store.me.name;
    let n = ''; try { n = localStorage.getItem('ims-scan-name') || ''; } catch (e) { /* ignore */ }
    if (n) return n; n = await ask('Your name', 'Remembered on this device for the audit trail.'); if (n) { try { localStorage.setItem('ims-scan-name', n); } catch (e) { /* ignore */ } } return n || 'Scanner';
  }
  async function commit(asset, msg) { try { await store.commitAsset(asset); if (msg) toast(msg); } catch (e) { toast('Not saved: ' + (e.message || e.code), true); await store.reload(); } }
  async function act(asset, action, by, msg) { try { const out = await store.act(asset, action, by); if (msg) toast(typeof msg === 'function' ? msg(out) : msg); return out; } catch (e) { toast(e.message || e.code, true); if (e.status) await store.reload(); return undefined; } }

  /* ---------- QR ---------- */
  const qrUrl = a => store.scanBase + encodeURIComponent(a.tag);
  function qrSvg(text) { try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true }); } catch (e) { return `<small class="mono">${esc(text)}</small>`; } }

  /* ---------- navigation ---------- */
  const NAMES = { dash: 'Overview', reg: 'Asset register', due: 'Inspections & calibration', stock: 'Consumables & stock', qr: 'QR labels & scanning', disp: 'Disposals & retirements', comp: 'Compliance map', auditor: 'Auditor pack' };
  let scanTag = null, cur = null, stockCur = null, phoneAsset = null;
  function route() { const qp = new URLSearchParams(location.search).get('asset'); const h = location.hash.slice(1); return qp ? 'asset/' + qp : (h || 'dash'); }
  function view(v) {
    if (v.startsWith('asset/')) { scanTag = decodeURIComponent(v.slice(6)); document.body.classList.add('scan'); renderScan(); return; }
    document.body.classList.remove('scan'); if (!NAMES[v]) v = 'dash';
    $$('main > section').forEach(s => s.classList.add('hidden')); $('#v-' + v).classList.remove('hidden');
    $$('.side a[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === v)); $('#crumb').textContent = 'Inventory & assets / ' + NAMES[v];
    closeDrawer(); if (location.hash !== '#' + v) history.replaceState(null, '', location.pathname + '#' + v); render();
  }
  function closeDrawer() { $$('.drawer').forEach(d => d.classList.remove('on')); }
  addEventListener('hashchange', () => view(route()));

  /* ---------- rendering ---------- */
  const stag = st => `<span class="tag ${{ 'In service': 'ok', 'Under maintenance': 'warn', 'Quarantined': 'bad', 'Commissioned': 'info', 'Procured': 'info', 'Requested': 'grey', 'Retired': 'grey', 'Disposed': 'grey' }[st] || 'grey'}">${esc(st)}</span>`;
  const stTag = st => ({ none: '<span class="tag bad">Never done</span>', over: '<span class="tag bad">Overdue</span>', soon: '<span class="tag warn">Due soon</span>', ok: '<span class="tag ok">In date</span>' })[st];
  const filters = {};
  function render() {
    const M = store.model; if (!M) return;
    const live = M.assets.filter(a => a.stage !== 'Disposed'), act = M.assets.filter(a => R.ACTIVE.includes(a.stage));
    const all = []; act.forEach(a => R.issues(a, S(), NOW).forEach(i => all.push({ a, i })));
    const over = all.filter(x => x.i.k === 'over' || x.i.k === 'none'), soon = all.filter(x => x.i.k === 'soon');
    const lowStock = M.stock.filter(s => ['low', 'expired'].includes(R.stockState(s, NOW)));
    $('#c-reg').textContent = live.length; $('#c-due').textContent = over.length || ''; $('#c-stock').textContent = lowStock.length || '';
    $('#orgname').textContent = M.org || ''; $('#who').textContent = me();
    $('#sync').textContent = { loading: 'Loading…', ready: store.adapter.constructor.name === 'RestAdapter' ? 'Connected' : 'Local demo data', saving: 'Saving…', error: 'Save failed' }[store.status]; $('#sync').className = 'sync ' + (store.status === 'ready' ? 'live' : store.status === 'error' ? 'off' : '');

    /* overview */
    $('#dashsub').textContent = `${fmt(NOW)} · ${live.length} assets on the register · ${act.length} active · £${act.reduce((n, a) => n + (+a.cost || 0), 0).toLocaleString()} asset value in service`;
    const k = [['In service', act.filter(a => a.stage === 'In service').length, 'assets available', 'ok', 'reg'], ['Overdue checks', over.length, 'inspection, calibration or PAT', 'bad', 'due'], ['Due in 30 days', soon.length, 'scheduled', 'warn', 'due'], ['Quarantined / down', act.filter(a => ['Quarantined', 'Under maintenance'].includes(a.stage)).length, 'not for use', 'warn', 'reg'], ['Stock alerts', lowStock.length, 'low or expired', 'bad', 'stock']];
    $('#kpis').innerHTML = k.map(x => `<div class="kpi ${x[3]}" data-v="${x[4]}" role="button" tabindex="0"><small>${x[0]}</small><b>${x[1]}</b><span>${x[2]}</span></div>`).join('');
    all.sort((x, y) => R.SEVERITY[x.i.k] - R.SEVERITY[y.i.k]);
    $('#attn').innerHTML = (all.slice(0, 10).map(x => `<div><i class="${['over', 'none', 'q'].includes(x.i.k) ? 'bad' : 'warn'}">!</i><span><b>${esc(x.a.tag)}</b> ${esc(x.a.name)} · ${esc(x.i.t)}<small>${esc(x.a.cat)} · ${esc(x.a.loc)} · ${esc(x.a.cust || 'no custodian')}</small></span><button class="btn sm" data-open="${x.a.id}">Open</button></div>`).join('')
      + lowStock.map(s => `<div><i class="bad">!</i><span><b>${esc(s.code)}</b> ${esc(s.item)} · ${R.stockState(s, NOW) === 'expired' ? 'batch expired ' + fmt(s.exp) : s.qty + ' on hand, min ' + s.min}<small>Stock · ${esc(s.loc)}</small></span><button class="btn sm" data-v="stock">Open</button></div>`).join('')) || '<div><i class="ok">✓</i><span>Nothing outstanding.</span><span></span></div>';
    const RD = R.readiness(M, NOW);
    $('#ready').innerHTML = RD.map(r => `<div><i class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '!'}</i><span>${r.text}<small>${esc(r.basis)}</small></span><span class="tag grey">${r.tag}</span></div>`).join('');
    const since = R.iso(R.addDays(NOW, -90)); const recent = re => M.assets.reduce((n, a) => n + (a.hist || []).filter(h => re.test(h.what) && h.t.slice(0, 10) >= since).length, 0);
    $('#lcstats').innerHTML = [['Results recorded', recent(/recorded/)], ['Faults reported', recent(/Fault reported/)], ['Quarantined', recent(/Quarantin/)], ['Stage changes', recent(/^Stage /)], ['Scans with sightings', recent(/location confirmed/)]].map(x => `<div><span class="l">${x[0]}</span><b>${x[1]}</b></div>`).join('');
    const pass = RD.filter(r => r.ok).length;
    $('#alicesum').textContent = `${pass} of ${RD.length} audit checks pass. ${over.length} check(s) overdue, ${act.filter(a => a.stage === 'Quarantined').length} asset(s) quarantined, ${lowStock.length} stock line(s) need a purchase order. Labels printed for ${live.filter(a => a.labelled).length} of ${live.length} assets.`;

    /* register */
    const cats = Object.keys(R.CATS);
    fillSelect('#fcat', cats, 'All categories', filters.fcat); fillSelect('#fstage', R.STAGES, 'All stages', filters.fstage);
    const sites = [...new Set(M.assets.map(a => (a.loc || '').split(' · ')[0]))]; fillSelect('#fbu', sites, 'All locations', filters.fbu);
    $('#locs').innerHTML = [...new Set(M.assets.map(a => a.loc))].map(l => `<option value="${esc(l)}">`).join('');
    const qq = (filters.q || '').toLowerCase();
    const rows = M.assets.filter(a => (!qq || [a.tag, a.name, a.serial, a.loc, a.model].join(' ').toLowerCase().includes(qq)) && (!filters.fcat || a.cat === filters.fcat) && (!filters.fstage || a.stage === filters.fstage) && (!filters.fbu || (a.loc || '').startsWith(filters.fbu)) && (filters.fissue !== 'issue' || R.issues(a, S(), NOW).length) && (filters.fstage === 'Disposed' || a.stage !== 'Disposed'));
    $('#regcount').textContent = `${rows.length} shown`;
    $('#regtab tbody').innerHTML = rows.map(a => { const nx = R.nextDue(a, S(), NOW), is = R.issues(a, S(), NOW), bad = is.filter(i => ['over', 'none', 'q'].includes(i.k)).length;
      return `<tr class="click" data-open="${a.id}" tabindex="0"><td><b>${esc(a.tag)}</b></td><td>${esc(a.name)}<br><small style="color:var(--muted)">${esc(a.model)} ${esc(a.serial)}</small></td><td>${esc(a.cat)}</td><td>${esc(a.loc)}</td><td>${a.cust ? esc(a.cust) : '<span class="tag bad">None</span>'}</td><td>${stag(a.stage)}</td><td>${nx ? (nx.st === 'over' ? '<span class="tag bad">' + fmt(nx.next) + '</span>' : nx.st === 'soon' ? '<span class="tag warn">' + fmt(nx.next) + '</span>' : fmt(nx.next)) : '—'}</td><td>${bad ? `<span class="tag bad">${bad} issue${bad > 1 ? 's' : ''}</span>` : is.length ? `<span class="tag warn">${is.length} due soon</span>` : '<span class="tag ok">Compliant</span>'}</td></tr>`; }).join('') || '<tr><td colspan="8">No assets match.</td></tr>';

    /* due */
    const types = [...new Set(cats.flatMap(c => R.categoryChecks(c, S()).filter(x => x.months > 0).map(x => x.name)))]; fillSelect('#ftype', types, 'All types', filters.ftype);
    const dl = []; act.forEach(a => R.checkRows(a, S(), NOW).forEach(c => dl.push({ a, c }))); const ord = { none: 0, over: 1, soon: 2, ok: 3 }; dl.sort((x, y) => ord[x.c.st] - ord[y.c.st] || ((x.c.next || '9') < (y.c.next || '9') ? -1 : 1));
    $('#duetab tbody').innerHTML = dl.filter(x => (!filters.fdue || (filters.fdue === 'over' && (x.c.st === 'over' || x.c.st === 'none')) || (filters.fdue === 'soon' && x.c.st === 'soon')) && (!filters.ftype || x.c.name === filters.ftype)).map(x => `<tr class="click" data-open="${x.a.id}" data-tab="t-checks" tabindex="0"><td><b>${esc(x.a.tag)}</b> ${esc(x.a.name)}</td><td>${esc(x.c.name)}</td><td style="color:var(--muted);font-size:12px">${esc(x.c.basis)}</td><td>${x.c.months} mo</td><td>${fmt(x.c.last)}${x.c.by ? '<br><small style="color:var(--muted)">' + esc(x.c.by) + '</small>' : ''}</td><td>${fmt(x.c.next)}</td><td>${esc(x.c.ref) || '—'}</td><td>${x.c.st === 'over' ? '<span class="tag bad">Overdue ' + (-x.c.days) + ' d</span>' : x.c.st === 'soon' ? '<span class="tag warn">' + x.c.days + ' days</span>' : stTag(x.c.st)}</td><td><button class="btn sm">Record</button></td></tr>`).join('') || '<tr><td colspan="9">Nothing scheduled.</td></tr>';

    /* stock */
    $('#stocktab tbody').innerHTML = M.stock.map(s => { const st = R.stockState(s, NOW); return `<tr><td><b>${esc(s.code)}</b></td><td>${esc(s.item)}</td><td>${esc(s.loc)}</td><td><b>${s.qty}</b></td><td>${s.min} / ${s.max}<div class="bar ${st === 'low' ? 'bad' : 'ok'}" style="margin-top:4px"><i style="width:${Math.min(100, s.max ? s.qty / s.max * 100 : 0)}%"></i></div></td><td>${esc(s.batch) || '—'}${s.exp ? ' · ' + fmt(s.exp) : ''}</td><td>${{ expired: '<span class="tag bad">Batch expired · quarantine</span>', low: '<span class="tag bad">Below minimum · reorder</span>', expsoon: '<span class="tag warn">Expires ' + R.daysUntil(s.exp, NOW) + ' d</span>', ok: '<span class="tag ok">OK</span>' }[st]}</td><td><button class="btn sm" data-stock="${s.id}">Adjust</button></td></tr>`; }).join('') || '<tr><td colspan="8">No stock items.</td></tr>';

    /* labels */
    $('#labels').innerHTML = live.filter(a => filters.lbl !== 'new' || !a.labelled).map(a => `<div class="label click" data-phone="${a.id}" role="button" tabindex="0"><div class="q">${qrSvg(qrUrl(a))}</div><div><b>${esc(a.name)}</b><small>${esc(a.tag)} · ${esc(a.loc)}</small><span class="lorg">${esc(M.org)} · iMS OS</span></div></div>`).join('');
    if (!phoneAsset) phoneAsset = M.assets[0]; if (phoneAsset) $('#pscr').innerHTML = phoneCard(store.findById(phoneAsset.id) || M.assets[0], false);

    /* disposals */
    $('#disptab tbody').innerHTML = M.assets.filter(a => ['Retired', 'Disposed'].includes(a.stage)).map(a => `<tr class="click" data-open="${a.id}" data-tab="t-life" tabindex="0"><td><b>${esc(a.tag)}</b></td><td>${esc(a.name)}${R.isInfoAsset(a) ? ' <span class="tag info">data</span>' : ''}</td><td>${stag(a.stage)}</td><td>${esc(a.disp ? a.disp.reason : '')}</td><td>${esc(a.disp ? a.disp.route : '') || '—'}</td><td>${a.disp && a.disp.ev ? '<span class="tag ok">' + esc(a.disp.ev) + '</span>' : a.stage === 'Disposed' ? '<span class="tag bad">Missing</span>' : R.isInfoAsset(a) ? '<span class="tag warn">Data-wipe cert needed</span>' : '—'}</td><td>${esc(a.disp ? a.disp.by : '') || '—'}</td><td>${a.disp ? fmt(a.disp.date) : '—'}</td></tr>`).join('') || '<tr><td colspan="8">None.</td></tr>';

    /* compliance map */
    $('#compmap').innerHTML = cats.map(c => `<div class="card" style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><h3>${esc(c)} <span class="tag grey">${act.filter(a => a.cat === c).length} active</span></h3><span>${R.CATS[c].std.map(s => `<span class="tag info">${s}</span>`).join(' ')}</span></div><div class="map" style="margin-top:8px">${R.categoryChecks(c, S()).map(x => `<div><span>${esc(x.name)}</span><span><b>${esc(x.basis)}</b></span><span class="tag grey">${x.months ? 'every ' + x.months + ' mo' : 'each use'}</span></div>`).join('') || '<div><span>No statutory check</span><span>Register for 7.1.3 infrastructure; maintenance as needed</span><span></span></div>'}</div></div>`).join('');

    /* auditor pack */
    renderPack(M, live, act, RD);
  }
  function fillSelect(sel, opts, first, val) { const e = $(sel); e.innerHTML = `<option value="">${first}</option>` + opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join(''); e.value = val || ''; }
  function renderPack(M, live, act, RD) {
    const trs = (arr, fn) => arr.map(fn).join('') || '<tr><td colspan="9">None</td></tr>';
    $('#pack').innerHTML = `
    <div class="card" style="margin-bottom:14px"><h3>1 · Asset register</h3><p class="s">ISO 9001 7.1.3 / 7.1.5 · ISO 27001 A.5.9 · ${fmt(NOW)} · ${live.length} assets</p><div class="tablebox"><table><thead><tr><th>Tag</th><th>Asset</th><th>Category</th><th>Location</th><th>Custodian</th><th>Stage</th><th>Criticality</th></tr></thead><tbody>${trs(live, a => `<tr><td>${esc(a.tag)}</td><td>${esc(a.name)}</td><td>${esc(a.cat)}</td><td>${esc(a.loc)}</td><td>${esc(a.cust)}</td><td>${stag(a.stage)}</td><td>${esc(a.crit)}</td></tr>`)}</tbody></table></div></div>
    <div class="card" style="margin-bottom:14px"><h3>2 · Calibration status · measuring and test equipment</h3><p class="s">ISO 9001 7.1.5.2 · traceability and quarantine</p><div class="tablebox"><table><thead><tr><th>Tag</th><th>Equipment</th><th>Last calibrated</th><th>By</th><th>Certificate</th><th>Next due</th><th>Status</th></tr></thead><tbody>${trs(M.assets.filter(a => a.cat === 'Measuring & test equipment' && a.stage !== 'Disposed'), a => { const c = R.checkRows(a, S(), NOW)[0] || {}; return `<tr><td>${esc(a.tag)}</td><td>${esc(a.name)}</td><td>${fmt(c.last)}</td><td>${esc(c.by) || '—'}</td><td>${esc(c.ref) || '—'}</td><td>${fmt(c.next)}</td><td>${a.stage === 'Quarantined' ? '<span class="tag bad">Quarantined</span>' : stTag(c.st)}</td></tr>`; })}</tbody></table></div></div>
    <div class="card" style="margin-bottom:14px"><h3>3 · Statutory inspections</h3><p class="s">LOLER · PSSR · PUWER · BS 5306 · EAWR · COSHH</p><div class="tablebox"><table><thead><tr><th>Tag</th><th>Asset</th><th>Check</th><th>Basis</th><th>Last</th><th>Next</th><th>Status</th></tr></thead><tbody>${trs(act.filter(a => ['Lifting equipment', 'Pressure systems', 'Fire & safety', 'Electrical appliances', 'PPE & RPE', 'Production machinery'].includes(a.cat)).flatMap(a => R.checkRows(a, S(), NOW).map(c => ({ a, c }))), x => `<tr><td>${esc(x.a.tag)}</td><td>${esc(x.a.name)}</td><td>${esc(x.c.name)}</td><td style="font-size:12px;color:var(--muted)">${esc(x.c.basis)}</td><td>${fmt(x.c.last)}</td><td>${fmt(x.c.next)}</td><td>${stTag(x.c.st)}</td></tr>`)}</tbody></table></div></div>
    <div class="card" style="margin-bottom:14px"><h3>4 · Retirements and disposals</h3><p class="s">WEEE 2013 · ISO 27001 A.7.14 · ISO 14001 8.1</p><div class="tablebox"><table><thead><tr><th>Tag</th><th>Asset</th><th>Stage</th><th>Route</th><th>Evidence</th><th>Approved</th></tr></thead><tbody>${trs(M.assets.filter(a => ['Retired', 'Disposed'].includes(a.stage)), a => `<tr><td>${esc(a.tag)}</td><td>${esc(a.name)}</td><td>${esc(a.stage)}</td><td>${esc(a.disp ? a.disp.route : '') || '—'}</td><td>${a.disp && a.disp.ev ? esc(a.disp.ev) : '<span class="tag bad">Missing</span>'}</td><td>${a.disp ? esc(a.disp.by) + ' · ' + fmt(a.disp.date) : '—'}</td></tr>`)}</tbody></table></div></div>
    <div class="card" style="margin-bottom:14px"><h3>5 · Controlled consumables</h3><div class="tablebox"><table><thead><tr><th>Code</th><th>Item</th><th>On hand</th><th>Min</th><th>Batch / expiry</th><th>Status</th></tr></thead><tbody>${trs(M.stock, s => `<tr><td>${esc(s.code)}</td><td>${esc(s.item)}</td><td>${s.qty}</td><td>${s.min}</td><td>${esc(s.batch) || '—'}${s.exp ? ' · ' + fmt(s.exp) : ''}</td><td>${R.stockState(s, NOW) === 'ok' ? '<span class="tag ok">OK</span>' : '<span class="tag bad">' + R.stockState(s, NOW) + '</span>'}</td></tr>`)}</tbody></table></div></div>
    <div class="card"><h3>6 · Self-check against the standards</h3><div class="check" style="margin-top:8px">${RD.map(r => `<div><i class="${r.ok ? 'ok' : 'bad'}">${r.ok ? '✓' : '!'}</i><span>${r.text}<small>${esc(r.basis)}</small></span><span class="tag grey">${r.tag}</span></div>`).join('')}</div></div>`;
  }

  /* ---------- scan / phone card ---------- */
  function phoneCard(a, scan) {
    const cr = R.checkRows(a, S(), NOW), nx = R.nextDue(a, S(), NOW), ok = R.okToUse(a, S(), NOW), last = (a.hist || [])[0];
    return `<div class="hd"><i></i><b>iMS OS</b><span style="margin-left:auto;font-size:12px;color:var(--muted)">${esc(store.model.org)}</span></div>
    <div class="mono" style="font-size:11px;color:var(--muted)">${esc(a.tag)}</div><h2>${esc(a.name)}</h2>
    <div style="margin:6px 0 10px">${ok ? '<span class="tag ok">✓ OK to use</span>' : '<span class="tag bad">✕ Do not use</span>'} ${stag(a.stage)}</div>
    ${a.notes ? `<div class="notice">${esc(a.notes)}</div>` : ''}
    <div class="kv"><span>Location</span><span>${esc(a.loc)}</span><span>Custodian</span><span>${esc(a.cust) || '—'}</span><span>Category</span><span>${esc(a.cat)}</span><span>Make / serial</span><span>${esc(a.model) || '—'} ${esc(a.serial)}</span>${nx ? `<span>Next check</span><span>${esc(nx.name)} · ${fmt(nx.next)} ${nx.st === 'over' ? '<span class="tag bad">overdue</span>' : nx.st === 'soon' ? '<span class="tag warn">soon</span>' : ''}</span>` : ''}${cr.filter(c => c.last).map(c => `<span>${esc(c.name)}</span><span>${fmt(c.last)}${c.ref ? ' · ' + esc(c.ref) : ''}</span>`).join('')}</div>
    <div class="act"><button data-pa="fault" data-id="${a.id}">⚠ Report a fault</button>${R.eachUseCheck(a.cat, S()) ? `<button data-pa="preuse" data-id="${a.id}">✓ Record ${esc(R.eachUseCheck(a.cat, S())).toLowerCase()}</button>` : ''}<button data-pa="move" data-id="${a.id}">⇄ Move location</button><button data-pa="found" data-id="${a.id}">✓ Confirm seen &amp; location correct</button>${cr.length ? `<button class="p" data-pa="result" data-id="${a.id}">📋 Record inspection / calibration</button>` : ''}</div>
    <div class="sform hidden" id="sf-${a.id}"><b style="font-size:13px">Record a result</b><label>Check</label><select class="sf-type">${cr.map(c => `<option>${esc(c.name)}</option>`).join('')}</select><div class="two"><div><label>Result</label><select class="sf-res">${R.RESULTS.map(r => `<option>${r}</option>`).join('')}</select></div><div><label>Date</label><input class="sf-date" type="date" value="${R.iso(NOW)}" max="${R.iso(NOW)}"></div></div><label>Your name / company</label><input class="sf-by" placeholder="e.g. J. Lee, or Chubb engineer"><label>Certificate / report ref</label><input class="sf-ref"><div class="row" style="margin-top:10px"><button class="btn p sm" data-pa="saveresult" data-id="${a.id}">Save result</button><button class="btn sm" data-pa="cancel" data-id="${a.id}">Cancel</button></div></div>
    <div style="margin-top:12px;font-size:12px;color:var(--muted)">Last activity: ${last ? esc(last.what.slice(0, 100)) + (last.what.length > 100 ? '…' : '') + ' · ' + last.t.slice(0, 10) : '—'}</div>
    <p class="hint" style="text-align:center;margin-top:10px">${scan ? 'Scanned view. Anyone can see status; actions are recorded with your name.' : 'Phone view after scanning.'}</p>`;
  }
  function renderScan() {
    const a = store.findByTag(scanTag), el = $('#scanview');
    if (!a) { el.innerHTML = `<div class="scard"><div class="hd"><i></i><b>iMS OS</b></div><h2>Asset not found</h2><p class="hint">No asset with tag ${esc(scanTag)} on this register.</p><a class="btn" href="#reg" style="margin-top:10px;display:inline-block">Open the register</a></div>`; return; }
    el.innerHTML = `<div class="scard">${phoneCard(a, true)}</div><div class="row" style="justify-content:space-between;margin-top:12px"><span class="sync ${store.status === 'ready' ? 'live' : ''}">${$('#sync').textContent}</span><a href="${location.pathname}#reg" class="btn sm">Open full module</a></div>`;
  }
  function refresh(a) { render(); if (document.body.classList.contains('scan')) renderScan(); else if (phoneAsset && a && phoneAsset.id === a.id) $('#pscr').innerHTML = phoneCard(a, false); }

  /* ---------- asset drawer ---------- */
  function openAsset(id, tab) {
    cur = store.findById(id); if (!cur) return; const a = cur;
    $('#a-name').textContent = a.tag + ' · ' + a.name;
    $('#a-tags').innerHTML = `${stag(a.stage)}<span class="tag info">${esc(a.crit)}</span><span class="tag grey">${esc(a.cat)}</span>${R.isInfoAsset(a) ? '<span class="tag info">Information asset</span>' : ''}${R.issues(a, S(), NOW).map(i => `<span class="tag ${['over', 'none', 'q'].includes(i.k) ? 'bad' : 'warn'}">${esc(i.t)}</span>`).join('')}`;
    const si = R.STAGES.indexOf(a.stage); $('#a-lc').innerHTML = R.STAGES.map((s, i) => `<span class="${i < si ? 'done' : i === si ? 'on' : ''}">${s}</span>`).join('');
    fillSelect('#f-cat', Object.keys(R.CATS), '— choose —', a.cat); fillSelect('#f-crit', R.CRITICALITY, '— choose —', a.crit);
    ['tag', 'name', 'model', 'serial', 'loc', 'cust', 'pdate', 'cost', 'sup', 'warr', 'notes'].forEach(k => { $('#f-' + k).value = a[k] == null ? '' : a[k]; }); $('#f-info').value = a.info || 'No'; $('#f-problems').textContent = '';
    const cr = R.checkRows(a, S(), NOW);
    $('#a-checks').innerHTML = cr.length ? `<div class="ev">${cr.map(c => `<div><span class="l"><b>${esc(c.name)}</b><small>${esc(c.basis)} · every ${c.months} months</small><small>Last ${fmt(c.last)}${c.by ? ' by ' + esc(c.by) : ''}${c.ref ? ' · ' + esc(c.ref) : ''} · next ${fmt(c.next)}</small></span>${stTag(c.st)}</div>`).join('')}</div>` : '<p class="note">No scheduled checks for this category.</p>';
    fillSelect('#nc-type', cr.map(c => c.name), '— choose —', cr[0] && cr[0].name); fillSelect('#nc-res', R.RESULTS, '— choose —', 'Pass'); $('#nc-date').value = R.iso(NOW); $('#nc-date').max = R.iso(NOW); $('#nc-by').value = ''; $('#nc-ref').value = '';
    $('#a-hist').innerHTML = (a.hist || []).map(h => `<div><span>${esc(h.t).replace('T', ' ')}</span><div>${esc(h.what)}<br><small style="color:var(--muted)">${esc(h.by)}</small></div></div>`).join('') || '<p class="note">No history.</p>';
    fillSelect('#lf-stage', R.STAGES, '— choose —', a.stage); fillSelect('#lf-route', R.DISPOSAL_ROUTES, '— choose —', R.DISPOSAL_ROUTES[0]); $('#lf-reason').value = ''; $('#lf-by').value = ''; $('#lf-ev').value = ''; $('#lf-disp').classList.toggle('hidden', a.stage !== 'Disposed');
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === (tab || 't-over'))); $$('.tp').forEach(p => p.classList.toggle('on', p.id === (tab || 't-over')));
    $('#d-asset').classList.add('on');
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async e => {
    const t = e.target;
    const nav = t.closest('[data-v]'); if (nav) { e.preventDefault(); view(nav.dataset.v); return; }
    if (t.closest('[data-close]')) { closeDrawer(); render(); return; }
    if (t.closest('[data-mclose]')) { $$('.modal').forEach(m => m.classList.remove('on')); return; }
    const tab = t.closest('.tabs button'); if (tab) { $$('.tabs button').forEach(b => b.classList.toggle('on', b === tab)); $$('.tp').forEach(p => p.classList.toggle('on', p.id === tab.dataset.t)); return; }
    const op = t.closest('[data-open]'); if (op && !t.closest('[data-pa]')) { openAsset(op.dataset.open, op.dataset.tab); return; }
    const ph = t.closest('[data-phone]'); if (ph) { phoneAsset = store.findById(ph.dataset.phone); $('#pscr').innerHTML = phoneCard(phoneAsset, false); return; }
    const sk = t.closest('[data-stock]'); if (sk) { stockCur = store.model.stock.find(x => x.id === sk.dataset.stock); $('#ms-title').textContent = 'Adjust · ' + stockCur.item; $('#ms-qty').value = 1; $('#ms-ref').value = ''; $('#ms-batch').value = ''; $('#ms-exp').value = ''; $('#m-stock').classList.add('on'); return; }
    const pa = t.closest('[data-pa]'); if (pa) { await phoneAction(pa.dataset.pa, store.findById(pa.dataset.id)); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr.click,[data-phone],.kpi')) e.target.click(); if (e.key === 'Escape') { closeDrawer(); $$('.modal').forEach(m => m.classList.remove('on')); } });
  async function phoneAction(kind, a) {
    if (!a) return;
    if (kind === 'fault') { const r = await ask('Describe the fault', 'The asset is marked do-not-use and the custodian gets a task.'); if (!r) return; const n = await whoAmI(); await act(a, { type: 'fault', description: r }, n, 'Fault logged · asset marked do-not-use'); refresh(a); }
    if (kind === 'preuse') { const n = await whoAmI(); await act(a, { type: 'eachUse' }, n, 'Check recorded'); refresh(a); }
    if (kind === 'move') { const r = await ask('New location', 'Site · area', a.loc); if (!r || r === a.loc) return; const n = await whoAmI(); await act(a, { type: 'move', loc: r }, n, 'Location updated'); refresh(a); }
    if (kind === 'found') { const n = await whoAmI(); await act(a, { type: 'sighting' }, n, 'Thanks · sighting logged'); refresh(a); }
    if (kind === 'result') { const f = document.getElementById('sf-' + a.id); if (f) { f.classList.remove('hidden'); f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }
    if (kind === 'cancel') { const f = document.getElementById('sf-' + a.id); if (f) f.classList.add('hidden'); }
    if (kind === 'saveresult') { const f = document.getElementById('sf-' + a.id); const by = f.querySelector('.sf-by').value.trim() || await whoAmI();
      const nx = await act(a, { type: 'result', check: f.querySelector('.sf-type').value, result: f.querySelector('.sf-res').value, date: f.querySelector('.sf-date').value, ref: f.querySelector('.sf-ref').value.trim() }, by, o => `Recorded · next due ${fmt(o && o.next)}`); if (nx !== undefined) refresh(a); }
  }
  $('#a-save').onclick = async () => { const a = cur, before = JSON.stringify(a); const draft = Object.assign({}, a); ['tag', 'name', 'model', 'serial', 'loc', 'cust', 'pdate', 'cost', 'sup', 'warr', 'notes'].forEach(k => { draft[k] = $('#f-' + k).value.trim(); }); draft.cat = $('#f-cat').value; draft.crit = $('#f-crit').value; draft.info = $('#f-info').value;
    const problems = R.validateAsset(draft); if (store.model.assets.some(x => x.id !== a.id && x.tag === draft.tag)) problems.push('tag: already used'); if (problems.length) { $('#f-problems').textContent = problems.join(' · '); return; }
    const changed = Object.keys(draft).filter(k => String(draft[k] || '') !== String(a[k] || ''));
    if (draft.cat !== a.cat) { draft.checks = {}; } Object.assign(a, draft); if (changed.length) R.history(a, 'Updated: ' + changed.join(', '), me());
    if (JSON.stringify(a) !== before) await commit(a, 'Saved'); render(); openAsset(a.id); };
  $('#a-fault').onclick = () => phoneAction('fault', cur).then(() => openAsset(cur.id));
  $('#a-move').onclick = () => phoneAction('move', cur).then(() => openAsset(cur.id));
  $('#nc-add').onclick = async () => { const a = cur; const nx = await act(a, { type: 'result', check: $('#nc-type').value, result: $('#nc-res').value, date: $('#nc-date').value, ref: $('#nc-ref').value.trim() }, $('#nc-by').value.trim() || me(), o => `Recorded · next due ${fmt(o && o.next)}`); if (nx !== undefined) { render(); openAsset(a.id, 't-checks'); } };
  $('#lf-stage').onchange = () => $('#lf-disp').classList.toggle('hidden', $('#lf-stage').value !== 'Disposed');
  $('#lf-go').onclick = async () => { const a = cur; const r = await act(a, { type: 'stage', stage: $('#lf-stage').value, reason: $('#lf-reason').value.trim(), approvedBy: $('#lf-by').value.trim(), route: $('#lf-route').value, evidence: $('#lf-ev').value.trim() }, me(), 'Stage updated and logged'); if (r !== undefined) { render(); openAsset(a.id, 't-life'); } };
  $('#a-qr').onclick = () => { const a = cur; $('#mq-title').textContent = 'QR label · ' + a.tag; $('#mq-q').innerHTML = qrSvg(qrUrl(a)); $('#mq-name').textContent = a.name; $('#mq-tag').textContent = a.tag + ' · ' + a.loc; $('#mq-url').textContent = qrUrl(a); $('#m-qr').classList.add('on'); $('#mq-view').onclick = () => { $('#m-qr').classList.remove('on'); location.hash = '#asset/' + encodeURIComponent(a.tag); }; };
  $('#mq-print').onclick = $('#printlbl').onclick = $('#printpack').onclick = () => window.print();
  $('#addasset').onclick = async () => { const n = store.model.assets.length + 1; const a = { id: R.uid(), tag: 'NEW-' + String(n).padStart(3, '0'), name: 'New asset', cat: 'Production machinery', loc: (store.model.assets[0] || {}).loc || 'Main site', cust: '', stage: 'Requested', crit: 'Standard', model: '', serial: '', pdate: '', cost: '', sup: '', warr: '', info: 'No', notes: '', labelled: false, checks: {}, hist: [], disp: null }; R.history(a, 'Created (Requested)', me()); try { await store.createAsset(a); } catch (e) { toast('Not created: ' + e.message, true); return; } render(); openAsset(a.id); $('#f-name').focus(); $('#f-name').select(); };
  $('#ms-type').onchange = () => $('#ms-batchrow').style.display = $('#ms-type').value === 'receive' ? '' : 'none'; $('#ms-type').onchange();
  $('#ms-go').onclick = async () => { const s = stockCur; try { const r = await store.stockMove(s, { type: $('#ms-type').value, qty: $('#ms-qty').value, ref: $('#ms-ref').value.trim(), batch: $('#ms-batch').value.trim(), exp: $('#ms-exp').value }, me()); $('#m-stock').classList.remove('on'); render(); toast(r.state === 'low' ? 'Recorded · below minimum: purchase task raised' : 'Recorded'); } catch (err) { toast(err.message, true); } };
  $('#addstock').onclick = async () => { const item = await ask('Item description'); if (!item) return; const s = { id: R.uid(), code: 'C-' + String(store.model.stock.length + 1).padStart(3, '0'), item, loc: 'Stores', qty: 0, min: 1, max: 10, batch: '', exp: null, moves: [] }; store.model.stock.push(s); await store.commitStock(s); render(); toast('Item added · set levels via Adjust'); };
  $('#marklbl').onclick = async () => { for (const a of store.model.assets.filter(a => a.stage !== 'Disposed' && !a.labelled)) { a.labelled = true; await store.commitAsset(a); } render(); toast('Labels marked printed'); };
  [['q', 'q'], ['fcat', 'fcat'], ['fstage', 'fstage'], ['fbu', 'fbu'], ['fissue', 'fissue'], ['fdue', 'fdue'], ['ftype', 'ftype'], ['lblfilter', 'lbl']].forEach(([id, k]) => $('#' + id).addEventListener('input', e => { filters[k] = e.target.value; render(); }));
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  $('#exportcsv').onclick = e => { e.preventDefault(); download('asset-register.csv', R.registerCsv(store.model, store.scanBase, NOW), 'text/csv'); };
  $('#exportdue').onclick = e => { e.preventDefault(); download('inspection-schedule.csv', R.scheduleCsv(store.model, NOW), 'text/csv'); };
  $('#exportjson').onclick = e => { e.preventDefault(); download('ims-assets.json', JSON.stringify(store.model, null, 2), 'application/json'); };
  $('#resetdata').onclick = async e => { e.preventDefault(); if (store.adapter.constructor.name === 'RestAdapter') return toast('Not available when connected to iMS OS'); if (confirm('Replace everything with the sample data?')) { await store.reset(); render(); toast('Sample data restored'); } };

  /* ---------- start ---------- */
  store.onChange(() => { if (store.model && store.status === 'ready' && !document.querySelector('.drawer.on') && !document.querySelector('.modal.on')) { render(); if (document.body.classList.contains('scan')) renderScan(); } if (store.model) { const s = $('#sync'); s.textContent = { ready: store.adapter.constructor.name === 'RestAdapter' ? 'Connected' : 'Local demo data', saving: 'Saving…', error: 'Save failed', loading: 'Loading…' }[store.status]; s.className = 'sync ' + (store.status === 'ready' ? 'live' : store.status === 'error' ? 'off' : ''); } });
  store.load().then(() => { view(route()); store.startSync(20000); }).catch(e => { $('#sync').textContent = 'Could not load: ' + e.message; $('#sync').className = 'sync off'; });
})();
