# Field Shift — Draft submission material (ENGLISH)

> **Draft only. Do not submit claims about real NASA data until the live test and source registry are completed.** The 2026 Project Submission and Judging & Awards Guides must be rechecked for exact fields and eligibility rules.

## One-line project summary

Field Shift helps farmers explore four crop-rotation scenarios—including their current rotation—by combining NASA-derived regional climate indicators, optional land-cover and soil datasets, and transparent farmer priorities, while showing data gaps and uncertainty.

## Problem

Changing heat and rainfall patterns, water scarcity and degraded soils make rotation choices difficult. A conventional crop suggestion tool does not show the long-term trade-offs across multiple seasons or why its advice could be wrong.

## Solution / How it works

The farmer enters a field location, its area and crop history, selects water availability, and adjusts water, soil, erosion, income and heat priorities. The tool builds a baseline and three exploratory alternatives and ranks them using a simple explainable MCDA model. Monte Carlo simulations show the sensitivity of the ranking to assumptions, not the probability of crop success. Risks and missing local data are visible alongside every strategy.

## NASA data used — MUST FILL FROM LIVE RUN

- NASA POWER Daily Point: parameters `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`; 2020–2024 historical window; climate risk, rainfall and approximate ETo; spatial resolution is regional, not parcel-scale. **Retrieval and exact version: [ENTER AFTER LIVE TEST].**
- NASA MODIS MOD13Q1 NDVI: optional, quality-filtered vegetation data; **[ONLY INCLUDE AS USED IF ACTUALLY DOWNLOADED AND PROVEN].**
- Other partner data: ISRIC SoilGrids v2.0; Open-Meteo ERA5-Land used only if independently validated. **[STATE EXACTLY WHICH SOURCES WERE USED].**

## Known limitations

The prototype does not predict yields or prices. NASA POWER is regional model/reanalysis climate, not measured conditions for the selected farm; SoilGrids is a model estimate and NDVI can mix nearby land pixels. Agronomic trait scores, sowing rules and the soil adjustment are uncalibrated assumptions. Recommendations require review of local soil tests, farm management and water rights. Synthetic demo mode does not qualify as evidence of NASA-data use.

## Tools

Node.js 22 with TypeScript, browser-native HTML/CSS/JavaScript, NASA POWER REST API, optional Python/Pandas scripts for MODIS NDVI and SoilGrids, built-in Node tests. The public interface works without a user account.

## AI disclosure

ChatGPT (OpenAI) was used to draft and refactor code, generate tests and documentation, and translate the user-supplied scientific modelling reference into runnable software. The team remains responsible for code correctness, data sourcing, scientific validation and originality. No AI-generated media are included in this prototype.

## Demo storyboard (30 seconds or 7 slides — verify 2026 guide)

1. 0–5 s: farmer dilemma — soil health, water and uncertain seasons.
2. 5–10 s: choose farm location and current rotation.
3. 10–16 s: source panel: actual NASA POWER data (ONLY AFTER LIVE CHECK), plus data gaps.
4. 16–23 s: compare four rotation cards with reasons and uncertainty ranges.
5. 23–27 s: move the water priority and show the changed ranking, with caveat.
6. 27–30 s: 'Explore alternatives. Decide locally.' plus project URL.

**Before final submission:** replace all placeholders with verified values; host demonstration publicly and test in a private window; check official 2026 guide for length, originality and AI-content rules; disclose any pre-event work.
