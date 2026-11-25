'use strict';
const fs = require('fs');
const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0,10); };
const co = (num, name, sic, emp, status, extra={}) => ({company_number:num, company_name:name, company_status:status||'active', jurisdiction:'england-wales', date_of_creation:'2009-03-12', sic_codes:sic, registered_office_address:{address_line_1:'Unit 4, Northfield Business Park', locality:'Leeds', postal_code: extra.pc||'LS12 6AB'}, accounts:{next_due:d(extra.accDue ?? 200), overdue: !!extra.accOverdue, last_accounts:{made_up_to:d(-120)}}, confirmation_statement:{next_due:d(150), overdue:false}, has_insolvency_history: !!extra.insolvency, has_charges:false, _employees: emp, _domains: extra.domains||[name.toLowerCase().replace(/ ltd| limited/g,'').split(' ')[0]+'.co.uk'], _officers: extra.officers || [], _disqualified: extra.disq||[]});
const off = (id, name, role, dob, email) => ({_id:id, name, officer_role:role, date_of_birth:{year:+dob.slice(0,4), month:+dob.slice(5,7)}, appointed_on:'2012-01-01', _email: email});
const companies = [
  co('04871234','NORTHFIELD ENGINEERING LTD',['25620','33120'],118,'active',{officers:[off('o1','WHITFIELD, Sarah','director','1978-04','sarah.whitfield@northfield.co.uk'),off('o2','OKAFOR, James','director','1971-11'),off('o3','BENNETT, Priya','secretary','1985-02')], domains:['northfield.co.uk']}),
  co('07120443','CALDER VALLEY SCAFFOLDING LTD',['43991'],34,'active',{officers:[off('o4','HUGHES, Helen','director','1985-11'),off('o5','BENNETT, Sarah','director','1989-12'),off('o6','NOLAN, James','secretary','1977-07')], domains:['calder.co.uk']}),
  co('09983321','BRIGHTWATER FACILITIES SERVICES LTD',['81100','81210'],160,'active',{officers:[off('o7','CARR, Mark','director','1969-05')], domains:['brightwater.co.uk']}),
  co('05567710','RIDGEWAY HAULAGE LTD',['49410'],92,'active',{officers:[off('o8','NOLAN, Helen','director','1974-09')], domains:['ridgeway.co.uk']}),
  co('08341190','HARLAND CARE HOMES LTD',['87100'],140,'active',{officers:[off('o9','HUGHES, Tom','director','1966-01')], domains:['harland.co.uk']}),
  co('03211987','PENNINE FOOD GROUP LTD',['10850'],310,'active',{officers:[off('o10','CARR, Priya','director','1980-08')], domains:['pennine.co.uk']}),
  co('10452211','OAKFIELD ELECTRICAL CONTRACTORS LTD',['43210'],22,'active',{officers:[off('o11','OKAFOR, Mark','director','1983-03')], domains:['oakfield.co.uk'], accOverdue:true, accDue:-20}),
  co('06677201','SEVERNSIDE FABRICATIONS LTD',['25110'],58,'active',{officers:[off('o12','WHITFIELD, Tom','director','1975-06')], domains:['severnside.co.uk']}),
  co('11209934','WESTMOOR GROUNDWORKS LTD',['43120'],40,'active',{officers:[off('o13','BENNETT, James','director','1979-10')], domains:['westmoor.co.uk']}),
  co('09120087','LUNE VALLEY CLEANING LTD',['81210'],75,'active',{officers:[off('o14','NOLAN, Priya','director','1988-04')], domains:['lunevalley.co.uk']}),
  co('02998765','ALBION PRECISION LTD',['25620'],64,'active',{officers:[off('o15','HUGHES, Sarah','director','1972-12')], domains:['albion.co.uk']}),
  co('12003311','KESTREL SECURITY SERVICES LTD',['80100'],130,'active',{officers:[off('o16','CARR, James','director','1981-07')], domains:['kestrel.co.uk']}),
  co('07765512','THORNBURY CHARTERED ACCOUNTANTS LTD',['69201'],18,'active',{officers:[off('o17','OKAFOR, Helen','director','1976-02')], domains:['thornbury.co.uk']}),
];
const registers = {
  hse: {'10452211':{notices:[{type:'Improvement', served:d(-80), description:'Work at height: inadequate edge protection', ref:'IN/2026/0417'}], confirmed:true}},
  gazette: {},
  directors: {},
  ssip: {'04871234':{scheme:'SafeContractor', ref:'SC-48712', issued:d(-200), expires:d(165)}, '07120443':{scheme:'CHAS', ref:'CHAS-71204', issued:d(-300), expires:d(-5)}, '09983321':{scheme:'SafeContractor', ref:'SC-99833', issued:d(-100), expires:d(265)}},
  iaf: {'04871234':{certificates:[{standard:'ISO 45001', cb:'BSI', ref:'OHS 712345', issued:d(-400), expires:d(320), status:'valid'},{standard:'ISO 9001', cb:'BSI', ref:'FS 612345', issued:d(-700), expires:d(20), status:'valid'},{standard:'ISO 14001', cb:'BSI', ref:'EMS 512345', issued:d(-400), expires:d(320), status:'valid'}]}, '03211987':{certificates:[{standard:'ISO 9001', cb:'NQA', ref:'NQA-32119', issued:d(-200), expires:d(500), status:'valid'}]}, '02998765':{certificates:[{standard:'ISO 9001', cb:'LRQA', ref:'LRQ-29987', issued:d(-100), expires:d(600), status:'valid'}]}},
  regulator: {'05567710':{regulator:'Traffic Commissioner', ref:'OB1234567', status:'registered'}, '08341190':{regulator:'CQC', ref:'1-123456789', status:'registered'}, '03211987':{regulator:'FSA', ref:'FHRS 5', status:'registered'}, '12003311':{regulator:'SIA', ref:'ACS-12003', status:'registered'}, '07765512':{regulator:'ICAEW', ref:'C001234567', status:'registered'}},
};
fs.writeFileSync(__dirname + '/fixtures.json', JSON.stringify({companies, registers}, null, 1));
console.log('fixtures', companies.length);
