# Field Shift — Adapting Farms with NASA Data

**NASA Space Apps Challenge 2026 | runnable Node.js + TypeScript MVP**

A bilingual-friendly Arabic/English-technical decision-support prototype comparing **the farmer's current crop rotation (baseline)** with **three alternative rotations**. It uses NASA POWER historical climate **only when successfully fetched**, optional quality-filtered MODIS NDVI and optional SoilGrids estimates, transparent expert crop traits, user priorities, MCDA, and seeded Monte Carlo sensitivity analysis.

**Repository reset (Nov 13, 2026):** This runnable Node.js + TypeScript MVP is the main-branch project. The earlier Spring Boot + React implementation is retained in Git history and the `backup-before-field-shift-mvp-2026-11-13` branch. Former account, subscription, and chatbot features were intentionally not migrated into the competition MVP. This is an experimental decision-support prototype, not a production farmer-account platform.

## Quick start

Requirements: **Node.js 22.16+**. No `npm install` or external Node packages required.

```bash
npm start
# Visit http://localhost:3100
npm test
```

- **Live** (default): fetches real **NASA POWER** daily point values for 2020–2024 via NASA's HTTPS API, then caches only successful results in `data/cache/` (not committed). A blocked API returns **503 DATA_UNAVAILABLE**, with no fabricated replacement.
- **Synthetic Demo**: opt in using the data-mode selector. The output prominently says **synthetic, NOT NASA** and returns low confidence. Only use it to demonstrate app mechanics, never as a valid NASA-supported submission.
- Input coordinates: default demonstration location near Amman (31.9, 35.9), not a surveyed parcel. Other coordinates are accepted as **exploratory only**. Local crop suitability and season calendars have NOT been adapted globally.
- Inputs: coordinates, required farm area (dunums), water source, the existing rotation, optional **farmer-reported lab SOC (g/kg, top 0–5cm)**, five priority sliders, optional hypothetical rainfall/temperature stress test.
- Output: four ranked rotation cards, baseline, criterion breakdowns, explanations, evidence, benefits, gaps, local-check risks, sensitivity interval P5–P95, *P(top) = stability to assumptions, not likelihood of agricultural success*, historical monthly timeline, dataset sources/provenance, print-to-PDF report.
- Real-world data is **not included in this ZIP**. Running the server with network access fetches it; generate NDVI and SoilGrids locally as shown below.

## Additional datasets (optional but valuable for the official challenge)

The Python fetch scripts extracted from the user's `ALL_IN_ONE.md` reference are in `scripts/`; quality and missing-data handling were strengthened. They require outbound HTTPS and `pip install -r scripts/requirements.txt`.

```bash
mkdir -p data/observations
python scripts/power_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out data/observations/power.csv
python scripts/modis_ndvi_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out data/observations/ndvi.csv
python scripts/soilgrids_fetch.py --lat 31.9 --lon 35.9 --out data/observations/soil.json
python scripts/features.py --power data/observations/power.csv --ndvi data/observations/ndvi.csv --lat 31.9 --out data/observations/features.json
python scripts/validate_era5.py --power data/observations/power.csv --lat 31.9 --lon 35.9
```

Node reads optional `data/observations/ndvi.csv` **only when `ndvi.meta.json` confirms the exact evaluation point**. It loads `soil.json` only when its coordinates match. The Python features and MCDA scripts serve as reference/cross-check; the interactive API recomputes features and scores in TypeScript, using real POWER from its own API/cache. The precomputed `features.json` and `power.csv` are not silently used as live data. For optional live SoilGrids retrieval, start with `FS_SOIL_LIVE=1 npm start` (API can fail; missing soil stays missing). **Important:** ISRIC states its SoilGrids REST API is currently temporarily paused, so prefer a verified local lab input, or an independent ISRIC download route. Do not block submission on the REST endpoint.

**Power caching matters:** NASA POWER states repeated identical grid requests can be rate-limited. Use the cache, not many duplicate requests for the same location. The API's native resolution is not field-scale.

## API

| Route | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check, no external API call |
| `/api/config` | GET | Crop catalog, example rotations and weights |
| `/api/evaluate` | POST | Validate and evaluate the field; real NASA by default |

### JSON request example

```json
{
  "lat": 31.9, "lon": 35.9, "areaDunum": 12.5,
  "waterSource": "RAINFED",
  "currentRotation": ["wheat", "fallow"],
  "weights": {"water_saving":30,"soil_building":25,"erosion_control":20,"income":15,"heat_risk":10},
  "scenario": {"rainPct":0,"tempDeltaC":0},
  "mode": "live"
}
```

The `mode: "demo"` variant is for local technical tests only. Crop IDs and scores come from `assets/crops.csv`. `currentRotation` replaces the baseline; three other options are from `assets/strategies.example.json`. Crop/region/sowing validation still needs an agronomist. The server uses built-in HTTP with same-origin requests; do not expose it as a production account system.

## Scientific method

