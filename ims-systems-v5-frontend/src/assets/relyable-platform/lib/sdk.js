'use strict';
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
