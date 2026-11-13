import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { NasaPowerClient, PowerApiError, validatePowerRequest } from './nasaPower.ts';

function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(data));
}

function applyCors(request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map(x => x.trim());
  if (allowed.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

export function createApp(client = new NasaPowerClient()) {
  return createServer(async (request, response) => {
    applyCors(request, response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/health') {
      json(response, 200, { status: 'ok', service: 'crop-advisor-backend-ts', upstreamChecked: false });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/v1/data-sources') {
      json(response, 200, {
        integrated: ['NASA_POWER'],
        planned: ['SMAP', 'GPM_IMERG', 'LANDSAT', 'SENTINEL_2', 'FAO_GAEZ', 'SRTM'],
        note: 'Only NASA POWER is integrated in this phase. Planned datasets are not fetched yet.',
      });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/v1/climate/observations') {
      try {
        const powerRequest = validatePowerRequest(url.searchParams);
        const data = await client.fetchDaily(powerRequest);
        json(response, 200, data);
      } catch (error) {
        if (error instanceof PowerApiError) json(response, error.httpStatus, { error: { code: error.code, message: error.message } });
        else json(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
      }
      return;
    }
    json(response, 404, { error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });
}