1. NASA POWER daily T2M/T2M_MAX/T2M_MIN/PRECTOTCORR, full historical years, missing -999 converted to null, no invalid-year interpolation.
2. Derive approximate reference ETo using Hargreaves–Samani, rain/ETo deficit, rainfall CV, hot days, frost days, long dry spells and monthly indicators. Heat (>35 °C), storm (>20 mm), dry (<1 mm), deficit normalization (1200 mm) are **initial uncalibrated model assumptions**, not official thresholds.
3. Optional MODIS MOD13Q1 NDVI 250 m / 16 days; only `pixel_reliability=0`, and initial bare proxy NDVI<0.2. Cloud or unknown reliability does **not** become valid.
4. Optional SoilGrids SOC 0–5 cm: **modelled** soil estimate, not a lab measurement. The MCDA soil-weight adjustment (<15 g/kg: ×1.15, otherwise ×1.05) is an explicitly **unvalidated heuristic**. Other soil properties are shown for review.
5. Five criteria: `water_saving`, `soil_building`, `erosion_control`, `income`, `heat_risk`. Crop traits 1–5 are **expert assumptions**; they are NOT NASA observations, measured yields, prices, or scientifically calibrated probabilities.
6. Monte Carlo perturbs expert crop trait scores, normalized farmer priorities via Dirichlet, and climate features according to completeness. Fixed seed 2026, 650 iterations for repeatable UI output. Display mean, 5th/95th percentile and chance to rank first **within those model perturbations only**. A low-data-quality run gets lower confidence.
7. A `fallow` season may reduce demand for irrigation but is penalized in erosion control; rainfed/limited water-source modes apply an explicitly unvalidated penalty for water-demanding rotations. The trade-off is explicit. Crop-family changes are indicative only.
8. All candidate strategies are exploratory; market prices, pest history, labor, local legal water rights, parcel-scale NDVI, and ground soil tests remain unresolved.

See [DATA_SOURCES.md](DATA_SOURCES.md) and [docs/architecture.md](docs/architecture.md) for provenance and diagrams.

## Validation and known limits

The automated tests (`npm test`) cover schema and missing sentinels, NDVI unknown quality, complete historical years, scenario stress test, invalid/zero weights, reproducibility, confidence, baseline updating, and input validation. The scripts' network fetchers **have not been exercised against the external NASA/ORNL/ISRIC services inside this isolated build environment**. Do not claim real data ingestion succeeds until it runs successfully on a networked machine. Validate the source's current dataset version and API response before judging.

The UI has no authentication: it intentionally provides public access without signing up, as the challenge demo requires. The embedded OpenStreetMap map is a center-point preview only, NOT farm boundary extraction. The report uses the browser's print-to-PDF, not server-side PDF generation.

## Deployment

```bash
docker build -t field-shift-mvp .
docker run --rm -p 3100:3100 -e PORT=3100 field-shift-mvp
```

A host with outbound access to `power.larc.nasa.gov` is necessary. Persistent storage for `data/cache/` is recommended for production demonstrations. The Docker image contains only the current TypeScript MVP, not the legacy Java app. Default user inputs are illustrative Jordan values; other geographies must be reviewed locally.

## AI and submission integrity

- **AI assistance used:** ChatGPT (OpenAI GPT-6) assisted in authoring TypeScript, frontend, tests, documentation and adapting the reference scripts; every result still requires human review and testing. Disclose AI in the NASA Space Apps 2026 submission form and repository. No AI-generated imagery or NASA identity assets are bundled.
- **Open data attributions:** NASA POWER, NASA MODIS (only if loaded), ISRIC SoilGrids (only if loaded), OpenStreetMap base map. NASA does not endorse this project.
- Keep the project page, demo subtitles or max 7 slides, dataset evidence, and all final submission fields **in English**. See `SUBMISSION_EN.md`.
- **Pre-existing work / originality:** The user's Spring Boot/React work predates the event, and this standalone implementation may be prepared in advance as well. Check NASA Space Apps 2026 rules on pre-existing work, eligible original work and disclosure before entering a competition; do not misrepresent when code was written.
- This build documents testable code but **does not prove an online deployment, approved local agronomy validation, or submitted competition entry**.

## Original project and deployment

The older Java + React version is preserved in the GitHub backup branch. See [INTEGRATION_AR.md](INTEGRATION_AR.md) for rollback information and [DEPLOY_AR.md](DEPLOY_AR.md) for Node hosting instructions. The original project references are preserved under `references/`; TypeScript diagrams are in `docs/architecture.md`. GitHub hosts **code**, but GitHub Pages alone cannot run a Node.js API; deploy the app to a Node-compatible host to enable live NASA data fetching.

The embedded public OpenStreetMap iframe requests map tiles centered on the entered coordinates from an external service. Field location may therefore be visible to the mapping provider; do not enter a private exact parcel location unless comfortable with that disclosure. For a private offline demo, remove the iframe or replace it with a local static basemap.
