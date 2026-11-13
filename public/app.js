/** Field Shift UI. Static GitHub Pages uses explicitly synthetic browser demo only.
 *  A Node deployment can also offer real NASA POWER through /api/evaluate. */
const $ = id => document.getElementById(id);
const ROOT = new URL('./', import.meta.url);
const url = path => new URL(path, ROOT);
const labels = {
  water_saving:['توفير الماء','Water saving'], soil_building:['بناء التربة','Soil building'],
  erosion_control:['تقليل التعرية','Erosion control'], income:['الدخل / العلف','Income / forage'],
  heat_risk:['مخاطر الحرارة','Heat resilience']
};
const cropNames = {
  wheat:['قمح','Wheat'],barley:['شعير','Barley'],oats:['شوفان','Oats'],maize:['ذرة','Maize'],
  sorghum:['ذرة رفيعة','Sorghum'],millet:['دخن','Millet'],chickpea:['حمص','Chickpea'],
  lentil:['عدس','Lentil'],faba_bean:['فول','Fava beans'],vetch_cover:['بيقية تغطية','Vetch cover'],
  clover_berseem:['برسيم','Clover'],alfalfa:['فصة','Alfalfa'],canola:['كانولا','Canola'],
  sunflower:['دوار الشمس','Sunflower'],potato:['بطاطا','Potato'],tomato:['بندورة','Tomato'],fallow:['بور','Fallow']
};
const months = [['يناير','February'],['فبراير','February'],['مارس','March'],['أبريل','April'],['مايو','May'],['يونيو','June'],['يوليو','July'],['أغسطس','August'],['سبتمبر','September'],['أكتوبر','October'],['نوفمبر','November'],['ديسمبر','December']];months[0][1]='January';
const nameStrategies = {
  baseline:['التناوب الحالي','Current rotation'],water_resilience:['مرونة مائية','Water resilience'],
  soil_building:['بناء التربة','Soil building'],income_forage:['دخل / علف','Income / forage']
};
const symbolStrategies={baseline:['●','#6B7280'],water_resilience:['■','#0072B2'],soil_building:['▲','#009E73'],income_forage:['◆','#E69F00']};
const sourceTags={
  NASA_POWER_MODELLED:['🧮 مناخ مُنمذج','🧮 Modelled climate','model'],
  MODEL_INFERRED:['🧮 استنتاج','🧮 Model inferred','model'],
  EXPERT_ASSUMED:['👤 افتراض','👤 Expert assumed','assumed'],
  DEMO_SYNTHETIC:['⚠ بيانات مصطنعة','⚠ Synthetic','demo'],
  USER_REPORTED_SOIL:['👤 تحليل مُدخل','👤 User-reported soil','assumed'],
  SOILGRIDS_MODELLED:['🧮 تقدير التربة','🧮 Soil estimate','model'],
  MODIS_SATELLITE_OBSERVED:['🛰 رصد NDVI','🛰 Observed NDVI','observed']
};
const str=(ar,en)=>lang==='ar'?ar:en;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang='ar',step=1,loaded=false,staticPreview=false,requestSequence=0,requestController=null,hasResults=false,retryTimer=null,lastResult=null, availableCrops=[];
const fmt=(v,d=0)=>v===null||v===undefined||!Number.isFinite(Number(v))?str('غير متاح','Unavailable'):Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
const cropLabel=k=>cropNames[k]?.[lang==='ar'?0:1]??k;
const monthLabel=m=>months[m-1]?.[lang==='ar'?0:1]??String(m);
const strategyLabel=k=>nameStrategies[k]?.[lang==='ar'?0:1]??k;
function setLanguage(next){lang=next;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-ar][data-en]').forEach(el=>{el.textContent=el.dataset[lang];});
  $('lang-ar').setAttribute('aria-pressed',String(lang==='ar'));$('lang-en').setAttribute('aria-pressed',String(lang==='en'));
  rebuildCropOptions();setModeNote();if(lastResult)render(lastResult);
}
function rebuildCropOptions(){if(!availableCrops.length)return;
  for(const id of ['crop1','crop2','crop3']){const old=$(id).value||({crop1:'wheat',crop2:'fallow',crop3:''}[id]);
    $(id).innerHTML=(id==='crop3'?`<option value="">${esc(str('بدون موسم إضافي','No extra season'))}</option>`:'')+
      availableCrops.map(c=>`<option value="${esc(c.id)}">${esc(cropLabel(c.id))}</option>`).join('');
    $(id).value=old;}
}
function setStep(next){step=Math.max(1,Math.min(3,next));document.querySelectorAll('[data-step]').forEach(e=>e.classList.toggle('hidden',Number(e.dataset.step)!==step));
  document.querySelectorAll('[data-goto-step]').forEach(e=>{const yes=Number(e.dataset.gotoStep)===step;e.classList.toggle('active',yes);e.setAttribute('aria-selected',String(yes));});
  $('prev-step').disabled=step===1;$('next-step').classList.toggle('hidden',step===3);$('submit').classList.toggle('hidden',step!==3);}
