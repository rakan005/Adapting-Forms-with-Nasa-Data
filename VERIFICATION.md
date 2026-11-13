# Verification record — 2026-11-13

| Check | Result | Notes |
|---|---|---|
| Node.js TypeScript runtime starts | PASS | Node 22.16, native type-stripping; `/api/health` 200 |
| Frontend JS syntax | PASS | `node --check public/app.js` |
| TypeScript strict type check | PASS | `tsc --noEmit` using available `@types/node` in build environment |
| Unit and HTTP tests | PASS | 13 automated tests, using synthetic and mocked NASA-shaped data |
| `/api/config` | PASS | Crop catalog and example rotations |
| `/api/evaluate` synthetic mode | PASS | Explicitly labelled synthetic, four rotations including user baseline |
| Zero weights / invalid farm area rejected | PASS | 400 / validation, no NaN |
| NDVI quality filtering | PASS | Unknown and low-quality values discarded |
| Monte Carlo reproducibility | PASS | Fixed seed; percentile and P(top) checks |
| User-reported soil | PASS | SOC input correctly tagged as unverified user soil |
| Water availability constraints | PASS | Rainfed/limited mode affects high-water-demand strategies |
| Python features.py on synthetic CSV | PASS | Computes annual/seasonal features; network not used |
| Python mcda.py on reference crops | PASS | Outputs ranking and P5–P95 on expert-template data |
| Python code syntax | PASS | `python -m py_compile scripts/*.py` |
| Live NASA POWER HTTPS | **UNVERIFIED** | Build container cannot resolve external hosts; not a provider response test |
| Real MODIS NDVI download | **UNVERIFIED** | Need ORNL endpoint/band/product version verification from real response |
| Real SoilGrids download | **UNAVAILABLE / UNVERIFIED** | ISRIC reports REST service is temporarily paused |
| Live ERA5 cross-dataset validation | **UNVERIFIED** | Validation script supplied, no live cross-check executed |
| Agronomic validation / parcel boundaries | **NOT DONE** | Requires local agronomist and field metadata |
| Hosted public URL / competition submission | **NOT DONE** | No deployment or submission actions taken |

**Do not interpret synthetic/demo results as real NASA observations.** Test success confirms the program's internal behavior for synthetic/mocked inputs, not scientific accuracy or a completed competition submission.
