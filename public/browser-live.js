/** NASA POWER browser mode for static GitHub Pages.
 *  Every Live calculation requires actual NASA POWER response data; never
 *  silently substitutes the project's synthetic teaching climate.
 *  This module reuses the exact shared scoring/feature functions from core.js.
 */
import {deriveFeatures,evaluate,validateWeights} from './core.js';

const API='https://power.larc.nasa.gov/api/temporal/daily/point';
const BASE=new URL('./',import.meta.url);
const START='20200101',END='20241231';
const numericColumns=['kc_mid','n_fixing','root_depth','water_demand','drought_tol','frost_tol','erosion_cover','organic_matter','pest_break','forage_value','market_flex'];
const successfulClimate=new Map();
let catalogPromise;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const validNumber=value=>finite(value)&&value>-990?value:null;

export function nasaPowerUrl(lat,lon){
  if(!finite(lat)||Math.abs(lat)>90||!finite(lon)||Math.abs(lon)>180)throw new Error('Invalid coordinates');
  // NASA POWER meteorological values are regional grids, not surveyed parcels.
  const qs=new URLSearchParams({
    parameters:'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR',community:'AG',
    latitude:(Math.round(lat*100)/100).toFixed(2),
    longitude:(Math.round(lon*100)/100).toFixed(2),
    start:START,end:END,format:'JSON','time-standard':'LST'
  });
  return API+'?'+qs;
}

export function powerDaysFromResponse(raw){
  const p=raw?.properties?.parameter;
  if(!p||!['T2M','T2M_MAX','T2M_MIN','PRECTOTCORR'].every(k=>p[k]&&typeof p[k]==='object'))
    throw new Error('NASA POWER response has no required daily climate parameters');
  const dates=Object.keys(p.T2M).filter(d=>/^\d{8}$/.test(d)).sort();
  return dates.map(d=>({
    date:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),
    T2M:validNumber(p.T2M[d]),T2M_MAX:validNumber(p.T2M_MAX[d]),
    T2M_MIN:validNumber(p.T2M_MIN[d]),PRECTOTCORR:validNumber(p.PRECTOTCORR[d])
  }));
}

async function loadCatalog(signal){
  if(!catalogPromise){
    catalogPromise=Promise.all(['demo-crops.json','demo-strategies.json'].map(async file=>{
      const r=await fetch(new URL(file,BASE),{signal});
      if(!r.ok)throw new Error('Local crop dataset unavailable: '+file);
      return r.json();
    })).then(([crops,strategies])=>{
      const cropMap={};
      for(const c of crops){const row={...c};for(const k of numericColumns)row[k]=Number(row[k]);cropMap[row.crop]=row;}
      return {cropMap,strategies:strategies.strategies};
    }).catch(e=>{catalogPromise=null;throw e;});
  }
  return catalogPromise;
}
function validateInput(input,crops){
  if(!finite(input.lat)||Math.abs(input.lat)>90||!finite(input.lon)||Math.abs(input.lon)>180)
    throw new Error('Invalid coordinates');
  if(!finite(input.areaDunum)||input.areaDunum<=0||input.areaDunum>100000)
    throw new Error('Invalid field area');
  if(!['UNKNOWN','RAINFED','LIMITED','IRRIGATED'].includes(input.waterSource))
    throw new Error('Invalid water source');
  if(!Array.isArray(input.currentRotation)||input.currentRotation.length<1||input.currentRotation.length>6||input.currentRotation.some(c=>!crops[c]))
    throw new Error('Unknown crop in current rotation');
  if(input.soilSocGkg!=null&&(!finite(input.soilSocGkg)||input.soilSocGkg<0||input.soilSocGkg>300))
    throw new Error('Invalid soil organic carbon input');
  if(!finite(input.scenario?.rainPct)||Math.abs(input.scenario.rainPct)>50||
     !finite(input.scenario?.tempDeltaC)||Math.abs(input.scenario.tempDeltaC)>5)
    throw new Error('Invalid hypothetical climate scenario');
}
async function liveClimate(lat,lon,signal){
  const endpoint=nasaPowerUrl(lat,lon);
  const cached=successfulClimate.get(endpoint);
  if(cached)return {...cached,fromSessionCache:true};
  // No credentials or custom headers: avoid unnecessary CORS preflight.
  const timeout=AbortSignal.timeout(45000);
  const combined=signal?AbortSignal.any([signal,timeout]):timeout;
  let response;
  try{response=await fetch(endpoint,{method:'GET',signal:combined,mode:'cors',headers:{Accept:'application/json'}});}
  catch(e){
    if(signal?.aborted)throw e;
    if(timeout.aborted)throw new Error('NASA POWER request timed out. Please retry.');
    throw new Error('Could not reach NASA POWER directly from this browser (network or CORS restrictions). No synthetic data were substituted. Check your internet connection, retry, or use the separately labelled Synthetic Demo.');
  }
  if(!response.ok)throw new Error('NASA POWER service returned HTTP '+response.status+'; no synthetic fallback used.');
  let raw;
  try{raw=await response.json();}catch{throw new Error('NASA POWER did not return valid JSON.');}
  const days=powerDaysFromResponse(raw);
  const valid=days.filter(d=>d.T2M!==null&&d.T2M_MAX!==null&&d.T2M_MIN!==null&&d.PRECTOTCORR!==null);
  if(days.length<1750||valid.length<1500)
    throw new Error('NASA POWER returned incomplete historical climate data; refusing to present model results as valid.');
  const value={days,endpoint,retrievedAt:new Date().toISOString(),version:raw?.header?.version??null};
  // Cache only successful actual NASA responses in memory for slider re-evaluations.
  successfulClimate.set(endpoint,value);
  if(successfulClimate.size>8)successfulClimate.delete(successfulClimate.keys().next().value);
  return {...value,fromSessionCache:false};
}