function setModeNote(){const demo=$('mode').value==='demo';$('mode-flag').classList.toggle('demo',demo);
  $('mode-flag-text').textContent=demo?str('⚠ تجربة توضيحية فقط','⚠ Synthetic educational demo'):str('● NASA POWER تاريخي','● Historical NASA POWER');
  $('mode-note').textContent=demo?str('تُستخدم بيانات مصطنعة بوضوح. ليست رصدًا من NASA.','Uses clearly labelled synthetic weather, never presented as NASA measurements.'):
  str('الوضع الحي يحتاج خادم Node.js متصلًا بخدمة NASA POWER.','Live mode requires a connected Node.js server for NASA POWER.');}
function updateMap(){const lat=Number($('lat').value),lon=Number($('lon').value);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
  const bbox=[lon-.035,lat-.02,lon+.035,lat+.02].map(n=>n.toFixed(5)).join(',');
  $('map').src=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
  $('coordinates').textContent=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;}
function collect(){const weights={};for(const k of Object.keys(labels))weights[k]=Number($(k).value);
  return {lat:Number($('lat').value),lon:Number($('lon').value),areaDunum:Number($('areaDunum').value),
    waterSource:$('waterSource').value,soilSocGkg:$('soilSocGkg').value===''?null:Number($('soilSocGkg').value),
    currentRotation:[$('crop1').value,$('crop2').value,$('crop3').value].filter(Boolean),weights,
    scenario:{rainPct:Number($('rainPct').value),tempDeltaC:Number($('tempDeltaC').value)},mode:$('mode').value};}
function validate(){for(const id of ['lat','lon','areaDunum','crop1','crop2','soilSocGkg']){const el=$(id);if(!el.checkValidity()){setStep(['crop1','crop2'].includes(id)?2:1);el.reportValidity();return false;}}
  if(Object.keys(labels).every(k=>Number($(k).value)===0)){setStep(3);showError(str('حدد أولوية واحدة على الأقل بقيمة أكبر من صفر.','Set at least one priority above zero.'));return false;}return true;}
