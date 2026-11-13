/** Field Shift MCDA. All trait scores and thresholds here are expert heuristics, NOT NASA measurements. */
export const CRITERIA = ['water_saving', 'soil_building', 'erosion_control', 'income', 'heat_risk'];
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const avg = (x) => x.reduce((a, b) => a + b, 0) / x.length;
const round = (v, d = 3) => Number(v.toFixed(d));
const daysInYear = (y) => (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
function dayOfYear(date) { const d = new Date(date + 'T00:00:00Z'); return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1; }
/** Hargreaves–Samani reference ET approximation, with FAO-56 Ra calculation. Units: mm/day. */
export function hargreavesEto(tmax, tmin, tmean, doy, latDeg) {
    const lat = latDeg * Math.PI / 180;
    const dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
    const dec = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
    const ws = Math.acos(clamp(-Math.tan(lat) * Math.tan(dec), -1, 1));
    const ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.sin(ws));
    return Math.max(0, 0.0023 * (tmean + 17.8) * Math.sqrt(Math.max(tmax - tmin, 0)) * 0.408 * ra);
}
/** Compute only complete or nearly complete years; missing climate observations are never filled with zeros. */
export function deriveFeatures(days, lat, ndvi, scenario) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
        throw new Error('Invalid latitude');
    if (!Number.isFinite(scenario.rainPct) || scenario.rainPct < -50 || scenario.rainPct > 50 ||
        !Number.isFinite(scenario.tempDeltaC) || scenario.tempDeltaC < -5 || scenario.tempDeltaC > 5)
        throw new Error('Scenario is out of allowed range');
    const byYear = new Map();
    const unique = new Map(days.map(d => [d.date, d]));
    for (const d of [...unique.values()]) {
        const y = Number(d.date.slice(0, 4));
        if (!Number.isInteger(y))
            continue;
        let a = byYear.get(y) || [];
        a.push(d);
        byYear.set(y, a);
    }
    const years = [...byYear.keys()].sort().filter(y => {
        const d = byYear.get(y);
        return d.length >= daysInYear(y) * 0.95 && d.filter(x => x.PRECTOTCORR !== null && x.T2M !== null && x.T2M_MAX !== null && x.T2M_MIN !== null).length >= daysInYear(y) * 0.9;
    });
    if (!years.length)
        throw new Error('No year with >=90% complete daily precipitation and temperature');
    const annual = [];
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rainMm: 0, heatDays: 0, ndvi: null, bare: null }));
    let nValid = 0, nTotal = 0;
    for (const y of years) {
        let rain = 0, eto = 0, heat = 0, frost = 0, storm = 0, dry = 0, best = 0;
        const group = byYear.get(y).sort((a, b) => a.date.localeCompare(b.date));
        nTotal += daysInYear(y);
        for (const d of group) {
            if ([d.PRECTOTCORR, d.T2M, d.T2M_MAX, d.T2M_MIN].some(v => v === null)) {
                dry = 0;
                continue;
            }
            nValid++;
            const r = Math.max(0, d.PRECTOTCORR) * (1 + scenario.rainPct / 100);
            const hi = d.T2M_MAX + scenario.tempDeltaC, lo = d.T2M_MIN + scenario.tempDeltaC, mean = d.T2M + scenario.tempDeltaC;
            rain += r;
            eto += hargreavesEto(hi, lo, mean, dayOfYear(d.date), lat);
            if (hi > 35)
                heat++;
            if (lo <= 0)
                frost++;
            if (r > 20)
                storm++;
            dry = r < 1 ? dry + 1 : 0;
            best = Math.max(best, dry);
            const m = Number(d.date.slice(5, 7)) - 1;
            if (m >= 0 && m < 12) {
                monthly[m].rainMm += r;
                monthly[m].heatDays += (hi > 35 ? 1 : 0);
            }
        }
        annual.push({ rain, eto, heat, frost, storm, dry: best });
    }
    const rainVals = annual.map(x => x.rain), meanRain = avg(rainVals), meanEto = avg(annual.map(x => x.eto));
    let bareShare = null, validShare = null, peakMonth = null;
    let bareMonths = [];
    if (ndvi) {
        const good = ndvi.filter(d => d.reliability === 0 && d.ndvi !== null && d.ndvi >= -0.2 && d.ndvi <= 1 && years.includes(Number(d.date.slice(0, 4))));
        const inYears = ndvi.filter(d => years.includes(Number(d.date.slice(0, 4))));
        validShare = good.length / Math.max(inYears.length, 1);
        if (good.length) {
            bareShare = good.filter(d => d.ndvi < 0.2).length / good.length;
            let highest = -Infinity;
            for (let m = 1; m <= 12; m++) {
                const values = good.filter(d => Number(d.date.slice(5, 7)) === m).map(d => d.ndvi);
                if (values.length) {
                    const value = avg(values);
                    monthly[m - 1].ndvi = round(value);
                    monthly[m - 1].bare = value < 0.2;
                    if (value < 0.2)
                        bareMonths.push(m);
                    if (value > highest) {
                        highest = value;
                        peakMonth = m;
                    }
                }
            }
        }
    }
    for (const m of monthly) {
        m.rainMm = round(m.rainMm / annual.length, 1);
        m.heatDays = round(m.heatDays / annual.length, 1);
    }
    const deficit = avg(annual.map(a => Math.max(0, a.eto - a.rain)));
    const completeness = nValid / nTotal;
    return { years_used: years, rain_mm_mean: round(meanRain, 1), rain_cv: meanRain > 0 ? round(Math.sqrt(avg(rainVals.map(v => (v - meanRain) ** 2))) / meanRain) : null,
        eto_mm_mean: round(meanEto, 1), deficit_mm_mean: round(deficit, 1), heat_days_mean: round(avg(annual.map(a => a.heat)), 1),
        frost_days_mean: round(avg(annual.map(a => a.frost)), 1), storm_days_mean: round(avg(annual.map(a => a.storm)), 1),
        longest_dry_spell_days: Math.max(...annual.map(a => a.dry)), aridity: clamp(deficit / 1200), heat_index: clamp(avg(annual.map(a => a.heat)) / 60),
        power_completeness: round(completeness), bare_share: bareShare === null ? null : round(bareShare), bare_months: bareMonths,
        ndvi_valid_share: validShare === null ? null : round(validShare), ndvi_peak_month: peakMonth,
        data_quality: round(ndvi === null ? 0.6 * completeness : 0.6 * completeness + 0.4 * validShare), monthly };
}
export function validateWeights(input) {
    if (!input || typeof input !== 'object')
        throw new Error('Provide priority weights');
    const result = {};
    let sum = 0;
    for (const k of CRITERIA) {
        const v = input[k];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)
            throw new Error('Invalid priority ' + k);
        result[k] = v;
        sum += v;
    }
    if (sum <= 0)
        throw new Error('Select at least one non-zero priority');
    for (const k of CRITERIA)
        result[k] /= sum;
    return result;
}
function criteria(c) {
    return { water_saving: 0.6 * (6 - c.water_demand) + 0.4 * c.drought_tol,
        soil_building: 0.4 * c.organic_matter + 0.3 * (c.n_fixing ? 5 : 1) + 0.3 * c.root_depth,
        erosion_control: c.erosion_cover, income: 0.5 * (c.market_flex + c.forage_value), heat_risk: 0.5 * (c.drought_tol + c.frost_tol) };
}
const traitKeys = ['water_demand', 'drought_tol', 'organic_matter', 'root_depth', 'erosion_cover', 'market_flex', 'forage_value', 'frost_tol'];
function matrix(crops, strat, rand) {
    let values = Object.fromEntries(CRITERIA.map(k => [k, 0]));
    let fallow = 0, pest = 0;
    for (let i = 0; i < strat.seasons.length; i++) {
        const n = strat.seasons[i];
        const original = crops[n];
        if (!original)
            throw new Error('Unknown crop: ' + n);
        let c = original;
        if (rand) {
            c = { ...original };
            for (const k of traitKeys) {
                c[k] = clamp(original[k] + normal(rand) * 0.5, 1, 5);
            }
        }
        const cs = criteria(c);
        for (const k of CRITERIA)
            values[k] += clamp((cs[k] - 1) / 4);
        if (original.group === 'fallow')
            fallow++;
        if (i > 0 && crops[strat.seasons[i - 1]].group === 'cereal' && original.group === 'legume')
            pest++;
    }
    for (const k of CRITERIA)
        values[k] /= strat.seasons.length;
    values.erosion_control *= 1 - 0.5 * fallow / strat.seasons.length;
    return { values, bareRotationShare: fallow / strat.seasons.length, pestBreakTransitions: pest };
}
/** Soil organic carbon below 15 g/kg triggers an explicitly unvalidated soil-health priority nudge. */
export function effectiveWeights(w, f, soil) {
    const x = { ...w };
    x.water_saving *= 1 + f.aridity;
    x.heat_risk *= 1 + f.heat_index;
    const soc = soil?.properties?.soc?.['0-5cm'];
    if (typeof soc === 'number' && Number.isFinite(soc))
        x.soil_building *= soc < 15 ? 1.15 : 1.05;
    const sum = Object.values(x).reduce((a, b) => a + b, 0);
    for (const k of CRITERIA)
        x[k] /= sum;
    return x;
}
function dot(a, b) { return CRITERIA.reduce((acc, k) => acc + a[k] * b[k], 0); }
function rngSeed(seed) { let a = seed | 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function normal(rand) { return Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand()); }
function gamma(k, r) {
    if (k < 1)
        return gamma(k + 1, r) * Math.pow(Math.max(r(), 1e-12), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    while (true) {
        const z = normal(r), v = (1 + c * z) ** 3;
        if (v <= 0)
            continue;
        const u = r();
        if (u < 1 - 0.0331 * z ** 4 || Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v)))
            return d * v;
    }
}
function percentile(values, p) { const s = values.toSorted((a, b) => a - b); const pos = (s.length - 1) * p, lo = Math.floor(pos), t = pos - lo; return s[lo] * (1 - t) + s[Math.min(lo + 1, s.length - 1)] * t; }
export function evaluate(crops, strategies, weights, f, soil, opts = {}) {
    if (strategies.length < 3 || !strategies.some(s => s.isBaseline))
        throw new Error('Need at least three strategies including current baseline');
    for (const s of strategies)
        if (!s.seasons.length)
            throw new Error('Empty rotation');
    const n = opts.samples ?? 650;
    if (!Number.isSafeInteger(n) || n < 100 || n > 5000)
        throw new Error('Invalid simulation count');
    const waterPenalty = (s) => {
        const meanDemand = avg(s.seasons.map(id => crops[id]?.water_demand ?? 5));
        const factor = opts.waterSource === 'RAINFED' ? 0.06 : opts.waterSource === 'LIMITED' ? 0.03 : 0;
        return factor * Math.max(0, meanDemand - 3); // unvalidated feasibility penalty, not measured water use
    };
    const rand = rngSeed(opts.seed ?? 2026);
    const base = effectiveWeights(weights, f, soil);
    const det = strategies.map(s => ({ s, m: matrix(crops, s) }));
    const sims = new Map(strategies.map(s => [s.id, []]));
    const top = new Map(strategies.map(s => [s.id, 0]));
    for (let i = 0; i < n; i++) {
        const gam = CRITERIA.map(k => gamma(Math.max(weights[k] * 30, 0.001), rand));
        const total = gam.reduce((a, b) => a + b, 0);
        const w = Object.fromEntries(CRITERIA.map((k, j) => [k, gam[j] / total]));
        const noise = 0.10 + 0.25 * (1 - f.data_quality);
        const ff = { ...f, aridity: clamp(f.aridity * (1 + normal(rand) * noise)), heat_index: clamp(f.heat_index * (1 + normal(rand) * noise)) };
        const ww = effectiveWeights(w, ff, soil);
        let best = -Infinity, bestId = '';
        for (const s of strategies) {
            const value = clamp(dot(matrix(crops, s, rand).values, ww) - waterPenalty(s));
            sims.get(s.id).push(value);
            if (value > best) {
                best = value;
                bestId = s.id;
            }
        }
        top.set(bestId, top.get(bestId) + 1);
    }
    const results = det.map(({ s, m }) => {
        const samples = sims.get(s.id);
        const p5 = percentile(samples, 0.05), p95 = percentile(samples, 0.95), width = p95 - p5;
        const conf = f.ndvi_valid_share === null || !soil ? 'low' : width < 0.10 && f.data_quality >= 0.7 ? 'high' : width < 0.2 && f.data_quality >= 0.5 ? 'medium' : 'low';
        const crit = Object.fromEntries(CRITERIA.map(k => [k, round(m.values[k])]));
        return { id: s.id, name: s.name, seasons: s.seasons, why: s.why, isBaseline: !!s.isBaseline,
            score_deterministic: round(clamp(dot(m.values, base) - waterPenalty(s)), 4), mean: round(avg(samples), 4), p5: round(p5, 4), p95: round(p95, 4),
            p_top: round(top.get(s.id) / n, 3), confidence: conf, criteria: crit, bare_rotation_share: round(m.bareRotationShare),
            water_access_penalty: round(waterPenalty(s), 3), pest_break_transitions: m.pestBreakTransitions, evidence: [
                'NASA POWER precipitation and temperature inform water/heat priority adjustments (regional modelled climate).',
                ...(f.bare_share === null ? ['Field bare-ground coverage is unknown without quality-filtered NDVI.'] : [`NASA MODIS NDVI bare-share estimate: ${round(f.bare_share * 100, 1)}% of valid observations (proxy; not a field measurement).`]),
                ...(soil ? [soil.source.startsWith('User') ? 'Farmer-reported laboratory SOC (unverified) changes soil-building weight via an explicit heuristic.' : 'ISRIC SoilGrids modelled SOC changes soil-building weight by a declared heuristic.'] : ['Local soil profile unavailable; soil-building uses expert traits only.'])
            ],
            benefits: [s.why], informationGaps: [...(!soil ? ['SoilGrids or laboratory soil sample'] : []), ...(f.bare_share === null ? ['Quality-filtered NDVI time series'] : []), 'Actual crop yield and market prices', 'Local pest and equipment constraints'],
            localReviewRisks: ['Confirm sowing windows, irrigation rights, pests and local crop varieties with agronomist.', ...(s.seasons.includes('fallow') ? ['Bare/fallow periods can increase erosion.'] : []), ...(waterPenalty(s) > 0 ? ['Water availability might be insufficient for this rotation; the prototype applies an uncalibrated suitability penalty.'] : [])],
            sourceTags: ['NASA_POWER_MODELLED', 'MODEL_INFERRED', 'EXPERT_ASSUMED', ...(soil ? [soil.source.startsWith('User') ? 'USER_REPORTED_SOIL' : 'SOILGRIDS_MODELLED'] : []), ...(f.bare_share === null ? [] : ['MODIS_SATELLITE_OBSERVED'])] };
    }).sort((a, b) => b.mean - a.mean);
    return { strategies: results, data_quality: round(f.data_quality), ranking_stability_top1: results[0].p_top,
        effective_weights_at_features: Object.fromEntries(CRITERIA.map(k => [k, round(base[k])])),
        caveat: 'P(top) measures ranking sensitivity to assumptions, NOT probability of farming success. Review every strategy locally.' };
}
