/** Educational synthetic demonstration. Uses the exact shared MCDA implementation
 * transpiled from src/core.ts; never claims NASA observations or real field suitability. */
import {deriveFeatures,evaluate,validateWeights} from './core.js';
const base=new URL('./',import.meta.url);
const fetchJson=async name=>{const response=await fetch(new URL(name,base));if(!response.ok)throw new Error('Demo data missing: '+name);return response.json();};
function demoDays(){const result=[];for(let y=2020;y<=2024;y++){
  const n=(y%4===0)?366:365;
  for(let i=0;i<n;i++){
    const date=new Date(Date.UTC(y,0,i+1)).toISOString().slice(0,10),phase=2*Math.PI*i/365;
    const t=20-11*Math.cos(phase)+Math.sin(i*.29)*1.4;
    const wet=Math.cos(phase)>.05,precip=wet&&i%6===0?7+i%3*2:.1;
    result.push({date,T2M:t,T2M_MAX:t+6,T2M_MIN:t-6,PRECTOTCORR:precip});
  }
}return result;}
const numericColumns=['kc_mid','n_fixing','root_depth','water_demand','drought_tol','frost_tol','erosion_cover','organic_matter','pest_break','forage_value','market_flex'];
let cache;
async function catalog(){if(cache)return cache;const [crops,strategies]=await Promise.all([fetchJson('demo-crops.json'),fetchJson('demo-strategies.json')]);
  const cropMap={};for(const c of crops){const row={...c};for(const k of numericColumns)row[k]=Number(row[k]);cropMap[row.crop]=row;}
  cache={cropMap,strategies};return cache;}
function validate(input,crops){
  if(!Number.isFinite(input.lat)||Math.abs(input.lat)>90||!Number.isFinite(input.lon)||Math.abs(input.lon)>180)throw new Error('Invalid coordinates');
  if(!Number.isFinite(input.areaDunum)||input.areaDunum<=0||input.areaDunum>100000)throw new Error('Invalid field area');
  if(!Array.isArray(input.currentRotation)||!input.currentRotation.length||input.currentRotation.some(c=>!crops[c]))throw new Error('Unknown crop in current rotation');
  if(input.soilSocGkg!==null&&(!Number.isFinite(input.soilSocGkg)||input.soilSocGkg<0||input.soilSocGkg>300))throw new Error('Invalid soil SOC');
}
export async function evaluateDemo(input){const {cropMap,strategies:all}=await catalog();validate(input,cropMap);
  const weights=validateWeights(input.weights);
  const features=deriveFeatures(demoDays(),input.lat,null,input.scenario);
  features.data_quality=0; // Distinguish scenario completeness from scientific data quality.
  const soil=input.soilSocGkg===null?null:{lat:input.lat,lon:input.lon,source:'User-reported SOC; laboratory verification not checked',properties:{soc:{'0-5cm':input.soilSocGkg}}};
  const plans=[{id:'baseline',name:'Current rotation (farmer baseline)',seasons:input.currentRotation,why:'Farmer-provided reference rotation',isBaseline:true},...all.filter(s=>s.id!=='baseline').slice(0,3)];
  const result=evaluate(cropMap,plans,weights,features,soil,{samples:650,seed:2026,waterSource:input.waterSource});
  for(const s of result.strategies){s.sourceTags=s.sourceTags.map(t=>t==='NASA_POWER_MODELLED'?'DEMO_SYNTHETIC':t);
    s.evidence=s.evidence.map(t=>t.startsWith('NASA POWER')?'Synthetic climate is used in this demo, not NASA observations.':t);}
  const sources=[
    {id:'DEMO_SYNTHETIC',name:'Synthetic climate generator',sourceKind:'synthetic',resolution:'Not applicable',limitations:'Illustrative values only; not NASA or observed weather.',status:'simulated',retrievedAt:null,version:null},
    {id:'MODIS_NDVI',name:'NASA MODIS NDVI',sourceKind:'satellite_observed',resolution:'250 m / 16 days',limitations:'Not loaded in offline demo; bare fields cannot be inferred.',status:'unavailable',retrievedAt:null,version:null},
    soil?{id:'USER_SOIL_SOC',name:'Farmer-reported soil SOC',sourceKind:'farmer_reported_not_independently_verified',resolution:'User input',limitations:'Laboratory verification not checked.',status:'loaded',retrievedAt:null,version:null}:
      {id:'SOILGRIDS',name:'ISRIC SoilGrids',sourceKind:'modelled_soil_estimate',resolution:'250 m',limitations:'No local soil data in the demo.',status:'unavailable',retrievedAt:null,version:null},
    {id:'CROP_TRAITS',name:'FAO-56 approximations + expert assumptions',sourceKind:'expert_assumed',resolution:'Crop traits 1–5',limitations:'Heuristics need local agronomist review.',status:'loaded',retrievedAt:null,version:'local template'}
  ];
  const notices=[
    'SYNTHETIC DEMO ONLY — all climate data below are computer-generated and are NOT from NASA.',
    'These rankings assess scenarios and assumptions, not crop yield or probability of farming success.',
    'Consult a local agronomist about water availability, pest cycles, sowing dates and actual soil tests.',
    'MODIS NDVI was not loaded. Bare-ground seasons cannot be confirmed.',
    ...(!soil?['Local soil measurement unavailable; soil benefits rely on expert crop traits.']:[]),
    ...(input.scenario.rainPct||input.scenario.tempDeltaC?['The rainfall and heat sliders describe hypothetical stress tests, NOT a climate forecast.']:[])
  ];
  return {project:'Field Shift — Adapting Farms with NASA Data',areaDunum:input.areaDunum,coordinates:{lat:input.lat,lon:input.lon},waterSource:input.waterSource,
    mode:'demo',simulated:true,scenario:input.scenario,features,...result,sources,notices,generatedAt:new Date().toISOString(),
    methodology:{engine:'The same deterministic crop-trait MCDA and seeded Monte Carlo (650) used by the Node backend.',
      synthetic:'The generated climate is for interface demonstration only. It is not derived from NASA or any field measurement.',
      uncertainty:'P(top) is sensitivity to model assumptions; it is NOT a success likelihood.',
      soil:'Entered SOC influences the soil weight using an unvalidated rule. No field or lab source is verified.',
      bare:'NDVI absent: do not infer bare-ground seasons.',
      crop_rules:'Expert heuristics; water supply and pest constraints require local validation.'}};
}
