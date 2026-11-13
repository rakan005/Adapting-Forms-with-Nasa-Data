import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPowerUrl, NasaPowerClient, parsePowerResponse, validatePowerRequest, PowerApiError } from '../src/nasaPower.ts';

const request = { latitude: 31.95, longitude: 35.93, start: '2025-01-01', end: '2025-01-03' };
const sample = {
  header: { fill_value: -999 },
  parameters: { T2M: { units: 'C' }, PRECTOTCORR: { units: 'mm/day' } },
  properties: { parameter: {
    T2M: { 20250101: 10, 20250102: -999, 20250103: 12 },
    T2M_MAX: { 20250101: 18, 20250102: 20, 20250103: 21 },
    T2M_MIN: { 20250101: 2, 20250102: 4, 20250103: 5 },
    RH2M: { 20250101: 40, 20250102: 60, 20250103: 50 },
    PRECTOTCORR: { 20250101: 0, 20250102: -999, 20250103: 7.1 },
    WS2M: { 20250101: 1.1, 20250102: 1.3, 20250103: 1.5 },
    ALLSKY_SFC_SW_DWN: { 20250101: 4.1, 20250102: 4.2, 20250103: 4.3 },
  } },
};

function q(value: string) { return new URLSearchParams(value); }

test('validates coordinates and Gregorian date ranges', () => {
  assert.deepEqual(validatePowerRequest(q('lat=31.95&lon=35.93&start=2025-01-01&end=2025-01-03')), request);
  for (const query of [
    'lat=91&lon=35&start=2025-01-01&end=2025-01-03',
    'lat=31&lon=181&start=2025-01-01&end=2025-01-03',
    'lat=&lon=35&start=2025-01-01&end=2025-01-03',
    'lat=31&lon=35&start=2025-02-30&end=2025-03-01',
    'lat=31&lon=35&start=2024-01-01&end=2025-03-01',
    'lat=31&lon=35&start=2025-01-03&end=2025-01-01',
    'lat=31&lon=35&start=2030-01-01&end=2030-01-03',
  ]) assert.throws(() => validatePowerRequest(q(query)), PowerApiError);
});

test('builds valid NASA POWER daily URL', () => {
  const url = new URL(buildPowerUrl(request));
  assert.equal(url.hostname, 'power.larc.nasa.gov');
  assert.equal(url.searchParams.get('community'), 'AG');
  assert.equal(url.searchParams.get('start'), '20250101');
  assert.equal(url.searchParams.get('time-standard'), 'LST');
  assert.ok(url.searchParams.get('parameters')?.includes('PRECTOTCORR'));
});

test('parses time series with null missing values, never converting missing rain to zero', () => {
  const result = parsePowerResponse(sample, request, buildPowerUrl(request), new Date('2026-11-13T00:00:00Z'));
  assert.equal(result.days.length, 3);
  assert.equal(result.days[1].temperatureMeanC, null);
  assert.equal(result.days[1].precipitationMm, null);
  assert.equal(result.summary.precipitationTotalMm, 7.1);
  assert.equal(result.summary.averageTemperatureC, 11);
  assert.equal(result.summary.missingValues, 2);
  assert.equal(result.summary.observedDays.precipitationMm, 2);
  assert.equal(result.source.units.T2M, 'C');
});

test('does not claim precipitation total if all observations are missing', () => {
  const empty = { properties: { parameter: { PRECTOTCORR: {} } } };
  const result = parsePowerResponse(empty, request, 'https://power.larc.nasa.gov');
  assert.equal(result.summary.precipitationTotalMm, null);
  assert.equal(result.summary.missingValues, result.summary.totalValues);
});

test('deduplicates concurrent requests and caches success, not failures', async () => {
  let count = 0;
  const mock = async () => { count++; return new Response(JSON.stringify(sample), { status: 200 }); };
  const client = new NasaPowerClient(mock as typeof fetch);
  const [a, b] = await Promise.all([client.fetchDaily(request), client.fetchDaily(request)]);
  assert.deepEqual(a, b);
  assert.equal(count, 1);
  await client.fetchDaily(request);
  assert.equal(count, 1);

  let failCount = 0;
  const failing = new NasaPowerClient((async () => { failCount++; return new Response('{}', { status: 503 }); }) as typeof fetch);
  await assert.rejects(() => failing.fetchDaily(request), PowerApiError);
  await assert.rejects(() => failing.fetchDaily(request), PowerApiError);
  assert.equal(failCount, 2);
});

test('fails when upstream has malformed JSON or no parameter object', async () => {
  const bad = new NasaPowerClient((async () => new Response('not-json', { status: 200 })) as typeof fetch);
  await assert.rejects(() => bad.fetchDaily(request), /valid JSON/);
  assert.throws(() => parsePowerResponse({}, request, ''), /no parameter object/);
});
