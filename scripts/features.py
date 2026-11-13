#!/usr/bin/env python3
"""Derive interpretable seasonal features from POWER daily data and (optionally) NDVI.

Usage:
  python features.py --power power.csv [--ndvi ndvi.csv] --out features.json
        [--heat-thr 35] [--storm-mm 20] [--bare-ndvi 0.2]

Output JSON (consumed by mcda.py):
  aridity (0..1)   : mean annual water deficit (rain - ETo) scaled; 1 = very dry
  heat_index (0..1): mean hot days per year / 60
  rain_cv, frost_days, storm_days, longest_dry_spell, bare_share (if NDVI), data_quality (0..1)

ETo uses Hargreaves-Samani (needs T2M, T2M_MAX, T2M_MIN, latitude) - a rough estimate.
All thresholds are starting points: calibrate locally.
"""
import argparse, json, math
import numpy as np
import pandas as pd


def hargreaves_eto(tmax, tmin, tmean, doy, lat_deg):
    """Daily reference ET (mm/day), Hargreaves-Samani with extraterrestrial radiation Ra (FAO-56 eq. 21)."""
    lat = math.radians(lat_deg)
    dr = 1 + 0.033 * np.cos(2 * math.pi * doy / 365)
    dec = 0.409 * np.sin(2 * math.pi * doy / 365 - 1.39)
    ws = np.arccos(np.clip(-np.tan(lat) * np.tan(dec), -1, 1))
    ra = (24 * 60 / math.pi) * 0.0820 * dr * (ws * np.sin(lat) * np.sin(dec) + np.cos(lat) * np.cos(dec) * np.sin(ws))
    ra_mm = 0.408 * ra
    return np.maximum(0.0023 * (tmean + 17.8) * np.sqrt(np.maximum(tmax - tmin, 0)) * ra_mm, 0)


def longest_run(mask):
    best = cur = 0
    for v in mask:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def power_features(df, lat, heat_thr=35.0, storm_mm=20.0):
    df = df.copy()
    df["year"] = df.index.year
    full_years = [y for y, g in df.groupby("year") if len(g) >= (366 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 365) * 0.95 and g[["PRECTOTCORR", "T2M_MAX", "T2M_MIN", "T2M"]].notna().all(axis=1).sum() >= (366 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 365) * 0.9]
    if not full_years:
        raise ValueError("no year with >90% valid precipitation")
    d = df[df["year"].isin(full_years)]
    rain_y = d.groupby("year")["PRECTOTCORR"].sum()
    eto = hargreaves_eto(d["T2M_MAX"].values, d["T2M_MIN"].values, d["T2M"].values, d.index.dayofyear.values, lat)
    d = d.assign(ETO=eto)
    eto_y = d.groupby("year")["ETO"].sum()
    deficit = (eto_y - rain_y).clip(lower=0)
    feats = {
        "years_used": [int(y) for y in full_years],
        "rain_mm_mean": float(rain_y.mean()),
        "rain_cv": float(rain_y.std(ddof=0) / rain_y.mean()) if rain_y.mean() > 0 else None,
        "eto_mm_mean": float(eto_y.mean()),
        "deficit_mm_mean": float(deficit.mean()),
        "heat_days_mean": float(d.groupby("year").apply(lambda g: (g["T2M_MAX"] > heat_thr).sum()).mean()),
        "frost_days_mean": float(d.groupby("year").apply(lambda g: (g["T2M_MIN"] <= 0).sum()).mean()),
        "storm_days_mean": float(d.groupby("year").apply(lambda g: (g["PRECTOTCORR"] > storm_mm).sum()).mean()),
        "longest_dry_spell_days": int(max(longest_run((g["PRECTOTCORR"] < 1).values) for _, g in d.groupby("year"))),
    }
    feats["aridity"] = float(np.clip(feats["deficit_mm_mean"] / 1200.0, 0, 1))  # 1200 mm: arbitrary scale
    feats["heat_index"] = float(np.clip(feats["heat_days_mean"] / 60.0, 0, 1))
    feats["power_completeness"] = float(d["PRECTOTCORR"].notna().mean())
    return feats


def ndvi_features(nd, bare_thr=0.2):
    nd = nd.copy()
    nd["date"] = pd.to_datetime(nd["date"])
    good = nd[(nd["reliability"].notna() & (nd["reliability"] == 0)) & nd["ndvi"].notna()] if "reliability" in nd else nd[nd["ndvi"].notna()]
    valid_share = len(good) / max(len(nd), 1)
    if good.empty:
        return {"ndvi_valid_share": 0.0, "bare_share": None}
    good = good.assign(bare=good["ndvi"] < bare_thr, month=good["date"].dt.month)
    by_month = good.groupby("month")["ndvi"].mean()
    return {
        "ndvi_valid_share": float(valid_share),
        "bare_share": float(good["bare"].mean()),
        "bare_months": [int(m) for m, v in by_month.items() if v < bare_thr],
        "ndvi_peak_month": int(by_month.idxmax()),
        "ndvi_peak": float(by_month.max()),
    }


def build(power_csv, lat, ndvi_csv=None, **kw):
    p = pd.read_csv(power_csv, parse_dates=["date"], index_col="date")
    feats = power_features(p, lat, kw.get("heat_thr", 35.0), kw.get("storm_mm", 20.0))
    dq = feats["power_completeness"]
    if ndvi_csv:
        nf = ndvi_features(pd.read_csv(ndvi_csv), kw.get("bare_ndvi", 0.2))
        feats.update(nf)
        dq = 0.6 * dq + 0.4 * nf["ndvi_valid_share"]
    feats["data_quality"] = float(round(dq, 3))
    return feats


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--power", required=True)
    ap.add_argument("--lat", type=float, required=True, help="latitude of the field (for ETo)")
    ap.add_argument("--ndvi")
    ap.add_argument("--out", default="features.json")
    ap.add_argument("--heat-thr", type=float, default=35.0)
    ap.add_argument("--storm-mm", type=float, default=20.0)
    ap.add_argument("--bare-ndvi", type=float, default=0.2)
    a = ap.parse_args()
    f = build(a.power, a.lat, a.ndvi, heat_thr=a.heat_thr, storm_mm=a.storm_mm, bare_ndvi=a.bare_ndvi)
    json.dump(f, open(a.out, "w"), indent=2, ensure_ascii=False)
    print(json.dumps(f, indent=2, ensure_ascii=False))
