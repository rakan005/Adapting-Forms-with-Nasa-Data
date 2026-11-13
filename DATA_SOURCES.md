# Field Shift — Data Sources and Provenance

**As implemented 2026-11-13.** This registry describes integration paths, not a claim that data has been downloaded into the bundled deliverable. Source versions must be taken from actual response metadata when available.

| Dataset | Type | Used for | Access | Resolution / caveat | Status in bundled build |
|---|---|---|---|---|---|
| NASA POWER Daily Point | NASA gridded/reanalysis-derived climate | Daily temperature, corrected precipitation; ETo and climate features | `https://power.larc.nasa.gov/api/temporal/daily/point` | Regional grid, daily in LST; not an individual field measurement | Live API implemented; **NOT yet live-network-tested here** |
| NASA MODIS MOD13Q1 | NASA satellite NDVI | Vegetation seasonality, bare-field proxy | `https://modis.ornl.gov/rst/api/v1/` | 250 m / 16 days, cloud and mixed-pixel uncertainty | Optional Python ingestion; **no measurements bundled** |
| ISRIC SoilGrids v2.0 | Estimated soil model | SOC weight nudge and soil context | `https://rest.isric.org/soilgrids/v2.0/properties/query` | 250 m estimates with depth and unit conversion; not a lab sample | Optional Python ingestion or opt-in API; **no samples bundled** |
| Open-Meteo ERA5-Land archive | Independent reanalysis | Optional rainfall cross-check (bias and RMSE) | `https://archive-api.open-meteo.com/v1/archive` | Cross-model agreement, not ground truth | Optional validation script; not running in the live API |
| Crop traits / FAO-56 approximations | Expert assumptions | MCDA scoring (water, soil, erosion, income, heat) | `assets/crops.csv` | 1–5 unvalidated subjective values; Kc values approximate | Bundled; **not calibrated** |
| Example rotation strategies | Expert assumptions | Comparison with farmer baseline | `assets/strategies.example.json` | Illustrative crop order; locally check sowing seasons | Bundled; **not agronomic instructions** |
| OpenStreetMap | Community map tiles | Point preview only | `https://www.openstreetmap.org/export/embed.html` | Not parcel geometry; depends on external tile availability | UI optional map embed |

## Provenance flags

- `NASA_POWER` = modelled/regional NASA climate (do not imply a satellite directly measured field rain).
- `MODIS_NDVI` = satellite-observed spectral index; `bare_months` = derived/thresholded field proxy, not a validated bare-field measurement.
- `SOILGRIDS` = ISRIC model estimate; never turn a categorical salinity source into dS/m without a lab reading.
- `MODEL_INFERRED` = calculations (ETo, MCDA score, uncertainty intervals).
- `EXPERT_ASSUMED` = crop traits, crop rotation design, thresholds and relative priorities.
- `DEMO_SYNTHETIC` = deliberately fabricated data for interface tests, never evidence for NASA use.

## To complete before judging

1. Run live POWER with the chosen field coordinate and document request/response metadata; verify returned daily quantities and temporal coverage; archive a redacted sample in the project history if permitted.
2. Run the NDVI Python script and check the current ORNL API product/band names. Use `data/observations/ndvi.meta.json` and record the product version and date.
3. Get SoilGrids or, preferably, a local laboratory analysis; record source unit and conversion factor. `data/observations/soil.json` stores estimates and the retrieval timestamp.
4. Run `validate_era5.py` for the same time range or compare with a trusted local rain gauge. Report disagreement as an uncertainty source, not a validation pass.
5. Ask a local agronomist to review the example crop rotations and thresholds, and log accepted changes.
6. Re-run tests and run a real-data end-to-end screen recording; verify public link and 2026 submission rules.

## Current service caveat (verified on the official ISRIC site, 2026-11-13)

**ISRIC currently states the SoilGrids REST API is temporarily paused.** This is why live SoilGrids access is explicitly opt-in (`FS_SOIL_LIVE=1`) and is *not* a dependency for the app to start. You may place an independently retrieved and properly attributed `soil.json` in `data/observations/` or enter an actual laboratory SOC value (g/kg, 0–5cm) in the form. Farmer-reported lab values are tagged as user input, not verified laboratory measurements. For another access path, consult ISRIC's official WMS, WebDAV and alternative data-access guidance.
