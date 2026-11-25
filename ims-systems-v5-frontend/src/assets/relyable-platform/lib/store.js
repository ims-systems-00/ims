'use strict';
const fs = typeof window === 'undefined' ? require('fs') : null;
function open(file) {
  let data = {};
  if (file && fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const defaults = {organisations:[], links:[], evidence:[], claims:[], members:[], users:[], audit:[], keys:[], reports:[], subscriptions:[], portfolios:[], submissions:[], disputes:[], notifications:[], outbox:[], snapshots:[], idv:[]};
  for (const k of Object.keys(defaults)) data[k] = data[k] || defaults[k];
  let timer = null;
  data.save = () => { if (!file) return; clearTimeout(timer); timer = setTimeout(() => fs.writeFileSync(file, JSON.stringify(data, (k,v)=> k==='save'?undefined:v, 1)), 50); };
  return data;
}
module.exports = {open};
