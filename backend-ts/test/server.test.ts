import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/server.ts';
import { NasaPowerClient } from '../src/nasaPower.ts';

const mockClient = new NasaPowerClient((async () => new Response(JSON.stringify({ properties: { parameter: { T2M: { 20250101: 15 } } } }), { status: 200 })) as typeof fetch);

test('HTTP endpoint validates input and serves NASA POWER data', async () => {
  const app = createApp(mockClient);
  await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const address = app.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    const base = `http://127.0.0.1:${address.port}`;
    const health = await (await fetch(base + '/health')).json();
    assert.equal(health.upstreamChecked, false);
    const invalid = await fetch(base + '/api/v1/climate/observations?lat=99&lon=35&start=2025-01-01&end=2025-01-02');
    assert.equal(invalid.status, 400);
    const valid = await fetch(base + '/api/v1/climate/observations?lat=31.95&lon=35.93&start=2025-01-01&end=2025-01-01');
    assert.equal(valid.status, 200);
    const result = await valid.json();
    assert.equal(result.days[0].temperatureMeanC, 15);
    assert.equal(result.days[0].precipitationMm, null);
    const sources = await (await fetch(base + '/api/v1/data-sources')).json();
    assert.deepEqual(sources.integrated, ['NASA_POWER']);
  } finally {
    await new Promise<void>((resolve, reject) => app.close(err => err ? reject(err) : resolve()));
  }
});
