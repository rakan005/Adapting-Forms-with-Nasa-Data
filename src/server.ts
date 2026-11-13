import {createServer,IncomingMessage,ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join,normalize,extname} from 'node:path';
import {deriveFeatures,evaluate,validateWeights} from './core.ts';
import type {Strategy,SoilProfile} from './core.ts';
import {ROOT,loadPower,optionalNdvi,optionalSoil,demoClimate,readCrops,readStrategies} from './sources.ts';

const PORT=Number(process.env.PORT||3100);
function send(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
function checkNumber(v:unknown,min:number,max:number,label:string){if(!finite(v)||v<min||v>max)throw new Error(label+' must be within '+min+'..'+max);return v as number;}
function parseEvaluation(input:any){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Request body must be an object');
  const lat=checkNumber(input.lat,-90,90,'Latitude'),lon=checkNumber(input.lon,-180,180,'Longitude');
  const areaDunum=checkNumber(input.areaDunum,0.01,100000,'Area (dunums)');
  const waterSource=String(input.waterSource||'UNKNOWN');if(!['UNKNOWN','RAINFED','LIMITED','IRRIGATED'].includes(waterSource))throw new Error('Invalid water source');
  const weights=validateWeights(input.weights);
  const scenario={rainPct:checkNumber(input.scenario?.rainPct??0,-50,50,'Rain scenario (%)'),tempDeltaC:checkNumber(input.scenario?.tempDeltaC??0,-5,5,'Temperature scenario (C)')};
  const currentRotation=input.currentRotation;
  if(!Array.isArray(currentRotation)||currentRotation.length<1||currentRotation.length>6||currentRotation.some((x:any)=>typeof x!=='string'||x.length>40))throw new Error('Current rotation must have 1 to 6 crop IDs');
  const soilSocGkg=input.soilSocGkg===null||input.soilSocGkg===undefined||input.soilSocGkg===''?null:checkNumber(input.soilSocGkg,0,300,'Soil SOC (g/kg)');
  const mode=input.mode==='demo'?'demo':'live';if(input.mode&&input.mode!=='demo'&&input.mode!=='live')throw new Error('Invalid data mode');
  return {lat,lon,areaDunum,waterSource,weights,scenario,currentRotation,mode,soilSocGkg};
}
export async function evaluateRequest(input:any){
  const q=parseEvaluation(input);
  const [cropRows,catalog]=await Promise.all([readCrops(),readStrategies()]);
  const crops=Object.fromEntries(cropRows.map((c:any)=>[c.crop,c]));
  for(const c of q.currentRotation)if(!crops[c])throw new Error('Unknown crop in current rotation: '+c);
  let climate,ndvi,soil;
  if(q.mode==='demo'){
    climate={days:demoClimate(),record:{id:'DEMO_SYNTHETIC',name:'Synthetic illustrative climate',sourceKind:'synthetic',endpoint:'none',retrievedAt:null,version:null,resolution:'not applicable',limitations:'Generated demo values, NOT observed or modelled NASA data',status:'simulated' as const}};
    ndvi={days:null,record:{id:'MODIS_NDVI',name:'NASA MODIS NDVI',sourceKind:'satellite_observed',endpoint:'https://modis.ornl.gov/rst/api/v1/',retrievedAt:null,version:null,resolution:'250 m / 16 days',limitations:'Not loaded in synthetic mode',status:'unavailable' as const}};
    soil={soil:null,record:{id:'SOILGRIDS',name:'ISRIC SoilGrids',sourceKind:'modelled_soil_estimate',endpoint:'https://rest.isric.org/soilgrids/v2.0/properties/query',retrievedAt:null,version:null,resolution:'250 m',limitations:'Not loaded in synthetic mode',status:'unavailable' as const}};
  }else{
    try{climate=await loadPower(q.lat,q.lon);}catch(e){const x=e instanceof Error?e.message:String(e);throw new DataUnavailableError('Live NASA POWER unavailable: '+x+'. To run offline use the clearly labelled DEMO mode.');}
    [ndvi,soil]=await Promise.all([optionalNdvi(q.lat,q.lon),optionalSoil(q.lat,q.lon)]);
  }
  if(q.soilSocGkg!==null){
    soil={soil:{source:'User-reported soil organic carbon; independent lab validation not verified',lat:q.lat,lon:q.lon,properties:{soc:{'0-5cm':q.soilSocGkg}}},
      record:{id:'USER_SOIL_SOC',name:'Farmer-reported soil organic carbon (SOC)',sourceKind:'farmer_reported_not_independently_verified',
        endpoint:'Entered in this form, not downloaded',retrievedAt:null,version:null,resolution:'User-specified 0–5cm depth',
        limitations:'Only enter laboratory-reported values in g/kg; source and laboratory method not verified.',status:'loaded' as const}};
  }
  const features=deriveFeatures(climate.days,q.lat,ndvi.days,q.scenario);
  if(q.mode==='demo')features.data_quality=0; // synthetic climate must never create an apparent scientific confidence score
  const baseline:Strategy={id:'baseline',name:'Current rotation (farmer baseline)',seasons:q.currentRotation,why:'The rotation entered by the farmer; the reference scenario.',isBaseline:true};
  const alternatives:Strategy[]=catalog.strategies.filter((s:Strategy)=>s.id!=='baseline').slice(0,3);
  const strategies=[baseline,...alternatives];
  const results=evaluate(crops,strategies,q.weights,features,soil.soil as SoilProfile|null,{samples:650,seed:2026,waterSource:q.waterSource});
  if(q.mode==='demo') for(const s of results.strategies){
    s.sourceTags=s.sourceTags.map(t=>t==='NASA_POWER_MODELLED'?'DEMO_SYNTHETIC':t);
    s.evidence=s.evidence.map(t=>t.startsWith('NASA POWER')?'Synthetic illustrative climate informs water/heat priorities; NOT NASA observations.':t);
  }
  const notices=[
    'This tool supports local agronomic advice; it does not replace field soil tests or the farmer\'s judgement.',
    'Water demand, soil benefits, income flexibility and crop thresholds are expert assumptions, not NASA measurements.',
    'Historical NASA POWER is regional modelled climate; derived scores are not observed field yields.',
    ...(q.mode==='demo'?['DEMONSTRATION: synthetic climate data are used. This evaluation is NOT NASA-data-backed.']:[]),
    ...(ndvi.days?[]:['MODIS NDVI is missing for these exact coordinates; field bare periods cannot be inferred.']),
    ...(soil.soil?[]:['SoilGrids soil information is missing; no local laboratory soil measurement was used.']),
    ...(q.waterSource==='RAINFED'?['Rainfed farm: irrigation-dependent crops require careful local review.']:[]),
    ...(q.scenario.rainPct||q.scenario.tempDeltaC?['The climate change sliders are hypothetical stress tests, NOT a NASA forecast.']:[])
  ];
  return {
    project:'Field Shift — Adapting Farms with NASA Data',areaDunum:q.areaDunum,coordinates:{lat:q.lat,lon:q.lon},waterSource:q.waterSource,
    mode:q.mode,simulated:q.mode==='demo',scenario:q.scenario,features, ...results,
    sources:[climate.record,ndvi.record,soil.record,{id:'CROP_TRAITS',name:'FAO-56 approximations + expert trait assumptions',sourceKind:'expert_assumed',endpoint:'assets/crops.csv',retrievedAt:null,version:'local template',resolution:'crop traits 1–5',limitations:'Must be verified by a local agronomist before agricultural use.',status:'loaded'}],
    notices, generatedAt:new Date().toISOString(), methodology:{engine:'MCDA weighted criteria, crop-trait averages per rotation, sensitivity via seeded Monte Carlo (650)',
    uncertainty:'P(top) is relative sensitivity, not real success probability',soil:'If SoilGrids or user-reported lab SOC is available, soil-building weight is increased 15% when SOC<15 g/kg; otherwise 5%. Heuristic, unvalidated.',
    bare:'Observed bare-ground proxy only when quality-filtered NDVI is available; threshold 0.2 is uncalibrated.',
    irrigation:'Rainfed and limited irrigation modes apply an explicitly unvalidated penalty to high-water-demand rotations; check actual water access.',
    coverage:'One POWER grid estimate for input coordinate; not field-resolution climate.'}}
}
export class DataUnavailableError extends Error{}
async function body(req:IncomingMessage):Promise<any>{
  const parts:Buffer[]=[];let len=0;for await(const chunk of req){len+=chunk.length;if(len>35000)throw new Error('Request body too large');parts.push(chunk);}
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new Error('Invalid JSON body');}
}
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
async function serveStatic(res:ServerResponse,pathname:string){
  const filename=pathname==='/'?'index.html':pathname.replace(/^\//,'');
  if(!['index.html','app.js','styles.css','theme.css','core.js','demo-engine.js','demo-catalog.json','demo-crops.json','demo-strategies.json'].includes(filename)){send(res,404,{error:'NOT_FOUND'});return;}
  const bytes=await readFile(join(ROOT,'public',filename));res.writeHead(200,{'content-type':types[extname(filename)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(bytes);
}
export const app=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/', 'http://localhost');const p=url.pathname;
    if(req.method==='GET'&&p==='/api/health'){send(res,200,{ok:true,service:'field-shift',sourceMode:'live-by-default'});return;}
    if(req.method==='GET'&&p==='/api/config'){
      const [crops,strategies]=await Promise.all([readCrops(),readStrategies()]);
      send(res,200,{crops:crops.map((c:any)=>({id:c.crop,group:c.group})),strategies:strategies.strategies,weights:strategies.weights,
        dataMode:'live-first; explicit demo available',version:'2026-11-13 MVP'});return;
    }
    if(req.method==='POST'&&p==='/api/evaluate'){send(res,200,await evaluateRequest(await body(req)));return;}
    if(req.method==='GET'&&(p==='/'||['/index.html','/app.js','/styles.css','/theme.css','/core.js','/demo-engine.js','/demo-catalog.json','/demo-crops.json','/demo-strategies.json'].includes(p))){await serveStatic(res,p);return;}
    send(res,404,{error:'NOT_FOUND'});
  }catch(e){const message=e instanceof Error?e.message:'Internal error';
    const status=e instanceof DataUnavailableError?503:/invalid|must|unknown|range|at least|require|provide|select|zero|no year|body too large/i.test(message)?400:500;
    if(status===500)console.error(e);
    send(res,status,{error:status===503?'DATA_UNAVAILABLE':status===400?'INVALID_INPUT':'SERVER_ERROR',message:status===500?'Server error; see service logs.':message});}
});
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  app.listen(PORT,'0.0.0.0',()=>console.log(`Field Shift MVP: http://localhost:${PORT} (NASA live unless DEMO selected)`));
}
