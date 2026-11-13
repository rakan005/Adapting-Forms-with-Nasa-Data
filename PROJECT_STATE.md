# PROJECT_STATE — Field Shift

- Updated: 2026-11-13
- Challenge: NASA Space Apps Challenge 2026 — Field Shift
- Local event registration: unverified; check team dashboard
- Event dates: 14–15 November 2026 (per global site); local-event logistics may differ
- MVP target: Amman-area illustrative coordinate 31.9000, 35.9000 (NOT a surveyed field)
- Example rotation: wheat → fallow, replace with farmer's actual rotation
- Current production repository: `rakan005/Adapting-Forms-with-Nasa-Data` (Spring Boot + React)
- **New implementation in this folder:** standalone Node.js TypeScript server + HTML/JS public demo; no modification of the previous repository has been applied automatically
- Team size/roles: confirm current assignments with the team

## Decisions

1. Use a standalone runnable MVP instead of rewriting the existing accounts/subscriptions app under deadline pressure; the original remains intact.
2. Runtime NASA POWER live mode only if API returns valid data; hard 503 on unavailable data; synthetic mode is explicit and visibly labelled.
3. Historical window fixed to 2020–2024 full years to avoid partial-year bias; timestamps use LST at NASA POWER.
4. Three documented alternatives + farmer-entered baseline, five weighted criteria and Monte Carlo sensitivity.
5. MODIS and SoilGrids optional external sources; never silently substitute missing observations with guesses.
6. Missing soil or NDVI produces data gap, conservative confidence and a visible warning.
7. No NASA logos, no generated images, final submission in English; disclose AI assistance.

## Build/test status

- [x] Public UI and map point preview
- [x] Node.js TypeScript evaluation API
- [x] Input validation and 3+ rotation comparison
- [x] MCDA + seeded Monte Carlo range and P(top)
- [x] Monthly timeline from climate, conditional NDVI
- [x] Provenance and local-review warnings
- [x] Synthetic mode full round-trip tested locally
- [x] Automated unit/integration-style tests locally
- [ ] Real NASA POWER HTTPS request — blocked by build environment; run on deployed network
- [ ] Actual MODIS / SoilGrids fetch and data-quality verification
- [ ] ERA5/local weather cross-validation on real measurements
- [ ] Local agronomist sign-off
- [ ] Public hosted URL and project page demo
- [ ] Final 2026 submission, judging rules, eligible work disclosure

## AI usage disclosure

ChatGPT was used to author/refactor implementation code, tests, UI and technical documentation from user-provided source documents. Generated output is to be reviewed by the team. No generated imagery or voice was included.
