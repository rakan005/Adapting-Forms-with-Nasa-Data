# Contributing to Field Shift

Thank you for helping improve the crop-rotation decision-support prototype.

## Before contributing

1. Open an issue describing the bug, feature, or research update, including why it matters for the farmer.
2. Keep changes small and preserve existing **Live vs Synthetic Demo** behavior.
3. Use a descriptive branch and a pull request for review whenever possible.
4. Run `npm test` and `node --check public/app.js`; explain any checks you could not perform.
5. For UI changes, inspect Arabic RTL, English, mobile layout, keyboard focus, and the GitHub Pages synthetic path.

## Scientific and data integrity

- **Never present synthetic or cached illustrative data as actual NASA observations.**
- Label each input according to its provenance: modelled NASA POWER climate, optional satellite NDVI, modelled soil estimate, farmer-supplied measurement, or expert assumption.
- When adding a data source, document its product name, endpoint, date, version, resolution, quality filtering, units, missing-data treatment, and known limitations in `DATA_SOURCES.md`.
- Confirm field-scale statements with appropriate ground evidence. Do not claim validated yields, scientific probabilities, or local agronomic suitability based solely on a model score.
- Treat soil lab entries as user-provided unless independently verified; keep farm data private and never commit personal or sensitive coordinates.
- When using AI tools, disclose their contributions and manually review every change. Do not include NASA trademarks or logos in generated visuals.

## Files and screenshots

- Do not add fake screenshots, invented test outputs, or dummy NASA results presented as real.
- Add authentic UI screenshots only to `docs/screenshots/`, and label demo versus live clearly.
- Avoid committing cache files, API secrets, private field information, or large raw datasets.
- Keep third-party source attribution and original licenses intact.

## Code review checklist

- [ ] Core MCDA and Monte Carlo behavior preserved or intentionally tested
- [ ] Source-mode labels remain clear
- [ ] Input validation, missing-data behavior, and error states checked
- [ ] Documentation and changelog notes describe limitations and manual steps
- [ ] Arabic/English and mobile presentation verified if affected

All contributions are subject to the repository's [MIT License](LICENSE) for project-owned work, while third-party material retains separate terms.