function clearPending(){if(requestController)requestController.abort();if(retryTimer)clearTimeout(retryTimer);}
function schedule(){if(!hasResults)return;clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(validate())submit();},500);}
function showError(message){$('loading').classList.add('hidden');$('error').classList.remove('hidden');$('error-text').textContent=message;}
async function submit(){if(!loaded||!validate())return;const input=collect(),ticket=++requestSequence;
  clearPending();requestController=new AbortController();$('empty').classList.add('hidden');$('results').classList.add('hidden');$('error').classList.add('hidden');$('loading').classList.remove('hidden');$('submit').disabled=true;
  try{
    let result;
    if(staticPreview){if(input.mode!=='demo')throw new Error(str('هذه معاينة GitHub Pages ثابتة. بيانات Live تحتاج نشر Backend على Render. اختر Synthetic Demo.','GitHub Pages is a static preview. Live NASA data need a deployed backend. Choose Synthetic Demo.'));
      const {evaluateDemo}=await import('./demo-engine.js');result=await evaluateDemo(input);
    }else{
      const r=await fetch(url('api/evaluate'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:requestController.signal});
      const out=await r.json();if(!r.ok)throw new Error(out.message||`API HTTP ${r.status}`);result=out;}
    if(ticket!==requestSequence)return;lastResult=result;render(result);hasResults=true;$('loading').classList.add('hidden');$('results').classList.remove('hidden');
    $('results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }catch(e){if(ticket!==requestSequence||e.name==='AbortError')return;showError(e.message||String(e));}
  finally{if(ticket===requestSequence)$('submit').disabled=false;}}
function simpleList(xs){return `<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;}
function strategyCard(s,index){const [symbol,color]=symbolStrategies[s.id]??['◇','#6B7280'];const c=s.confidence;
  const confTxt=c==='high'?str('ثقة عالية','High confidence'):c==='medium'?str('ثقة متوسطة','Medium confidence'):str('ثقة منخفضة','Low confidence');
  const meter=c==='high'?'●●●':c==='medium'?'●●○':'●○○';
  const crit=Object.keys(labels).map(k=>`<div class="criterion"><span>${esc(labels[k][lang==='ar'?0:1])}</span><div class="track"><span style="width:${Math.max(0,Math.min(100,s.criteria[k]*100))}%"></span></div><b>${fmt(s.criteria[k]*100)}%</b></div>`).join('');
  const badges=(s.sourceTags||[]).map(t=>{const label=sourceTags[t]??[t,t,'assumed'];return `<span class="source-pill ${label[2]}" title="${esc(t)}">${esc(label[lang==='ar'?0:1])}</span>`;}).join('');
  const p5=Math.max(0,Math.min(100,s.p5*100)),p95=Math.max(0,Math.min(100,s.p95*100)),mean=Math.max(0,Math.min(100,s.mean*100));
  const confReason=s.confidence==='low'?str('بيانات التربة أو NDVI غير مكتملة؛ المؤشر يقيس ثبات الترتيب فقط.','Soil or NDVI coverage is incomplete; confidence is about ranking stability only.'):
    str('مستوى الثقة مبني على تغطية البيانات وحساسية الترتيب.','Based on data coverage and ranking sensitivity.');
  return `<article class="strategy ${index===0?'best':''}" style="--strategy-color:${color}">
    <div class="strategy-head"><div><span class="tag ${s.isBaseline?'baseline':''}">${esc(symbol)} ${s.isBaseline?esc(str('مرجع: التناوب الحالي','BASELINE')):esc(str('استراتيجية بديلة','ALTERNATIVE'))}</span><h3>${esc(strategyLabel(s.id))}</h3></div><div class="score" dir="ltr">${fmt(mean)}<small>/100</small></div></div>
    <div class="crop-chain" aria-label="Crop rotation">${s.seasons.map((k,i)=>(i?'<span class="chain-arrow">←</span>':'')+`<span class="crop-chip">${esc(cropLabel(k))}</span>`).join('')}</div>
    <div class="range" dir="ltr"><span>${fmt(p5)}%</span><div class="range-track" aria-label="P5 to P95"><span class="range-band" style="left:${p5}%;width:${Math.max(.4,p95-p5)}%"></span><span class="range-mid" style="left:${mean}%"></span></div><span>${fmt(p95)}%</span></div>
    <p class="range-note">P5–P95 · ${esc(str('نطاق الحساسية / خط = المتوسط','sensitivity interval / marker = mean'))}</p>
    <div class="confidence ${esc(c)}">${c==='high'?'✓':c==='medium'?'◐':'▲'} ${esc(confTxt)} ${meter}</div><p class="confidence-reason">${esc(confReason)} · P(top): ${fmt(s.p_top*100)}%</p>
    <div class="criteria">${crit}</div><div class="pillrow">${badges}</div>
    <details><summary>${esc(str('لماذا؟ الأدلة والفوائد والمخاطر','Why? Evidence, benefits & risks'))}</summary><div class="detail-list">
    <strong>${esc(str('الأدلة','Evidence'))}</strong>${simpleList(s.evidence)}
    <strong>${esc(str('فوائد محتملة','Potential benefits'))}</strong>${simpleList(s.benefits)}
    <strong>${esc(str('فجوات المعلومات','Information gaps'))}</strong>${simpleList(s.informationGaps)}
    <strong>${esc(str('يحتاج مراجعة محلية','Requires local review'))}</strong>${simpleList(s.localReviewRisks)}
    <p>${esc(str('انتقالات لكسر دورة الآفات','Pest break transitions'))}: ${esc(s.pest_break_transitions)} · ${esc(str('نسبة البور','Fallow share'))}: ${fmt(s.bare_rotation_share*100)}%</p>
    </div></details></article>`;
}
function classifySource(s){if(s.status==='simulated'||s.sourceKind==='synthetic')return ['⚠',str('بيانات اصطناعية','Synthetic'),'demo'];
  if(s.sourceKind==='satellite_observed')return ['🛰',str('رصد','Observed'),'observed'];
  if(s.sourceKind?.includes('expert')||s.sourceKind?.includes('farmer'))return ['👤',str('افتراض / إدخال','Assumed / reported'),'assumed'];
  return ['🧮',str('تقدير / نموذج','Modelled'),'model'];}
function render(r){$('result-title').textContent=r.simulated?str('نتائج تجريبية · ليست بيانات NASA','Synthetic comparison · NOT NASA data'):str('مقارنة بالاعتماد على NASA POWER','NASA POWER-informed comparison');
  $('result-subtitle').textContent=`${r.features.years_used.join('–')} · ${fmt(r.coordinates.lat,4)}, ${fmt(r.coordinates.lon,4)} · ${fmt(r.areaDunum,1)} ${str('دونم','dunums')}`;
  $('warnings').innerHTML=(r.notices||[]).map(x=>`<div class="warning ${r.simulated?'demo':''}">${esc(x)}</div>`).join('');
  const f=r.features,quality=r.simulated?str('مصطنع','Synthetic'):f.ndvi_valid_share===null?str('NDVI غير متاح','NDVI unavailable'):fmt(f.data_quality*100)+'%';
  const rows=[[str('الهطول السنوي','Annual precipitation'),fmt(f.rain_mm_mean)+' mm',r.simulated?str('محاكاة','Synthetic'):str('🧮 NASA POWER','🧮 NASA POWER')],
  [str('عجز المياه التقديري','Estimated water deficit'),fmt(f.deficit_mm_mean)+' mm',str('🧮 مشتق','🧮 Derived')],
  [str('الأيام الحارة سنويًا','Hot days / year'),fmt(f.heat_days_mean),str('عتبة 35°C افتراضية','35°C heuristic threshold')],
  [str('تغطية البيانات','Data coverage'),quality,r.simulated?str('ليست بيانات مرصودة','Not observational data'):str('حسب المصادر المتاحة','Based on available sources')]];
  $('kpis').innerHTML=rows.map(([title,value,note])=>`<div class="kpi"><small>${esc(title)}</small><b dir="ltr">${esc(value)}</b><i>${esc(note)}</i></div>`).join('');
  $('strategy-cards').innerHTML=r.strategies.map(strategyCard).join('');
  const maxRain=Math.max(1,...f.monthly.map(m=>m.rainMm)),maxHeat=Math.max(1,...f.monthly.map(m=>m.heatDays));
  $('timeline').innerHTML=f.monthly.map(m=>`<div class="timeline-col ${m.bare===true?'bare':''}" title="${esc(monthLabel(m.month))} · ${fmt(m.rainMm)} mm · NDVI ${fmt(m.ndvi,2)}"><div class="timeline-bars"><div class="timeline-bar" style="height:${Math.max(2,m.rainMm/maxRain*100)}%"></div><div class="timeline-bar heat" style="height:${Math.max(2,m.heatDays/maxHeat*100)}%"></div>${m.ndvi!==null?`<div class="timeline-bar ndvi" style="height:${Math.max(2,m.ndvi*100)}%"></div>`:''}</div><div class="timeline-number">${fmt(m.rainMm)}</div><div class="timeline-month">${esc(monthLabel(m.month))}</div></div>`).join('');
  $('timeline-note').textContent=f.ndvi_valid_share===null?str('NDVI غير متاح؛ لا يمكن إثبات الفترات العارية. حد NDVI = 0.2 مبدئي ويحتاج معايرة.','NDVI unavailable; bare-field periods cannot be confirmed. The 0.2 threshold requires local calibration.'):
    `${str('الأشهر ذات الغطاء المحتمل المنخفض','Potential low vegetation months')}: ${f.bare_months.map(monthLabel).join('، ')||str('لا يوجد بحسب البيانات الصالحة','none in valid observations')}. ${str('NDVI ليس دليلًا قاطعًا على البور.','NDVI does not prove fallow.')}`;
  $('sources').innerHTML=r.sources.map(s=>{const [symbol,tag,kind]=classifySource(s);return `<div class="source-row"><div><span class="source-pill ${kind}">${symbol} ${esc(tag)}</span><b> ${esc(s.name)}</b><p>${esc(s.resolution)} · ${esc(s.limitations)}</p><p>${esc(str('الإصدار','Version'))}: ${esc(s.version??str('غير محدد','Unknown'))} · ${esc(str('تاريخ الجلب','Retrieved'))}: ${esc(s.retrievedAt??str('غير متاح','Unavailable'))}</p></div><span class="status ${esc(s.status)}">${esc(s.status)}</span></div>`;}).join('');
  $('methodology').innerHTML=Object.entries(r.methodology||{}).map(([k,v])=>`<p><b>${esc(k)}</b>: ${esc(v)}</p>`).join('');}
async function boot(){const fromUrl=new URLSearchParams(location.search);if(fromUrl.get('lang')==='en')lang='en';
  $('lang-ar').addEventListener('click',()=>setLanguage('ar'));$('lang-en').addEventListener('click',()=>setLanguage('en'));
  $('prev-step').addEventListener('click',()=>setStep(step-1));$('next-step').addEventListener('click',()=>setStep(step+1));
  document.querySelectorAll('[data-goto-step]').forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.gotoStep))));
  $('quick-demo').addEventListener('click',()=>{$('mode').value='demo';setModeNote();$('lat').value='31.9';$('lon').value='35.9';$('areaDunum').value='12.5';$('waterSource').value='RAINFED';$('crop1').value='wheat';$('crop2').value='fallow';$('crop3').value='';updateMap();submit();});
  $('mode').addEventListener('change',()=>{setModeNote();schedule();});
  for(const k of [...Object.keys(labels),'rainPct','tempDeltaC']){$(k).addEventListener('input',()=>{$('out-'+k).textContent=$(k).value;schedule();});}
  for(const id of ['crop1','crop2','crop3','waterSource','soilSocGkg'])$(id).addEventListener('change',schedule);
  for(const id of ['lat','lon'])$(id).addEventListener('change',()=>{updateMap();schedule();});
  $('retry').addEventListener('click',submit);$('print').addEventListener('click',()=>window.print());
  $('farm-form').addEventListener('submit',e=>{e.preventDefault();submit();});
  try{const response=await fetch(url('api/config'),{signal:AbortSignal.timeout(5500)});if(!response.ok)throw new Error('No Node API');const conf=await response.json();availableCrops=conf.crops;}
  catch{staticPreview=true;const response=await fetch(url('demo-catalog.json'));if(!response.ok)throw new Error('Static catalog is unavailable');const conf=await response.json();availableCrops=conf.crops;
    $('mode').value='demo';$('mode').querySelector('option[value=live]').disabled=true;}
  loaded=true;setLanguage(lang);setStep(1);updateMap();
  // Demo view should open with a meaningful result without requiring login or an API server.
  if(staticPreview)submit();
}
boot().catch(e=>showError(e.message||String(e)));
