/** NASA browser module tests use *fabricated test fixtures only* and never claim real NASA data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nasaPowerUrl,powerDaysFromResponse} from '../public/browser-live.js';

test('NASA URL requests historical daily real-source parameters for the selected location',()=>{
  const url=new URL(nasaPowerUrl(31.9,35.9));
  assert.equal(url.origin,'https://power.larc.nasa.gov');
  assert.equal(url.pathname,'/api/temporal/daily/point');
  assert.equal(url.searchParams.get('start'),'20200101');
  assert.equal(url.searchParams.get('end'),'20241231');
  assert.equal(url.searchParams.get('community'),'AG');
  assert.equal(url.searchParams.get('parameters'),'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR');
  assert.equal(url.searchParams.get('latitude'),'31.90');
});
test('NASA URL rejects invalid coordinates',()=>{
  assert.throws(()=>nasaPowerUrl(100,36),/Invalid coordinates/);
  assert.throws(()=>nasaPowerUrl(NaN,36),/Invalid coordinates/);
});
test('NASA response parser handles sentinels but never creates invented climate values',()=>{
  const raw={properties:{parameter:{
    T2M:{'20240101':12,'20240102':-999},
    T2M_MAX:{'20240101':17,'20240102':20},
    T2M_MIN:{'20240101':7,'20240102':8},
    PRECTOTCORR:{'20240101':4,'20240102':-999}
  }}};
  const days=powerDaysFromResponse(raw);
  assert.deepEqual(days.map(x=>x.date),['2024-01-01','2024-01-02']);
  assert.equal(days[0].PRECTOTCORR,4);
  assert.equal(days[1].T2M,null);
  assert.equal(days[1].PRECTOTCORR,null);
});
test('NASA parser rejects missing parameter fields',()=>{
  assert.throws(()=>powerDaysFromResponse({properties:{parameter:{T2M:{}}}}),/required/);
});
