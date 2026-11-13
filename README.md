# Field Shift — Adapting Forms with NASA Data

**Explore what to plant next—not just which crop, but which rotation could make a field more resilient.**

Field Shift is an experimental, bilingual crop-rotation **decision-support prototype** for NASA Space Apps Challenge 2026. It compares the farmer's current rotation with three alternatives and explains the trade-offs in water, soil health, erosion, income flexibility, and heat risk. The scores show model comparisons and uncertainty—not guarantees or instructions to plant.

**[Open the interactive team preview](https://rakan005.github.io/Adapting-Forms-with-Nasa-Data/)** · [Data provenance](DATA_SOURCES.md) · [Architecture](docs/architecture.md) · [Contribution guide](CONTRIBUTING.md)

> **Important:** GitHub Pages offers **direct browser NASA POWER Live** (real historical regional climate, if NASA responds and CORS allows) **and a separate Synthetic Demo**. Live never silently falls back to invented data. NASA POWER 2020–2024 history is not real-time weather or field-scale ground observation. MODIS NDVI and SoilGrids remain unavailable in the static browser mode unless independently added and validated.

## Overview

Field Shift aims to make crop-rotation trade-offs understandable for farmers and local advisors. It combines farmer-entered field information, historical climate indicators, optional vegetation and soil datasets, and explicit expert-assumption crop traits. Results identify evidence, information gaps, and issues that need local agronomic review.

The current MVP is intentionally a **decision aid**, not a field-scale crop-yield predictor, a commercial recommendation service, or a replacement for a local agronomist.

## Features

- **Four rotation plans:** one editable farmer baseline plus three alternative sequences.
- **Farmer priorities:** interactive weights for water saving, soil building, erosion control, income/forage, and heat resilience.
- **Explainable scoring:** multi-criteria decision analysis (MCDA), criterion breakdowns, evidence, benefits, gaps, and risks.
- **Visible uncertainty:** seeded Monte Carlo sensitivity analysis with mean, P5–P95 range, and ranking stability; these are not probabilities of agricultural success.
- **Historical field context:** monthly rainfall and heat indicators, with NDVI/bare-field information only when suitable vegetation data are loaded.
- **What-if scenarios:** hypothetical rainfall and temperature adjustments, explicitly not forecasts.
- **Evidence labels:** distinguish modelled climate, satellite observations, locally entered measurements, and expert assumptions.
- **Arabic / English interface**, responsive layout, educational map preview, and browser print-to-PDF.
- **Two honest operating modes:** NASA POWER Live via browser (GitHub Pages) or the existing Node backend, and a separately labelled synthetic teaching mode.

## How It Works

1. **Describe the field:** enter coordinates, area in Jordanian dunums, water access, current crop rotation, and optionally a real laboratory soil organic carbon (SOC) value.
2. **Choose priorities:** adjust sliders for the five evaluation criteria. An exploratory climate stress test is optional.
3. **Load evidence:** GitHub Pages Live directly requests NASA POWER historical climate from the visitor's browser. The optional Node backend supports the same POWER source plus separately imported location-matched NDVI and SoilGrids. Synthetic Demo remains separate.
4. **Compare alternatives:** the shared evaluation model scores the baseline and three rotation candidates using documented crop-trait assumptions and derived climate features.
5. **Inspect uncertainty and limits:** read mean scores, P5–P95 bands, relative rank stability, explanations, source provenance, and what requires local review.

**Under the hood:** daily POWER values yield historical rainfall, temperature, approximate evapotranspiration/deficit, heat and frost indicators. A transparent MCDA model combines those features with farmer priorities and assumption-based crop characteristics. Monte Carlo reruns the model under specified input perturbations. These are **model-sensitivity intervals**, not a validated chance of yield or success.

## Data Sources

| Source | Role in the prototype | Availability and caveats |
| --- | --- | --- |
| [NASA POWER](https://power.larc.nasa.gov/) | Historical daily **T2M**, **T2M_MAX**, **T2M_MIN**, and **PRECTOTCORR** climate variables; used to derive regional climate features in Live mode. | Requested through the NASA POWER API for 2020–2024. Values are gridded/modelled regional estimates, **not direct field-scale satellite measurements**. They appear only after a successful fetch or valid saved cache. |
| [NASA MODIS NDVI via ORNL DAAC](https://modis.ornl.gov/) | Optional MOD13Q1 vegetation-index evidence for seasonal cover and exploratory bare-ground periods. | Requires a separate fetch/import; quality flags are filtered. MODIS's approximately 250 m footprint can mix small parcels with neighbors. **Not automatically loaded by the browser demo.** |
| [ISRIC SoilGrids](https://soilgrids.org/) | Optional modelled soil properties including SOC, where available; user-entered lab SOC can be provided separately. | **Not a NASA dataset.** SoilGrids REST access may be unavailable; soil estimates are not laboratory measurements. |
| Farmer inputs and crop catalog | Current rotation, water source, priorities, and expert-assumption crop traits. | Crop scores and local thresholds are illustrative, not validated measurements of yield, prices, or farm conditions. |
| [OpenStreetMap](https://www.openstreetmap.org/) | Optional field-center map context. | Not a parcel-boundary detector. Map tiles can expose entered coordinates to an external provider. |

All NASA source names describe **potential inputs**; the actual response must identify which datasets were successfully loaded. See [DATA_SOURCES.md](DATA_SOURCES.md) for endpoints, provenance, limitations, and processing, and [VERIFICATION.md](VERIFICATION.md) for testing status.

## Live vs Synthetic Demo

| | **Live (GitHub Pages browser or Node.js)** | **Synthetic Demo (GitHub Pages or Node.js)** |
| --- | --- | --- |
| Climate input | Genuine NASA POWER historical API response (or validated Node backend cache) | Generated illustrative climate data |
| NASA network access | **Required** on first uncached request; GitHub Pages additionally depends on provider CORS | **Not used** |
| MODIS / SoilGrids | Not fetched by browser-only Live; optional location-checked imports are supported by Node backend, and user lab SOC can be entered | Not loaded as scientific evidence |
| Intended use | Exploratory analysis **after** checking data provenance | UI demonstration, teaching, and interaction testing |
| If NASA API fails | Returns a clear error; **no silent substitution** | Runs independently, prominently marked **SYNTHETIC** |
| Scientific interpretation | Regional historical indicators with explicit limitations | **No scientific claims or real-world agricultural advice** |

**[Open GitHub Pages — direct NASA POWER Live or Synthetic Demo](https://rakan005.github.io/Adapting-Forms-with-Nasa-Data/)**

GitHub Pages does **not run a Node.js backend**, but its JavaScript can request the NASA POWER API directly when cross-origin (CORS) access is permitted. The new `public/browser-live.js` validates actual NASA responses before running the same MCDA and Monte Carlo engine. NASA/network/CORS errors are displayed and **never replaced with Synthetic Demo**. MODIS NDVI and SoilGrids are not automatically loaded in browser Live. See [DEPLOY_AR.md](DEPLOY_AR.md). Passing local tests does not prove a real browser request to NASA succeeded.

## Tech Stack

- **Backend:** Node.js **22.16+**, TypeScript, built-in HTTP server; no external Node runtime dependencies.
- **Frontend:** responsive HTML, CSS, and JavaScript modules; RTL and English support.
- **Decision engine:** shared MCDA and deterministic-seed Monte Carlo implementation (TypeScript, plus a browser-distributed JavaScript module).
- **Research/data utilities:** Python scripts for NASA POWER, MODIS NDVI, SoilGrids, feature extraction, comparison and validation.
- **Hosting:** GitHub Pages for browser-direct NASA POWER Live and Synthetic Demo; optional Docker/Node hosting for the full backend API.
- **CI:** GitHub Actions runs automated Node tests and JavaScript syntax checks.

The older Spring Boot/React prototype remains in Git history and the backup branch; it is **not** the current runtime. The repository is public and intentionally does not include farmer accounts, subscription services, or an authenticated application.

## Limitations

- NASA POWER is regional-scale and historical. Neither its temperature nor rainfall inputs are surveyed readings for a particular parcel.
- NDVI and SoilGrids are **optional**. Missing, cloudy, mismatched, or unavailable observations must not be filled in as if observed.
- Crop traits, sowing calendars, water penalties, bare-ground thresholds, and Soil SOC adjustments require independent local agronomic calibration.
- MCDA rankings and Monte Carlo P5–P95 values are sensitive to model assumptions; **P(top)** represents ranking stability inside simulated perturbations, not the probability a crop will succeed.
- Weather sliders represent **hypothetical stress tests**, not an authoritative climate forecast.
- The illustrative coordinates near Amman (31.9, 35.9) are **not** an exact surveyed field. Supporting an input coordinate does **not** mean global crop suitability has been validated.
- No ground-verified yield prediction, market forecast, insect/disease model, or farm-boundary extraction is provided. OpenStreetMap embeds may share coordinates with the map service.
- Live browser requests require NASA POWER network access and CORS permission. Direct access may fail on some browsers or networks. Actual external API availability must be independently checked; there is no synthetic fallback for Live.
- Browser printing produces a save-as-PDF view; there is no separate PDF generation service.

## How to Run

### Requirements

- **Node.js 22.16 or newer**
- A modern browser
- Internet access to NASA POWER for first-time **Live** retrieval (not required for the synthetic demo)
- Optional: Python 3 and the packages in `scripts/requirements.txt` for research scripts

### Run the full application locally

```bash
git clone https://github.com/rakan005/Adapting-Forms-with-Nasa-Data.git
cd Adapting-Forms-with-Nasa-Data
npm start
```

Open **http://localhost:3100**. No `npm install` is required for the current Node runtime. Choose **Live** for a real NASA POWER fetch or **Synthetic Demo** for illustrative values. The backend reads the host's `PORT` environment variable (default: 3100).

### Test

```bash
npm test
node --check public/app.js
```

The tests cover key model and input-validation behavior. A passing test run **does not establish** successful live NASA retrieval or field validation.

### API routes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API health check |
| GET | `/api/config` | Crop catalog, defaults, and evaluation options |
| POST | `/api/evaluate` | Evaluate a field and rank four rotations |

Example request body for `POST /api/evaluate`:

```json
{
  "lat": 31.9,
  "lon": 35.9,
  "areaDunum": 12.5,
  "waterSource": "RAINFED",
  "currentRotation": ["wheat", "fallow"],
  "weights": {
    "water_saving": 30,
    "soil_building": 25,
    "erosion_control": 20,
    "income": 15,
    "heat_risk": 10
  },
  "scenario": { "rainPct": 0, "tempDeltaC": 0 },
  "mode": "live"
}
```

Set `"mode": "demo"` only for the openly identified synthetic teaching scenario.

### Optional dataset preparation

The Python scripts are **optional** and require working third-party data services; their live network behavior must be verified independently.

```bash
python -m pip install -r scripts/requirements.txt
mkdir -p data/observations
python scripts/power_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out data/observations/power.csv
python scripts/modis_ndvi_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out data/observations/ndvi.csv
python scripts/soilgrids_fetch.py --lat 31.9 --lon 35.9 --out data/observations/soil.json
python scripts/features.py --power data/observations/power.csv --ndvi data/observations/ndvi.csv --lat 31.9 --out data/observations/features.json
```

The interactive TypeScript server **does not silently ingest** `power.csv` or `features.json` as live data. NDVI and soil files are used only when matching-location metadata is available; follow [DATA_SOURCES.md](DATA_SOURCES.md).

### Docker and deployment

```bash
docker build -t field-shift-mvp .
docker run --rm -p 3100:3100 -e PORT=3100 field-shift-mvp
```

GitHub Pages is published through [`.github/workflows/pages.yml`](.github/workflows/pages.yml). **Browser Live works without a Node host** if NASA POWER permits the browser request. An optional Node host remains useful for backend APIs, server cache and additional dataset imports. Live browser data are reused in memory for re-ranking within a session. See [DEPLOY_AR.md](DEPLOY_AR.md).

## Screenshots

The two screenshots below are **genuine captures of the running local Field Shift interface** from November 13, 2026—not generated mockups. They document the layout only; **no NASA results or actual field outcomes appear in these images**. Informational sections added subsequently may not be visible in these earlier UI captures.

### Desktop layout

![Field Shift desktop interface — captured UI, no NASA results](docs/screenshots/overview-desktop.webp)

### Mobile input layout

![Field Shift responsive mobile input form — captured UI, no NASA results](docs/screenshots/mobile-input.webp)

To update these images, capture the actual current interface in a browser. For any result screenshot, keep **Synthetic Demo** visibly labelled; include a Live data screenshot **only after** an actual successful NASA POWER fetch with verified source details. See [screenshot capture instructions](docs/screenshots/README.md). Never invent imagery, data values, or test outcomes.

## Contributing

Issues and narrowly scoped improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for testing, documentation, data-source labeling, and integrity requirements.

## AI use, attribution and originality

- AI assistance was used to help author and adapt frontend code, TypeScript, tests and documentation. Human reviewers must verify all outputs and disclose AI use in competition submissions.
- No NASA endorsement or NASA identity/logo assets are included. NASA POWER/MODIS and ISRIC/OpenStreetMap are credited as **independent data providers** when applicable.
- Some work and the original Spring Boot/React prototype predate the hackathon. Check the competition's specific originality, eligible-work, and AI disclosure rules; do not misrepresent dates or source ownership.
- External datasets, imagery, fonts, and material preserved in `references/` may carry separate attribution or license terms; the repository's MIT license **does not relicense third-party material**.

## License

Project-owned source code and original documentation are released under the **MIT License**; see [LICENSE](LICENSE). Third-party datasets, mapping tiles, fonts, and other externally supplied resources retain their own licenses and terms.

---

*Field Shift supports a farmer's decision; it does not replace a qualified local agronomist. All rotation strategies are possibilities for review, not prescriptions.*