export async function evaluateLiveNASA(input,{signal}={}){
  // These public JSON crop assumptions are precisely the ones used by the Node server.
  const {cropMap,strategies:all}=await loadCatalog(signal);
  validateInput(input,cropMap);
  const weights=validateWeights(input.weights);
  const climate=await liveClimate(input.lat,input.lon,signal);
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const features=deriveFeatures(climate.days,input.lat,null,input.scenario);
  const soil=input.soilSocGkg==null?null:{
    lat:input.lat,lon:input.lon,
    source:'Farmer-reported laboratory SOC; independent validation not performed',
    properties:{soc:{'0-5cm':input.soilSocGkg}}
  };
  const plans=[
    {id:'baseline',name:'Current rotation (farmer baseline)',seasons:input.currentRotation,why:'The rotation entered by the farmer; the reference scenario.',isBaseline:true},
    ...all.filter(s=>s.id!=='baseline').slice(0,3)
  ];
  const results=evaluate(cropMap,plans,weights,features,soil,{samples:650,seed:2026,waterSource:input.waterSource});
  const sources=[
    {id:'NASA_POWER',name:'NASA POWER Daily Point',sourceKind:'NASA regional reanalysis/modelled climate',endpoint:climate.endpoint,
      retrievedAt:climate.retrievedAt,version:climate.version,resolution:'Regional meteorology grid; daily historical 2020–2024, LST',
      limitations:'Genuine NASA API historical regional modelled climate; not field-scale direct observations or a weather forecast.',
      status:'loaded',count:climate.days.length},
    {id:'MODIS_NDVI',name:'NASA MODIS NDVI',sourceKind:'satellite_observed',
      endpoint:'https://modis.ornl.gov/rst/api/v1/',retrievedAt:null,version:null,resolution:'~250 m / 16 days',
      limitations:'Not imported by this browser-only Live mode. Bare field periods cannot be inferred.',status:'unavailable'},
    soil?{id:'USER_SOIL_SOC',name:'Farmer-reported soil organic carbon (SOC)',
      sourceKind:'farmer_reported_not_independently_verified',endpoint:'Entered manually in the browser',retrievedAt:null,
      version:null,resolution:'Reported 0–5 cm, g/kg',
      limitations:'The farm laboratory value was not independently verified.',status:'loaded'}:
    {id:'SOILGRIDS',name:'ISRIC SoilGrids',sourceKind:'modelled_soil_estimate',
      endpoint:'https://soilgrids.org/',retrievedAt:null,version:null,resolution:'~250 m',
      limitations:'Not loaded in browser-only mode. No local laboratory SOC was supplied.',status:'unavailable'},
    {id:'CROP_TRAITS',name:'FAO-56 approximations + expert crop assumptions',
      sourceKind:'expert_assumed',endpoint:'Local project crop catalog',retrievedAt:null,version:'local template',
      resolution:'Crop trait scores 1–5',
      limitations:'Crop traits are unvalidated regional assumptions, not NASA crop observations.',status:'loaded'}
  ];
  const notices=[
    'NASA POWER REAL API DATA: historical climate was retrieved successfully from NASA for the entered location; not a real-time weather forecast.',
    climate.fromSessionCache?'Previously fetched valid NASA POWER data reused in this browser session; see retrieval time in source panel.':'Live HTTP request to NASA POWER completed for this evaluation.',
    'Crop rotation scores and crop characteristics still rely on expert assumptions. They are not NASA-observed yields or planting instructions.',
    'MODIS NDVI is not loaded in browser-only mode. Bare ground periods cannot be confirmed.',
    soil?'User-provided SOC was not independently validated.':'SoilGrids is not loaded and no laboratory SOC is provided.',
    ...(input.waterSource==='RAINFED'?['Rainfed farm: water-demanding crops need local review.']:[]),
    ...(input.scenario.rainPct||input.scenario.tempDeltaC?['Climate scenario sliders are hypothetical stress tests, NOT a NASA forecast.']:[])
  ];
  return {
    project:'Field Shift — Adapting Farms with NASA Data',
    areaDunum:input.areaDunum,coordinates:{lat:input.lat,lon:input.lon},
    waterSource:input.waterSource,mode:'live',simulated:false,scenario:input.scenario,
    features,...results,sources,notices,generatedAt:new Date().toISOString(),
    methodology:{
      engine:'The shared crop-trait MCDA model plus seeded Monte Carlo sensitivity analysis (650 runs).',
      climate:'NASA POWER original daily point JSON 2020–2024. Values are regional historical gridded estimates, not parcel observations.',
      uncertainty:'P(top) represents stability of model rankings under assumed perturbations, not an observed crop-success probability.',
      soil:'If a user-reported SOC value is provided, the unvalidated soil-score adjustment is applied. No MODIS or SoilGrids data are silently invented.',
      bare:'MODIS NDVI is absent; no satellite-confirmed bare-ground periods.',
      irrigation:'Water source penalties and crop suitability heuristics need local agronomist validation.',
      coverage:'NASA POWER meteorological grid is regional (often ~0.5°), not field-resolution.'
    }
  };
}
