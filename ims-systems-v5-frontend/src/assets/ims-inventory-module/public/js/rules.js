/*  iMS OS · Inventory & Asset module · shared rules
 *  ------------------------------------------------
 *  Pure functions, no DOM, no I/O. Loaded by the browser (window.IMSRules)
 *  and by the server (require('./rules')). Keep them identical: the UI
 *  shows what the server will enforce.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IMSRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- dates ---------- */
  /* All calendar maths is done in UTC on 'YYYY-MM-DD' dates so results do not shift with the server or phone timezone. */
  const iso = d => { const x = d instanceof Date ? d : new Date(d); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
  const today = () => { const t = new Date(); return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())); };
  const addMonths = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
  const daysUntil = (d, from) => Math.round((new Date(d) - (from || today())) / 864e5);
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

  /* ---------- lifecycle ---------- */
  const STAGES = ['Requested', 'Procured', 'Commissioned', 'In service', 'Under maintenance', 'Quarantined', 'Retired', 'Disposed'];
  const ACTIVE = ['Commissioned', 'In service', 'Under maintenance', 'Quarantined'];
  const DISPOSAL_ROUTES = ['WEEE recycling (licensed carrier)', 'Resale', 'Scrap metal (licensed)', 'Return to lessor', 'Hazardous waste contractor'];
  const CRITICALITY = ['Critical', 'High', 'Standard'];
  const RESULTS = ['Pass', 'Pass with observations', 'Fail · quarantined'];

  /* ---------- category rules: [check name, interval months (0 = each use), basis] ----------
     Defaults are UK statutory / good-practice intervals. Tenants may override `intervalMonths`
     per category via settings.categoryOverrides = { "<category>": { "<check>": months } }. */
  const CATS = {
    'Lifting equipment':           { std: ['ISO 45001'], checks: [['Thorough examination', 6, 'LOLER 1998 reg 9 · ISO 45001 8.1'], ['Pre-use check', 0, 'PUWER 1998 · daily, recorded by exception']] },
    'Pressure systems':            { std: ['ISO 45001'], checks: [['Written scheme examination', 12, 'PSSR 2000 · ISO 45001 8.1']] },
    'Production machinery':        { std: ['ISO 9001', 'ISO 45001'], checks: [['Planned maintenance', 3, 'ISO 9001 7.1.3 · PUWER'], ['Guarding & safety inspection', 12, 'PUWER 1998 reg 11']] },
    'Measuring & test equipment':  { std: ['ISO 9001'], checks: [['Calibration', 12, 'ISO 9001 7.1.5 · traceable to national standards']] },
    'Fire & safety':               { std: ['ISO 45001'], checks: [['Service by competent person', 12, 'BS 5306-3 · RRFSO 2005'], ['Visual check', 1, 'BS 5306-3 monthly']] },
    'Electrical appliances':       { std: ['ISO 45001'], checks: [['Portable appliance test', 12, 'EAWR 1989 · IET Code of Practice']] },
    'IT & information assets':     { std: ['ISO 27001'], checks: [['Patch & configuration review', 3, 'ISO 27001 A.8.8 / A.8.9'], ['Asset ownership review', 12, 'ISO 27001 A.5.9']] },
    'Vehicles':                    { std: ['ISO 45001', 'ISO 14001'], checks: [['MOT', 12, 'Road Traffic Act'], ['Service', 6, 'Manufacturer schedule · FORS'], ['Daily walk-round', 0, 'DVSA · recorded by exception']] },
    'Environmental plant':         { std: ['ISO 14001'], checks: [['Emissions / discharge check', 6, 'Environmental permit · ISO 14001 8.1'], ['Bund & spill kit inspection', 3, 'Oil Storage Regs 2001']] },
    'PPE & RPE':                   { std: ['ISO 45001'], checks: [['Face-fit / thorough examination', 1, 'COSHH reg 9 · HSG53 monthly']] },
    'Furniture & facilities':      { std: [], checks: [] },
  };

  function categoryChecks(cat, settings) {
    const c = CATS[cat]; if (!c) return [];
    const ov = (settings && settings.categoryOverrides && settings.categoryOverrides[cat]) || {};
    return c.checks.map(([name, months, basis]) => ({ name, months: ov[name] != null ? ov[name] : months, basis }));
  }
  function eachUseCheck(cat, settings) { const c = categoryChecks(cat, settings).find(x => x.months === 0); return c ? c.name : null; }

  /* ---------- scheduled checks ---------- */
  function checkRows(asset, settings, now) {
    const lead = (settings && settings.leadDays) || 30; now = now || today();
    return categoryChecks(asset.cat, settings).filter(c => c.months > 0).map(c => {
      const r = (asset.checks && asset.checks[c.name]) || {};
      const base = r.last || asset.pdate || null;
      const next = base ? iso(addMonths(new Date(base), c.months)) : null;
      const d = next ? daysUntil(next, now) : null;
      const st = !r.last && !asset.pdate ? 'none' : !r.last ? 'none' : d < 0 ? 'over' : d <= lead ? 'soon' : 'ok';
      return { name: c.name, months: c.months, basis: c.basis, last: r.last || null, by: r.by || '', ref: r.ref || '', result: r.result || '', next, days: d, st };
    });
  }
  function nextDue(asset, settings, now) { return checkRows(asset, settings, now).filter(c => c.next).sort((a, b) => a.next < b.next ? -1 : 1)[0] || null; }

  /* ---------- issues an auditor would raise ---------- */
  function issues(asset, settings, now) {
    const out = [];
    if (['Retired', 'Disposed', 'Requested', 'Procured'].includes(asset.stage)) return out;
    checkRows(asset, settings, now).forEach(c => {
      if (c.st === 'over') out.push({ k: 'over', t: `${c.name} overdue since ${c.next}`, check: c.name });
      else if (c.st === 'none') out.push({ k: 'none', t: `${c.name} never recorded`, check: c.name });
      else if (c.st === 'soon') out.push({ k: 'soon', t: `${c.name} due ${c.next}`, check: c.name });
    });
    if (asset.stage === 'Quarantined') out.push({ k: 'q', t: 'Quarantined · not for use' });
    if (asset.stage === 'Under maintenance') out.push({ k: 'm', t: 'Under maintenance' });
    if (!asset.cust) out.push({ k: 'cust', t: isInfoAsset(asset) ? 'Information asset without owner (ISO 27001 A.5.9)' : 'No custodian' });
    return out;
  }
  const SEVERITY = { over: 0, none: 1, q: 2, m: 3, cust: 4, soon: 5 };
  const isInfoAsset = a => !!(a.info && String(a.info).startsWith('Yes'));
  const okToUse = (a, settings, now) => ACTIVE.includes(a.stage) && !issues(a, settings, now).some(i => ['over', 'none', 'q', 'm'].includes(i.k));

  /* ---------- stock ---------- */
  function stockState(item, now) {
    if (item.exp && daysUntil(item.exp, now) < 0) return 'expired';
    if (item.qty <= item.min) return 'low';
    if (item.exp && daysUntil(item.exp, now) <= 30) return 'expsoon';
    return 'ok';
  }
  function applyStockMove(item, move, by, now) {
    const q = Math.max(0, Number(move.qty) || 0); const before = item.qty;
    switch (move.type) {
      case 'issue': item.qty = Math.max(0, item.qty - q); break;
      case 'receive': item.qty += q; if (move.batch) item.batch = move.batch; if (move.exp) item.exp = move.exp; break;
      case 'count': item.qty = q; break;
      case 'quarantine': case 'dispose': item.qty = Math.max(0, item.qty - q); if (move.type === 'dispose' && item.qty === 0) { item.exp = null; item.batch = ''; } break;
      default: throw err('invalid_move', 'Unknown stock movement type');
    }
    item.moves = item.moves || [];
    item.moves.unshift({ t: iso(now || today()), by, what: `${move.type} ${q} (${before} → ${item.qty})${move.ref ? ' · ' + move.ref : ''}` });
    return { before, after: item.qty, state: stockState(item, now) };
  }

  /* ---------- mutations (validated; return the history line) ---------- */
  function err(code, message) { const e = new Error(message); e.code = code; return e; }
  function history(asset, what, by, now) { asset.hist = asset.hist || []; asset.hist.unshift({ t: (now || new Date()).toISOString().slice(0, 16), by: by || 'system', what }); }

  function applyResult(asset, input, by, settings, now) {
    const checks = categoryChecks(asset.cat, settings).map(c => c.name);
    if (!checks.includes(input.check)) throw err('invalid_check', `"${input.check}" is not a check for ${asset.cat}`);
    if (!RESULTS.includes(input.result)) throw err('invalid_result', 'Result must be one of ' + RESULTS.join(', '));
    const date = input.date || iso(now || today());
    if (new Date(date) > addDays(now || today(), 1)) throw err('invalid_date', 'Result date cannot be in the future');
    asset.checks = asset.checks || {};
    asset.checks[input.check] = { last: date, by: by || '', ref: input.ref || '', result: input.result, fileId: input.fileId || null };
    if (/Fail/.test(input.result)) {
      asset.stage = 'Quarantined';
      history(asset, `${input.check} recorded: FAIL. Quarantined; validity of previous results to be assessed (ISO 9001 7.1.5.2).`, by, now);
    } else {
      if (asset.stage === 'Quarantined') asset.stage = 'In service';
      history(asset, `${input.check} recorded: ${input.result}${input.ref ? ' · ' + input.ref : ''}`, by, now);
    }
    return nextDue(asset, settings, now);
  }

  function recordEachUse(asset, by, settings, now) {
    const name = eachUseCheck(asset.cat, settings);
    if (name) { asset.checks = asset.checks || {}; asset.checks[name] = { last: iso(now || today()), by, ref: '', result: 'Pass' }; }
    history(asset, `${name || 'Pre-use check'} recorded: OK`, by, now);
    return name;
  }

  function reportFault(asset, description, by, now) {
    if (!description || !description.trim()) throw err('invalid_argument', 'Describe the fault');
    asset.stage = 'Under maintenance';
    history(asset, `Fault reported: ${description.trim()}. Moved to Under maintenance; task for ${asset.cust || 'custodian'}.`, by, now);
  }

  function moveLocation(asset, loc, by, now) {
    loc = (loc || '').trim(); if (!loc) throw err('invalid_argument', 'Location is required');
    if (loc === asset.loc) return false;
    history(asset, `Moved ${asset.loc} → ${loc}`, by, now); asset.loc = loc; return true;
  }

  function validateStageMove(asset, input) {
    const s = input.stage;
    if (!STAGES.includes(s)) throw err('invalid_stage', 'Unknown stage');
    if (s === asset.stage) throw err('no_change', 'Already at that stage');
    if (['Retired', 'Disposed'].includes(s)) {
      if (!input.reason || !input.approvedBy) throw err('approval_required', 'Reason and approver are required for retirement or disposal');
    }
    if (s === 'Disposed') {
      if (!DISPOSAL_ROUTES.includes(input.route)) throw err('route_required', 'Disposal route is required');
      if (!input.evidence) throw err('evidence_required', 'Disposal evidence reference (waste transfer note, certificate) is required');
      if (isInfoAsset(asset) && !/wipe|destruct|cert|sanit/i.test(input.evidence)) throw err('data_wipe_required', 'Information asset: reference the data-wipe or destruction certificate (ISO 27001 A.7.14)');
    }
    return true;
  }
  function moveStage(asset, input, by, now) {
    validateStageMove(asset, input);
    const from = asset.stage; const s = input.stage;
    if (s === 'Disposed') asset.disp = { reason: input.reason, route: input.route, ev: input.evidence, by: input.approvedBy, date: iso(now || today()) };
    else if (s === 'Retired') asset.disp = { reason: input.reason, route: '', ev: '', by: input.approvedBy, date: iso(now || today()) };
    history(asset, `Stage ${from} → ${s}${input.reason ? ': ' + input.reason : ''}${input.approvedBy ? ' · approved by ' + input.approvedBy : ''}`, by, now);
    asset.stage = s;
  }

  function validateAsset(a) {
    const problems = [];
    if (!a.tag || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,30}$/.test(a.tag)) problems.push('tag: 2–31 chars, letters, digits, . _ -');
    if (!a.name || !a.name.trim()) problems.push('name is required');
    if (!CATS[a.cat]) problems.push('cat: unknown category');
    if (!STAGES.includes(a.stage)) problems.push('stage: unknown');
    if (!CRITICALITY.includes(a.crit)) problems.push('crit: unknown');
    if (!a.loc || !a.loc.trim()) problems.push('loc is required');
    if (ACTIVE.includes(a.stage) && !a.cust) problems.push('cust: active assets need a custodian');
    return problems;
  }

  /* ---------- audit readiness ---------- */
  function readiness(model, now) {
    const S = model.settings || {}; const all = model.assets || [];
    const live = all.filter(a => a.stage !== 'Disposed'); const act = all.filter(a => ACTIVE.includes(a.stage));
    const cat = c => act.filter(a => a.cat === c);
    const inDate = a => checkRows(a, S, now).every(c => c.st === 'ok' || c.st === 'soon');
    const mte = cat('Measuring & test equipment'); const info = act.filter(isInfoAsset);
    const stock = (model.stock || []).filter(s => ['low', 'expired'].includes(stockState(s, now)));
    return [
      { id: 'identify', ok: live.every(a => a.tag && a.loc && a.cust), text: 'Register identifies each asset uniquely with location and custodian', basis: 'ISO 9001 7.1.3 · 27001 A.5.9', tag: '9001' },
      { id: 'cal', ok: mte.filter(a => a.stage !== 'Quarantined').every(inDate), text: 'Measuring equipment calibrated, traceable, within date', basis: 'ISO 9001 7.1.5', tag: '7.1.5' },
      { id: 'cal-q', ok: mte.filter(a => checkRows(a, S, now).some(c => c.st === 'over')).every(a => a.stage === 'Quarantined'), text: 'Out-of-calibration or failed equipment is quarantined and its use assessed', basis: 'ISO 9001 7.1.5.2', tag: '7.1.5' },
      { id: 'loler', ok: cat('Lifting equipment').every(a => checkRows(a, S, now).every(c => c.st !== 'over' && c.st !== 'none')), text: 'Lifting equipment thoroughly examined within interval', basis: 'LOLER reg 9 · ISO 45001 8.1', tag: '45001' },
      { id: 'pssr', ok: cat('Pressure systems').every(inDate), text: 'Pressure systems have a written scheme and are within examination date', basis: 'PSSR 2000', tag: '45001' },
      { id: 'fire', ok: cat('Fire & safety').every(a => checkRows(a, S, now).every(c => c.st !== 'over' && c.st !== 'none')), text: 'Fire extinguishers serviced annually and checked monthly', basis: 'BS 5306-3 · RRFSO', tag: '45001' },
      { id: 'info', ok: info.every(a => a.cust) && all.filter(a => isInfoAsset(a) && a.stage === 'Disposed').every(a => a.disp && a.disp.ev), text: 'Information assets have an owner and secure-disposal evidence', basis: 'ISO 27001 A.5.9 · A.7.14', tag: '27001' },
      { id: 'weee', ok: all.filter(a => a.stage === 'Disposed').every(a => a.disp && a.disp.route && a.disp.ev), text: 'Disposals carry route and evidence (WEEE / waste transfer)', basis: 'WEEE 2013 · ISO 14001 8.1', tag: '14001' },
      { id: 'stock', ok: stock.length === 0, text: 'Controlled consumables within expiry and above minimum', basis: `${stock.length} item(s) low or expired`, tag: '7.1.5' },
      { id: 'records', ok: all.every(a => a.hist && a.hist.length), text: 'Lifecycle changes logged with who, when and why', basis: 'Records · ISO 9001 7.5.3', tag: 'Records' },
    ];
  }

  /* ---------- exports ---------- */
  function registerCsv(model, qrBase, now) {
    const S = model.settings || {};
    const rows = [['Tag', 'Asset', 'Category', 'Location', 'Custodian', 'Stage', 'Criticality', 'Make/model', 'Serial', 'Purchased', 'Cost', 'Supplier', 'Information asset', 'Next due', 'Issues', 'QR URL']];
    (model.assets || []).forEach(a => { const nx = nextDue(a, S, now); rows.push([a.tag, a.name, a.cat, a.loc, a.cust, a.stage, a.crit, a.model, a.serial, a.pdate, a.cost, a.sup, a.info, nx ? nx.next : '', issues(a, S, now).map(i => i.t).join('; '), (qrBase || '') + a.tag]); });
    return csv(rows);
  }
  function scheduleCsv(model, now) {
    const S = model.settings || {}; const rows = [['Tag', 'Asset', 'Check', 'Basis', 'Interval (months)', 'Last', 'By', 'Certificate', 'Next due', 'Status']];
    (model.assets || []).filter(a => ACTIVE.includes(a.stage)).forEach(a => checkRows(a, S, now).forEach(c => rows.push([a.tag, a.name, c.name, c.basis, c.months, c.last, c.by, c.ref, c.next, c.st])));
    return csv(rows);
  }
  const csv = rows => rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');

  return { iso, today, addMonths, addDays, daysUntil, uid, STAGES, ACTIVE, DISPOSAL_ROUTES, CRITICALITY, RESULTS, CATS, SEVERITY,
    categoryChecks, eachUseCheck, checkRows, nextDue, issues, isInfoAsset, okToUse, stockState, applyStockMove,
    history, applyResult, recordEachUse, reportFault, moveLocation, validateStageMove, moveStage, validateAsset, readiness, registerCsv, scheduleCsv, csv };
});
