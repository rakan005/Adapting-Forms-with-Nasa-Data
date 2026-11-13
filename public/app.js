const $=id=>document.getElementById(id);
const labels={water_saving:'توفير الماء',soil_building:'تحسين التربة',erosion_control:'تقليل التعرية',income:'مرونة الدخل',heat_risk:'مخاطر الحرارة'};
const cropAr={wheat:'قمح',barley:'شعير',oats:'شوفان',maize:'ذرة',sorghum:'ذرة رفيعة',millet:'دخن',chickpea:'حمص',lentil:'عدس',faba_bean:'فول',vetch_cover:'بيقية تغطية',clover_berseem:'برسيم',alfalfa:'فصة',canola:'كانولا',sunflower:'دوار الشمس',potato:'بطاطا',tomato:'بندورة',fallow:'بور'};
const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loadedConfig=false,active=null,seq=0,hasResults=false,changeTimer=null;
function scheduleRerun(){if(!hasResults)return;clearTimeout(changeTimer);changeTimer=setTimeout(submit,450);}
async function init(){
  try{const resp=await fetch('/api/config');if(!resp.ok)throw new Error('تعذر تحميل قائمة المحاصيل');const cfg=await resp.json();
    for(const id of ['crop1','crop2','crop3']){
      $(id).innerHTML=(id==='crop3'?'<option value="">بدون موسم إضافي</option>':'')+cfg.crops.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(cropAr[c.id]||c.id)} · ${escapeHtml(c.id)}</option>`).join('');
    }
    $('crop1').value='wheat';$('crop2').value='fallow';loadedConfig=true;
  }catch(e){$('error').classList.remove('hidden');$('error-text').textContent=e.message;}
  for(const id of [...Object.keys(labels),'rainPct','tempDeltaC'])$(id).addEventListener('input',()=>{$('out-'+id).textContent=$(id).value;scheduleRerun();});
  $('mode').addEventListener('change',()=>{$('mode-note').textContent=$('mode').value==='demo'?'⚠ بيانات مصطنعة للتجربة فقط؛ لا يجوز تقديمها كبيانات NASA.':'الوضع الحي يجلب بيانات NASA POWER التاريخية من المصدر الرسمي.';});
  for(const id of ['lat','lon'])$(id).addEventListener('change',updateMap);
  $('retry').addEventListener('click',submit);
  $('print').addEventListener('click',()=>window.print());
  $('farm-form').addEventListener('submit',e=>{e.preventDefault();submit();});updateMap();
}
function updateMap(){let lat=Number($('lat').value),lon=Number($('lon').value);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
  const bbox=[lon-.035,lat-.02,lon+.035,lat+.02].map(n=>n.toFixed(5)).join(',');
  $('map').src=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
  $('coordinates').textContent=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
function collect(){const weights={};for(const id of Object.keys(labels))weights[id]=Number($(id).value);
  return {lat:Number($('lat').value),lon:Number($('lon').value),areaDunum:Number($('areaDunum').value),waterSource:$('waterSource').value,soilSocGkg:$('soilSocGkg').value===""?null:Number($('soilSocGkg').value),
  currentRotation:[$('crop1').value,$('crop2').value,$('crop3').value].filter(Boolean),weights,
  scenario:{rainPct:Number($('rainPct').value),tempDeltaC:Number($('tempDeltaC').value)},mode:$('mode').value};}
async function submit(){if(!loadedConfig)return;const req=collect();const ticket=++seq;if(active)active.abort();active=new AbortController();
  $('empty').classList.add('hidden');$('results').classList.add('hidden');$('error').classList.add('hidden');$('loading').classList.remove('hidden');$('submit').disabled=true;
  try{const r=await fetch('/api/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req),signal:active.signal});const result=await r.json();if(ticket!==seq)return;
    if(!r.ok)throw new Error(result.message||`API HTTP ${r.status}`);draw(result);hasResults=true;$('loading').classList.add('hidden');$('results').classList.remove('hidden');$('results').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){if(ticket!==seq||e.name==='AbortError')return;$('loading').classList.add('hidden');$('error-text').textContent=e.message;$('error').classList.remove('hidden');}
  finally{if(ticket===seq)$('submit').disabled=false;}}
const fmt=(x,d=1)=>x===null||x===undefined||!Number.isFinite(x)?'غير متاح':Number(x).toLocaleString('en-US',{maximumFractionDigits:d});
function draw(r){
  $('result-title').textContent=r.simulated?'نتائج تجريبية — ليست بيانات NASA':'مقارنة التناوب المدعومة ببيانات NASA POWER';
  $('result-subtitle').textContent=`${r.features.years_used.join('، ')} · موقع (${fmt(r.coordinates.lat,4)}, ${fmt(r.coordinates.lon,4)}) · ${fmt(r.areaDunum)} دونم`;
  $('warnings').innerHTML=r.notices.map(x=>`<div class="warning ${r.simulated?'demo':''}">${escapeHtml(x)}</div>`).join('');
  const f=r.features;
  const rows=[['متوسط الهطول السنوي',`${fmt(f.rain_mm_mean)} مم`,'NASA POWER · تقريبي'],['العجز المائي المقدر',`${fmt(f.deficit_mm_mean)} مم`,'ETo – الهطول؛ نموذج'],['الأيام الحارة سنويًا',`${fmt(f.heat_days_mean)} يوم`,'عتبة 35°C افتراضية'],['جودة البيانات',`${fmt(f.data_quality*100)}%`,r.simulated?'مصطنع · ليست جودة رصد':f.ndvi_valid_share===null?'بدون NDVI':'مع NDVI']];
  $('kpis').innerHTML=rows.map(x=>`<div class="kpi"><small>${escapeHtml(x[0])}</small><b>${escapeHtml(x[1])}</b><i>${escapeHtml(x[2])}</i></div>`).join('');
  $('strategy-cards').innerHTML=r.strategies.map((s,i)=>strategyCard(s,i)).join('');
  const maxRain=Math.max(...f.monthly.map(m=>m.rainMm),1),maxHeat=Math.max(...f.monthly.map(m=>m.heatDays),1);
  $('timeline').innerHTML=f.monthly.map(m=>`<div class="timeline-col ${m.bare===true?'bare':''}" title="${escapeHtml(months[m.month-1])}: ${fmt(m.rainMm)} mm, ${fmt(m.heatDays)} hot days, NDVI ${fmt(m.ndvi,2)}"><div class="timeline-bars"><div class="timeline-bar" style="height:${Math.max(2,m.rainMm/maxRain*100)}%"></div><div class="timeline-bar heat" style="height:${Math.max(2,m.heatDays/maxHeat*100)}%"></div>${m.ndvi!==null?`<div class="timeline-bar ndvi" style="height:${Math.max(2,Math.min(100,m.ndvi*100))}%"></div>`:''}</div><div class="timeline-number">${fmt(m.rainMm,0)}</div><div class="timeline-month">${escapeHtml(months[m.month-1])}</div></div>`).join('');
  $('timeline-note').textContent=f.ndvi_valid_share===null?'NDVI غير متاح؛ لا يمكن الجزم بفترات الأرض العارية. العتبة المرجعية 0.2 بحاجة معايرة محلية.':`أشهر الانخفاض المحتمل في الغطاء النباتي: ${f.bare_months.map(x=>months[x-1]).join('، ')||'لا يوجد شهر تحت العتبة في العينات الصالحة'}. NDVI مؤشر للغطاء وليس إثباتًا على ترك الأرض بور.`;
  $('sources').innerHTML=r.sources.map(s=>`<div class="source-row"><div><b>${escapeHtml(s.name)}</b><p>${escapeHtml(s.sourceKind)} · ${escapeHtml(s.resolution)}</p><p>${escapeHtml(s.limitations)}</p><p>Version: ${escapeHtml(s.version??'غير محدد')} · Retrieved: ${escapeHtml(s.retrievedAt??'غير متاح')}</p></div><span class="status ${escapeHtml(s.status)}">${escapeHtml(s.status)}</span></div>`).join('');
  $('methodology').innerHTML=Object.entries(r.methodology).map(([k,v])=>`<p><b>${escapeHtml(k)}</b>: ${escapeHtml(v)}</p>`).join('');
}
function strategyCard(s,index){const crit=Object.entries(labels).map(([k,l])=>`<div class="criterion"><span>${escapeHtml(l)}</span><div class="track"><span style="width:${Math.min(100,Math.max(0,s.criteria[k]*100))}%"></span></div><b>${fmt(s.criteria[k]*100,0)}</b></div>`).join('');
  const list=(xs)=>'<ul>'+xs.map(x=>`<li>${escapeHtml(x)}</li>`).join('')+'</ul>';
  return `<article class="strategy ${index===0?'best':''}"><div class="strategy-head"><div><span class="tag ${s.isBaseline?'baseline':''}">${s.isBaseline?'CURRENT BASELINE':index===0?'HIGHEST RELATIVE SCORE':'ALTERNATIVE ROTATION'}</span><h3>${escapeHtml(s.name)}</h3></div><div class="score">${fmt(s.mean*100,0)}<small> /100</small></div></div>
   <div class="crop-chain">${s.seasons.map((c,i)=>`${i?'<span class="chain-arrow">←</span>':''}<span class="crop-chip">${escapeHtml(cropAr[c]||c)}</span>`).join('')}</div>
   <p class="desc">${escapeHtml(s.why)}</p>
   <div class="range"><span>${fmt(s.p5*100,0)}%</span><div class="range-track"><span class="range-band" style="left:${s.p5*100}%;width:${Math.max(1,(s.p95-s.p5)*100)}%"></span></div><span>${fmt(s.p95*100,0)}%</span></div>
   <div class="confidence">Sensitivity P(top): ${fmt(s.p_top*100,1)}% · الثقة ${s.confidence==='low'?'منخفضة':s.confidence==='medium'?'متوسطة':'مرتفعة'}</div>
   <div class="criteria">${crit}</div><div class="pillrow">${s.sourceTags.map(t=>`<span class="source-pill">${escapeHtml(t)}</span>`).join('')}</div>
   <details><summary>لماذا؟ الأدلة والفوائد والمخاطر</summary><div class="detail-list"><strong>الأدلة</strong>${list(s.evidence)}<strong>الفوائد المحتملة</strong>${list(s.benefits)}<strong>فجوات المعلومات</strong>${list(s.informationGaps)}<strong>مراجعة محلية إلزامية</strong>${list(s.localReviewRisks)}<strong>فرص كسر الآفات بين حبوب وبقوليات</strong>: ${s.pest_break_transitions} انتقالات · <strong>نسبة البور في الخطة</strong>: ${fmt(s.bare_rotation_share*100)}% · <strong>عقوبة محدودية الري (افتراض)</strong>: ${fmt((s.water_access_penalty??0)*100)} نقطة</div></details></article>`;}
init();
