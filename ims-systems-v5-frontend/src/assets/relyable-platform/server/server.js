'use strict';
const {build, seed} = require('./app');
const port = Number(process.env.PORT || 8790);
const app = build({dataFile: process.env.RLY_DATA || null, chKey: process.env.CH_API_KEY});
(async () => { await seed(app); app.server.listen(port, () => console.log(`Relyable platform on http://localhost:${port}  Companies House: ${app.ch.live?'LIVE':'fixtures'}  keys: rly_rd_demo (reader) rly_ad_demo (admin)`)); })();
