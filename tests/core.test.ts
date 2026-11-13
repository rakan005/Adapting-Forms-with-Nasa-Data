import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveFeatures,validateWeights,evaluate,hargreavesEto,CRITERIA} from '../src/core.ts';
import {demoClimate,powerDaysFromRaw,parseCsv,readCrops,readStrategies} from '../src/sources.ts';
import {evaluateRequest,app} from '../src/server.ts';
const W={water_saving:30,soil_building:25,erosion_control:20,income:15,heat_risk:10};
const Q={lat:31.9,lon:35.9,areaDunum:12.5,currentRotation:['wheat','fallow'],waterSource:'RAINFED',weights:W,scenario:{rainPct:0,tempDeltaC:0},mode:'demo'};
test('NASA raw parser preserves actual values and makes -999 missing',()=>{
  const raw={properties:{parameter:{T2M:{'20200101':5},T2M_MAX:{'20200101':10},T2M_MIN:{'20200101':-999},PRECTOTCORR:{'20200101':1.2}}}};
  assert.deepEqual(powerDaysFromRaw(raw),[{date:'2020-01-01',T2M:5,T2M_MAX:10,T2M_MIN:null,PRECTOTCORR:1.2}]);
  assert.throws(()=>powerDaysFromRaw({properties:{parameter:{T2M:{}}}}),/schema/);
});
test('CSV parses known expert values without inventing numbers',()=>{
  assert.deepEqual(parseCsv('name,val\n"crop, other",3'),[{name:'crop, other',val:'3'}]);
});
test('five full historical years with ETo and safe monthly aggregation',()=>{
  const f=deriveFeatures(demoClimate(),31.9,null,{rainPct:0,tempDeltaC:0});
  assert.deepEqual(f.years_used,[2020,2021,2022,2023,2024]);
  assert.equal(f.monthly.length,12);
  assert.equal(f.ndvi_valid_share,null);assert.equal(f.bare_share,null);
  assert.ok(f.power_completeness>.99);assert.ok(f.rain_mm_mean>0);
  assert.ok(hargreavesEto(35,15,25,150,31.9)>0);
});
test('missing and unreliable NDVI are not assumed good and flagged unavailable',()=>{
  const nd=[{date:'2020-02-01',ndvi:.1,reliability:null},{date:'2020-04-01',ndvi:.8,reliability:0},{date:'2021-02-01',ndvi:.05,reliability:2}];
  const f=deriveFeatures(demoClimate(),31.9,nd,{rainPct:0,tempDeltaC:0});
  assert.ok(Math.abs(f.ndvi_valid_share!-1/3)<.001);assert.equal(f.bare_share,0);
  assert.equal(f.ndvi_peak_month,4);
});
test('scenario changes climate only, never presents a forecast',()=>{
  const days=demoClimate();const a=deriveFeatures(days,31.9,null,{rainPct:0,tempDeltaC:0});
  const b=deriveFeatures(days,31.9,null,{rainPct:-30,tempDeltaC:3});
  assert.ok(b.rain_mm_mean<a.rain_mm_mean);assert.ok(b.heat_days_mean>=a.heat_days_mean);assert.ok(b.deficit_mm_mean>a.deficit_mm_mean);
});
test('invalid zero/negative weights and missing inputs are rejected',()=>{
  assert.throws(()=>validateWeights({water_saving:0,soil_building:0,erosion_control:0,income:0,heat_risk:0}),/non-zero/);
  assert.throws(()=>validateWeights({...W,income:-10}),/Invalid priority/);
  assert.throws(()=>deriveFeatures(demoClimate(),31.9,null,{rainPct:200,tempDeltaC:0}),/out of allowed/);
  assert.throws(()=>deriveFeatures(demoClimate().slice(0,30),31.9,null,{rainPct:0,tempDeltaC:0}),/No year/);
});
test('Monte Carlo: baseline, intervals, finite probabilities, reproducibility',async()=>{
  const crops=Object.fromEntries((await readCrops()).map((c:any)=>[c.crop,c]));
  const cfg=await readStrategies();const strategies=cfg.strategies.map((s:any)=>({...s,isBaseline:s.id==='baseline'}));
  const f=deriveFeatures(demoClimate(),31.9,null,{rainPct:0,tempDeltaC:0});f.data_quality=0;
  const a=evaluate(crops,strategies,validateWeights(W),f,null,{samples:160,seed:99});
  const b=evaluate(crops,strategies,validateWeights(W),f,null,{samples:160,seed:99});
  assert.deepEqual(a,b);assert.equal(a.strategies.length,4);
  assert.equal(a.strategies.filter(s=>s.isBaseline).length,1);
  for(const s of a.strategies){assert.ok(s.mean>=0&&s.mean<=1);assert.ok(s.p5<=s.mean&&s.p95>=s.mean);assert.equal(s.confidence,'low');}
  assert.ok(Math.abs(a.strategies.reduce((z,s)=>z+s.p_top,0)-1)<.01);
});
test('API evaluation explicitly tags synthetic mode and echoes current baseline',async()=>{
  const x=await evaluateRequest({...Q,currentRotation:['barley','chickpea']});
  assert.equal(x.simulated,true);assert.equal(x.mode,'demo');
  assert.equal(x.sources[0].status,'simulated');
  assert.deepEqual(x.strategies.find(s=>s.isBaseline)?.seasons,['barley','chickpea']);
  assert.ok(x.notices.some(n=>n.includes('NOT NASA-data-backed')));
});
test('API validation rejects bad field area, unknown crop and no priorities',async()=>{
  await assert.rejects(()=>evaluateRequest({...Q,areaDunum:0}),/Area/);
  await assert.rejects(()=>evaluateRequest({...Q,currentRotation:['fake']}),/Unknown crop/);
  await assert.rejects(()=>evaluateRequest({...Q,weights:Object.fromEntries(CRITERIA.map(k=>[k,0]))}),/non-zero/);
});

