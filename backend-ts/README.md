# Crop Advisor — Node.js + TypeScript migration (Phase 1)

This folder is an **independent NASA POWER integration prototype**, not yet a replacement for the existing Java/Spring Boot API. The existing React frontend and Java farm, advice, authentication and database endpoints remain unchanged.

## Prerequisites

- Node.js >= 22.16 (native TypeScript type stripping is used, so there are no runtime npm dependencies)
- Optional: `npm install` to install TypeScript and Node types for static checking.

```bash
cd backend-ts
npm test
npm start
# Optional after npm install: npm run typecheck
```

Server defaults to port `3001`, configured with `PORT`.

## Endpoints

- `GET /health` — process health only, **does not** check NASA uptime
- `GET /api/v1/data-sources` — real vs planned providers
- `GET /api/v1/climate/observations?lat=31.95&lon=35.93&start=2025-01-01&end=2025-01-31` — actual NASA POWER daily time series + summary + provenance + missing data metrics

Dates must be ISO calendar dates (1981-01-01 onward; not later than today), request range up to 366 days, coordinates globally valid. A daily POWER grid cell is not equivalent to a field weather station. The API returns null for unavailable observations, not fabricated estimates. Totals and averages are calculated over **available observations only** and include counts of observed vs missing data. Do not interpret incomplete precipitation totals as full-period totals.

Data sources: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

### Optional CORS configuration

Set `ALLOWED_ORIGINS` to a comma-separated list of trusted frontends (example: `http://localhost:5173,https://rakan005.github.io`). The default only allows `http://localhost:5173`. Keep secrets server-side; no NASA key is needed for the public daily point endpoint.

## NASA POWER parameters

| NASA code | Output | Units |
|---|---|---|
| T2M | temperatureMeanC | °C |
| T2M_MAX / T2M_MIN | temperatureMaxC / temperatureMinC | °C |
| RH2M | relativeHumidityPercent | % |
| PRECTOTCORR | precipitationMm | mm/day |
| WS2M | windSpeed2mMs | m/s |
| ALLSKY_SFC_SW_DWN | solarRadiation | Depends on NASA's returned unit metadata |

Request parameters are fixed on the server and the source URL, retrieval time, NASA-provided units, period, and valid observation counts accompany each response. NASA's documented max is 20 daily parameters per point; this service requests seven. Response time standard is Local Solar Time (`LST`).

## What's NOT migrated yet

Auth, PostgreSQL/Flyway, farm management, salinity, crop packs, decision history, recommendations, Gemini chat, subscriptions and production frontend calls. Other NASA products (SMAP, GPM/IMERG, Landsat, SRTM), ESA Sentinel-2 and FAO GAEZ are **planned**, not integrated.

### Safe integration plan

1. Test this service against NASA POWER and validate units/coverage at known coordinates.
2. Add adapter/database persistence in Node TypeScript, with explicit source and missing-data handling.
3. Port existing farm/account/decision endpoints **with API contract tests** and migrations.
4. Switch the React API base URL only after parity and end-to-end checks pass. Retain Spring Boot as rollback until then.
