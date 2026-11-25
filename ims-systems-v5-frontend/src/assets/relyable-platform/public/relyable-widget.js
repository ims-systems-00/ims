/* Relyable module widget for iMS OS. Drop-in: one script tag per module page.
   <div data-relyable-widget data-module="training"></div>
   <script src="https://api.relyable.co.uk/relyable-widget.js" data-base="https://api.relyable.co.uk" data-org="org_…" data-token="<tenant connector key or session token>"></script>
   Renders: rating · band · tier, this module's points now / available and its share of the rating, the top gaps, and "what would raise it". Re-renders on `relyable:refresh` events (dispatch one after a save). */
(function(){
  'use strict';
  var me = document.currentScript || document.querySelector('script[data-base]'); var BASE = me.dataset.base || ''; var ORG = me.dataset.org; var TOKEN = me.dataset.token;
  var BANDC = {A:'#12805C',B:'#3C9C6E',C:'#C7891A',D:'#C24E2E',E:'#7B8794'};
  var css = '.rly{font:13px/1.45 Figtree,Inter,system-ui,sans-serif;color:#0E1B2E;background:#fff;border:1px solid #D9DEE3;border-radius:12px;padding:10px 14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.rly .g{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:9px;color:#fff;font-weight:800;font-size:16px}.rly b.s{font-size:22px;line-height:1}.rly .m{color:#5B6673}.rly .bar{height:8px;width:160px;background:#E8ECEF;border-radius:999px;overflow:hidden}.rly .bar i{display:block;height:100%;background:#0E7C7B}.rly .gap{color:#C24E2E}.rly a{color:#0E7C7B;text-decoration:none;font-weight:600;cursor:pointer}.rly details{font-size:12.5px}.rly summary{cursor:pointer;color:#0E7C7B;font-weight:600}.rly ul{margin:6px 0 0;padding-left:16px}.rly .cap{display:inline-block;background:#FBE3DC;color:#C24E2E;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function render(el){ var mod = el.dataset.module; el.innerHTML = '<div class="rly"><span class="m">Relyable rating loading…</span></div>';
    fetch(BASE + '/v1/ratings/' + ORG + '/modules?module=' + encodeURIComponent(mod), {headers:{Authorization:'Bearer ' + TOKEN}}).then(function(r){ return r.json(); }).then(function(d){
      if (d.error) { el.innerHTML = '<div class="rly"><span class="m">Relyable: ' + esc(d.error) + '</span></div>'; return; }
      var m = d.module; var pct = m.max ? Math.round(m.points / m.max * 100) : 0; var gaps = m.items.filter(function(i){ return i.state !== 'na' && i.max - i.points >= 1; }).slice(0, 3);
      var risks = (d.nextRisks || []).slice(0, 2);
      el.innerHTML = '<div class="rly"><span class="g" style="background:' + BANDC[d.band] + '">' + d.band + '</span><span><b class="s">' + d.rating + '</b> <span class="m">of 1000 · Tier ' + d.tier + '</span>' + (d.caps.length ? ' <span class="cap">capped</span>' : '') + '</span>' +
        '<span style="flex:1;min-width:220px"><div><b>' + esc(m.name) + '</b> contributes <b>' + m.points + '</b> of <b>' + m.max + '</b> points <span class="m">(' + m.share + '% of your rating)</span></div><div class="bar" style="margin-top:4px"><i style="width:' + pct + '%"></i></div></span>' +
        (gaps.length ? '<span><span class="gap">+' + gaps.reduce(function(a,g){ return a + Math.round(g.max - g.points); }, 0) + ' available</span><details><summary>what would raise it</summary><ul>' + gaps.map(function(g){ return '<li>' + esc(g.label) + ': +' + Math.round(g.max - g.points) + (g.count ? ' (improve, ' + g.score + '%)' : ' (missing)') + '</li>'; }).join('') + risks.map(function(r){ return '<li>' + esc(r.type) + ' ' + r.what + (r.in < 0 ? ' ' + (-r.in) + ' days ago' : ' in ' + r.in + ' days') + '</li>'; }).join('') + '</ul></details></span>' : '<span class="m">Everything in this module is current.</span>') +
        '<a data-rly-report>Full report</a></div>';
      el.querySelector('[data-rly-report]').onclick = function(){ window.open(BASE.replace(/api\./,'') + '/#report/' + ORG, '_blank'); };
    }).catch(function(e){ el.innerHTML = '<div class="rly"><span class="m">Relyable unavailable</span></div>'; });
  }
  function all(){ document.querySelectorAll('[data-relyable-widget]').forEach(render); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
  document.addEventListener('relyable:refresh', all);
  window.RelyableWidget = {refresh: all};
})();