test('water availability affects high-demand rotation suitability via declared heuristic',async()=>{
  const dry=await evaluateRequest({...Q,waterSource:'RAINFED'});
  const irrigated=await evaluateRequest({...Q,waterSource:'IRRIGATED'});
  const score=(x:any,id:string)=>x.strategies.find((s:any)=>s.id===id).score_deterministic;
  assert.ok(score(dry,'income_forage')<score(irrigated,'income_forage'));
  assert.equal((dry.strategies.find((s:any)=>s.id==='income_forage')?.water_access_penalty??0)>0,true);
  assert.ok(dry.strategies.every((s:any)=>!s.sourceTags.includes('NASA_POWER_MODELLED')));
});
test('HTTP contract: config, demo evaluation, input rejection and health',async()=>{
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',()=>resolve()));
  try{
    const address=server.address();if(!address||typeof address==='string')throw new Error('Invalid test address');
    const url='http://127.0.0.1:'+address.port;
    const health=await fetch(url+'/api/health');assert.equal(health.status,200);
    const config=await fetch(url+'/api/config');const cc=await config.json();assert.ok(cc.crops.length>=10);
    const ok=await fetch(url+'/api/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Q)});
    assert.equal(ok.status,200);const response=await ok.json();assert.equal(response.strategies.length,4);
    const bad=await fetch(url+'/api/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...Q,areaDunum:-1})});
    assert.equal(bad.status,400);assert.equal((await bad.json()).error,'INVALID_INPUT');
  }finally{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});

test('NASA live ingestion path works against a mocked provider response and caches provenance (not a real API test)',async()=>{
  const lat=8.71,lon=42.63;const days=demoClimate();
  const parameters:any={T2M:{},T2M_MAX:{},T2M_MIN:{},PRECTOTCORR:{}};
  for(const d of days){const key=d.date.replaceAll('-','');for(const k of Object.keys(parameters))parameters[k][key]=(d as any)[k];}
  const original=globalThis.fetch;
  const {rm}=await import('node:fs/promises');
  const {join}=await import('node:path');
  const {ROOT}=await import('../src/sources.ts');
  const cache=join(ROOT,'data','cache','power_8.71_42.63_2020-2024.json');
  let calls=0;
  try{
    await rm(cache,{force:true});
    globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({header:{version:'TEST-MOCK'},properties:{parameter:parameters}}),{status:200,headers:{'content-type':'application/json'}});}) as typeof fetch;
    const r=await evaluateRequest({...Q,mode:'live',lat,lon});
    assert.equal(r.simulated,false);assert.equal(r.sources[0].status,'loaded');
    assert.equal(r.sources[0].version,'TEST-MOCK');assert.equal(r.features.years_used.length,5);
    assert.equal(calls,1);
    const r2=await evaluateRequest({...Q,mode:'live',lat,lon});assert.equal(r2.sources[0].status,'loaded');assert.equal(calls,1);
  }finally{globalThis.fetch=original;await rm(cache,{force:true});}
});

test('farmer-reported lab SOC can replace unavailable SoilGrids without being mislabeled satellite data',async()=>{
  const x=await evaluateRequest({...Q,soilSocGkg:12});
  assert.equal(x.sources.find(s=>s.id==='USER_SOIL_SOC')?.status,'loaded');
  assert.ok(x.strategies.every(s=>s.sourceTags.includes('USER_REPORTED_SOIL')));
  assert.ok(x.strategies.some(s=>s.evidence.some(e=>e.includes('Farmer-reported'))));
  await assert.rejects(()=>evaluateRequest({...Q,soilSocGkg:400}),/Soil SOC/);
});
