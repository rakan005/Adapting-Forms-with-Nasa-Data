import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import type {ClimateDay,NdviDay,SoilProfile} from './core.ts';

export const ROOT=resolve(import.meta.dirname,'..');
const CACHE=join(ROOT,'data','cache');
const OBS=join(ROOT,'data','observations');
export type SourceRecord={id:string;name:string;sourceKind:string;endpoint:string;retrievedAt:string|null;version:string|null;resolution:string;limitations:string;status:'loaded'|'unavailable'|'simulated';count?:number};
const safeNumber=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)&&value>-990?value:null;
const errorMessage=(e:unknown)=>e instanceof Error?e.message:String(e);
const getJson=async(url:string,timeoutMs:number)=>{
  const resp=await fetch(url,{signal:AbortSignal.timeout(timeoutMs),headers:{'Accept':'application/json','User-Agent':'FieldShiftEducationalMVP/1.0'}});
  if(!resp.ok)throw new Error(`Upstream API returned HTTP ${resp.status}`);
  return await resp.json();
};
export function powerDaysFromRaw(raw:any):ClimateDay[]{
  const p=raw?.properties?.parameter;
  if(!p||typeof p!=='object'||!p.T2M||!p.T2M_MAX||!p.T2M_MIN||!p.PRECTOTCORR)throw new Error('NASA POWER schema or required parameters missing');
  return Object.keys(p.T2M).sort().filter(d=>/^\d{8}$/.test(d)).map(d=>{
    const date=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
    return {date,T2M:safeNumber(p.T2M[d]),T2M_MAX:safeNumber(p.T2M_MAX[d]),T2M_MIN:safeNumber(p.T2M_MIN[d]),PRECTOTCORR:safeNumber(p.PRECTOTCORR[d])};
  });
}
export async function loadPower(lat:number,lon:number):Promise<{days:ClimateDay[];record:SourceRecord}>{
  // Query a fixed historical full-year window so values are comparable across users and reproducible.
  const latitude=Math.round(lat*100)/100,longitude=Math.round(lon*100)/100;
  const name=`power_${latitude.toFixed(2)}_${longitude.toFixed(2)}_2020-2024.json`;
  const path=join(CACHE,name);
  let stored:any;
  try{stored=JSON.parse(await readFile(path,'utf8'));}catch{}
  const qs=new URLSearchParams({parameters:'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR',community:'AG',latitude:String(latitude),longitude:String(longitude),start:'20200101',end:'20241231',format:'JSON','time-standard':'LST'});
  const url=`https://power.larc.nasa.gov/api/temporal/daily/point?${qs}`;
  if(!stored){
    const raw=await getJson(url,24000);
    const days=powerDaysFromRaw(raw);if(days.length<1750)throw new Error('NASA POWER returned insufficient historical days');
    stored={raw,retrievedAt:new Date().toISOString(),latitude,longitude};
    await mkdir(CACHE,{recursive:true});await writeFile(path,JSON.stringify(stored));
  }
  const days=powerDaysFromRaw(stored.raw);if(days.length<1750)throw new Error('POWER cache has insufficient observations');
  return {days,record:{id:'NASA_POWER',name:'NASA POWER Daily Point',sourceKind:'NASA regional reanalysis/modelled climate',endpoint:url,
    retrievedAt:stored.retrievedAt,version:stored.raw?.header?.version??null,resolution:'Provider-dependent grid; meteorology often ~0.5°; local solar time, daily',
    limitations:'Regional gridded climate, not a sensor reading from the individual field; verify locally.',status:'loaded',count:days.length}};
}
/** Explicitly synthetic data for test/demo. Never label or export it as a NASA observation. */
export function demoClimate():ClimateDay[]{
  const result:ClimateDay[]=[];
  for(let year=2020;year<=2024;year++)for(let i=0;i<((year%4===0)?366:365);i++){
    const d=new Date(Date.UTC(year,0,i+1)).toISOString().slice(0,10),phase=2*Math.PI*i/365;
    const t=20-11*Math.cos(phase)+Math.sin(i*0.29)*1.4;
    const wet=Math.cos(phase)>0.05;
    const precip=wet&&i%6===0?7+(i%3)*2:0.1;
    result.push({date:d,T2M:t,T2M_MAX:t+6,T2M_MIN:t-6,PRECTOTCORR:precip});
  }
  return result;
}
function csvCells(line:string):string[]{let result:string[]=[],current='',quoted=false;for(let i=0;i<line.length;i++){
  if(line[i]==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(line[i]===','&&!quoted){result.push(current);current='';}else current+=line[i];}
  result.push(current);return result;
}
export function parseCsv(csv:string):Record<string,string>[]{
  const lines=csv.trim().replace(/\r/g,'').split('\n');const headers=csvCells(lines.shift()||'');
  return lines.filter(x=>x.trim()).map(x=>Object.fromEntries(csvCells(x).map((v,i)=>[headers[i],v])));
}
export async function optionalNdvi(lat:number,lon:number):Promise<{days:NdviDay[]|null;record:SourceRecord}>{
  const path=join(OBS,'ndvi.csv');let data:NdviDay[]|null=null;let meta:any={};
  try{
    meta=JSON.parse(await readFile(join(OBS,'ndvi.meta.json'),'utf8'));
    if(Math.abs(meta.lat-lat)>0.005||Math.abs(meta.lon-lon)>0.005)throw new Error('coordinates differ');
    const rows=parseCsv(await readFile(path,'utf8'));
    data=rows.map(r=>({date:r.date,ndvi:r.ndvi===''?null:safeNumber(Number(r.ndvi)),
      reliability:r.reliability===''?null:safeNumber(Number(r.reliability))})).filter(r=>/^\d{4}-\d\d-\d\d$/.test(r.date));
    if(!data.length)throw new Error('empty NDVI');
  }catch{data=null;}
  return {days:data,record:{id:'MODIS_NDVI',name:'NASA MODIS MOD13Q1 NDVI',sourceKind:'satellite_observed',
    endpoint:'https://modis.ornl.gov/rst/api/v1/',retrievedAt:data?meta.retrievedAt??null:null,version:data?meta.version??'verify-provider-metadata':null,
    resolution:'250 m; 16 days; only quality reliability=0 is used',limitations:'Mixed pixels, cloud gaps, seasonal thresholds require local calibration.',status:data?'loaded':'unavailable',count:data?.length}};
}
export async function optionalSoil(lat:number,lon:number):Promise<{soil:SoilProfile|null;record:SourceRecord}>{
  const path=join(OBS,'soil.json');let soil:SoilProfile|null=null;let retrievedAt:string|null=null;
  try{const c=JSON.parse(await readFile(path,'utf8'));if(Math.abs(c.lat-lat)<0.005&&Math.abs(c.lon-lon)<0.005&&c.properties){soil=c;retrievedAt=c.retrievedAt??null;}}catch{}
  // SoilGrids occasionally returns 429/5xx; an unavailable layer never becomes an estimated number.
  if(!soil&&process.env.FS_SOIL_LIVE==='1'){
    const url=new URL('https://rest.isric.org/soilgrids/v2.0/properties/query');
    url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));url.searchParams.append('property','soc');url.searchParams.append('property','clay');url.searchParams.append('property','sand');url.searchParams.append('property','phh2o');url.searchParams.append('depth','0-5cm');url.searchParams.append('value','mean');
    try{
      const raw=await getJson(url.toString(),6000);
      const properties:SoilProfile['properties']={};
      for(const layer of raw.properties?.layers||[]){const factor=layer.unit_measure?.d_factor||1;properties[layer.name]={};for(const d of layer.depths||[])properties[layer.name][d.label]=d.values?.mean==null?null:d.values.mean/factor;}
      if(properties.soc){retrievedAt=new Date().toISOString();soil={lat,lon,properties,source:'ISRIC SoilGrids v2.0 (modelled)',retrievedAt} as SoilProfile;
        await mkdir(OBS,{recursive:true});await writeFile(path,JSON.stringify(soil,null,2));}
    }catch{}
  }
  return {soil,record:{id:'SOILGRIDS',name:'ISRIC SoilGrids v2.0',sourceKind:'modelled_soil_estimate',endpoint:'https://rest.isric.org/soilgrids/v2.0/properties/query',retrievedAt,
    version:soil?'v2.0':null,resolution:'250 m (model estimate)',limitations:'Not a field/lab soil sample; SOC uses returned d_factor, verify units.',status:soil?'loaded':'unavailable'}};
}
export async function readCrops(){return parseCsv(await readFile(join(ROOT,'assets','crops.csv'),'utf8')).map(r=>{
  const converted:any={...r};for(const k of Object.keys(r))if(!['crop','group','source','notes'].includes(k))converted[k]=Number(r[k]);return converted;
});}
export async function readStrategies(){return JSON.parse(await readFile(join(ROOT,'assets','strategies.example.json'),'utf8'));}
