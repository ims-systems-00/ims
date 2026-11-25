'use strict';
// Builds public/standalone.html: the site + the whole platform running in the page (state in localStorage).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const mods = {
  'lib/scope.js':'./scope', 'lib/ledger.js':'./ledger', 'lib/score.js':'./score', 'lib/store.js':'./store', 'lib/registry.js':'./registry', 'lib/identity.js':'./identity', 'lib/reports.js':'./reports', 'lib/ingest.js':'./ingest', 'lib/connectors/companies-house.js':'./connectors/companies-house', 'lib/connectors/registers.js':'./connectors/registers', 'lib/sdk.js':'./sdk', 'server/app.js':'../server/app'
};
const shims = `
var __mods={}, __cache={}; var process={env:{}};
function __norm(from,p){ if(!p.startsWith('.')) return p; var parts=(from.split('/').slice(0,-1).join('/')+'/'+p).split('/'), out=[]; for(var s of parts){ if(s==='..') out.pop(); else if(s!=='.' && s!=='') out.push(s);} return out.join('/').replace(/\\.js$/,''); }
function __require(from,p){ var id=__norm(from,p); if(__cache[id]) return __cache[id].exports; if(!__mods[id]) throw new Error('module '+id+' ('+p+' from '+from+')'); var m={exports:{}}; __cache[id]=m; __mods[id](m, m.exports, function(q){ return __require(id+'.js', q); }); return m.exports; }
// ---- crypto shim (sync SHA-256, HMAC, random)
function __sha256(msg){ var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]; var b=msg instanceof Uint8Array?msg:new TextEncoder().encode(String(msg)); var l=b.length; var L=((l+9+63)>>6)<<6; var p=new Uint8Array(L); p.set(b); p[l]=0x80; var dv=new DataView(p.buffer); dv.setUint32(L-4,(l*8)>>>0); dv.setUint32(L-8,Math.floor(l*8/4294967296)); var w=new Uint32Array(64);
 for(var i=0;i<L;i+=64){ for(var t=0;t<16;t++) w[t]=dv.getUint32(i+t*4); for(t=16;t<64;t++){ var s0=((w[t-15]>>>7)|(w[t-15]<<25))^((w[t-15]>>>18)|(w[t-15]<<14))^(w[t-15]>>>3); var s1=((w[t-2]>>>17)|(w[t-2]<<15))^((w[t-2]>>>19)|(w[t-2]<<13))^(w[t-2]>>>10); w[t]=(w[t-16]+s0+w[t-7]+s1)>>>0; }
  var a=H[0],bb=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7]; for(t=0;t<64;t++){ var S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); var ch=(e&f)^(~e&g); var t1=(h+S1+ch+K[t]+w[t])>>>0; var S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); var mj=(a&bb)^(a&c)^(bb&c); var t2=(S0+mj)>>>0; h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=bb;bb=a;a=(t1+t2)>>>0; }
  H[0]=(H[0]+a)>>>0;H[1]=(H[1]+bb)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0; }
 var out=new Uint8Array(32); for(i=0;i<8;i++){ out[i*4]=H[i]>>>24; out[i*4+1]=(H[i]>>>16)&255; out[i*4+2]=(H[i]>>>8)&255; out[i*4+3]=H[i]&255; } return out; }
function __hex(u){ return Array.from(u).map(function(x){return x.toString(16).padStart(2,'0');}).join(''); }
function __b64url(u){ var s=''; for(var i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''); }
function __enc(x){ return x instanceof Uint8Array?x:new TextEncoder().encode(String(x)); }
function __digester(fn){ var parts=[]; var o={update:function(x){ parts.push(__enc(x)); return o; }, digest:function(enc){ var n=parts.reduce(function(a,p){return a+p.length;},0), all=new Uint8Array(n), off=0; parts.forEach(function(p){ all.set(p,off); off+=p.length; }); var d=fn(all); return enc==='hex'?__hex(d):enc==='base64url'?__b64url(d):d; }}; return o; }
function __hmac(key,msg){ var k=__enc(key); if(k.length>64) k=__sha256(k); var kp=new Uint8Array(64); kp.set(k); var ipad=new Uint8Array(64+msg.length), opad=new Uint8Array(64+32); for(var i=0;i<64;i++){ ipad[i]=kp[i]^0x36; opad[i]=kp[i]^0x5c; } ipad.set(msg,64); opad.set(__sha256(ipad),64); return __sha256(opad); }
var __crypto={ createHash:function(){ return __digester(__sha256); }, createHmac:function(alg,key){ return __digester(function(m){ return __hmac(key,m); }); }, randomBytes:function(n){ var u=new Uint8Array(n); crypto.getRandomValues(u); return {toString:function(enc){ return enc==='hex'?__hex(u):__b64url(u); }}; }, randomInt:function(a,b){ if(b==null){b=a;a=0;} var u=new Uint32Array(1); crypto.getRandomValues(u); return a+(u[0]%(b-a)); }, timingSafeEqual:function(a,b){ a=__enc(a);b=__enc(b); if(a.length!==b.length) return false; var r=0; for(var i=0;i<a.length;i++) r|=a[i]^b[i]; return r===0; } };
var Buffer={ from:function(x){ var u=__enc(x); return {toString:function(enc){ return enc==='base64url'?__b64url(u):enc==='base64'?btoa(String.fromCharCode.apply(null,u)):new TextDecoder().decode(u); }, length:u.length, __u:u}; } };
__mods['crypto']=function(m){ m.exports=__crypto; };
`;
let out = shims;
for (const [file, id] of Object.entries(mods)) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const key = file.replace(/\.js$/, '');
  out += `\n__mods[${JSON.stringify(key)}]=function(module,exports,require){\n${src.replace(/^'use strict';/m, '')}\n};`;
}
const fixtures = fs.readFileSync(path.join(root, 'data/fixtures.json'), 'utf8');
out += `
// ---- boot: in-page platform with localStorage persistence, fetch interceptor for /v1/*
(function(){
 var app = __require('server/app.js','./app'); // resolves to server/app
 var FIX = ${fixtures};
 var KEY='relyable-store-v1'; var saved=null; try{ saved=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
 var a = app.build({fixtures: FIX}); if (saved) { for (var k in saved) if (k!=='save') a.store[k]=saved[k]; }
 a.store.save = function(){ try{ var o={}; for (var k in a.store) if (k!=='save') o[k]=a.store[k]; localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} };
 var ready = app.seed(a).then(function(){ a.store.save(); });
 var realFetch = window.fetch.bind(window);
 window.fetch = function(url, opts){ opts=opts||{}; var u=String(url); if(!u.startsWith('/v1/')) return realFetch(url, opts);
  return ready.then(function(){ var body=null; try{ body = opts.body? JSON.parse(opts.body): {}; }catch(e){ body={}; }
   return a.dispatch({method: opts.method||'GET', path:u, headers: Object.fromEntries(Object.entries(opts.headers||{}).map(function(e){return [e[0].toLowerCase(), e[1]];})), body: body, remoteAddress:'browser'}); })
   .then(function(r){ a.store.save(); return new Response(JSON.stringify(r.body), {status:r.status, headers:{'Content-Type':'application/json'}}); }); };
 window.__relyableReset = function(){ localStorage.removeItem(KEY); location.reload(); };
 window.__relyable = a;
})();`;
fs.writeFileSync(path.join(root, 'public/relyable-browser.js'), out);
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const badge = `<div id="sa-badge" style="position:fixed;left:12px;bottom:12px;z-index:50;background:#13274A;color:#fff;font:12px/1.4 Figtree,system-ui,sans-serif;padding:8px 12px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:300px">Preview build: the whole platform runs in this page and your changes stay in this browser. <a href="#" onclick="window.__relyableReset();return false" style="color:#D6F3EF">Reset demo data</a></div>`;
const standalone = html.replace('<script>\n(function(){', badge + '<script>\n' + out + '\n</script>\n<script>\n(function(){');
fs.writeFileSync(path.join(root, 'public/standalone.html'), standalone);
console.log('bundle', (out.length/1024).toFixed(0), 'KB; standalone', (standalone.length/1024).toFixed(0), 'KB');
