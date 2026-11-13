#!/usr/bin/env python3
"""Fetch MODIS MOD13Q1 NDVI for a point from the ORNL DAAC MODIS Global Subsets REST API.

Usage:
  python modis_ndvi_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out ndvi.csv

UNVERIFIED endpoint details: check https://modis.ornl.gov/data/modis_webservice.html
if a call fails (band names or date format may differ). The API limits each request
to a number of dates, so this script requests per-year chunks.

Output columns: date, ndvi (scaled 0.0001 applied), reliability (pixel_reliability; 0 = good).
Cloud/low-quality pixels are NOT silently dropped here; features.py filters them.
"""
import argparse, sys, json
from pathlib import Path
from datetime import datetime, timezone
import requests
import pandas as pd

BASE = "https://modis.ornl.gov/rst/api/v1"
PRODUCT = "MOD13Q1"


def _get(path, params):
    r = requests.get(f"{BASE}/{path}", params=params, headers={"Accept": "application/json"}, timeout=120)
    r.raise_for_status()
    return r.json()


def fetch_year(lat, lon, year):
    dates = _get(f"{PRODUCT}/dates", {"latitude": lat, "longitude": lon})["dates"]
    sel = [d for d in dates if d["calendar_date"].startswith(str(year))]
    if not sel:
        return pd.DataFrame(columns=["date", "ndvi", "reliability"])
    start, end = sel[0]["modis_date"], sel[-1]["modis_date"]
    out = {}
    for band in ("250m_16_days_NDVI", "250m_16_days_pixel_reliability"):
        js = _get(f"{PRODUCT}/subset", {"latitude": lat, "longitude": lon, "band": band,
                                        "startDate": start, "endDate": end,
                                        "kmAboveBelow": 0, "kmLeftRight": 0})
        out[band] = {s["calendar_date"]: s["data"][0] for s in js["subset"]}
    rows = []
    for d, v in out["250m_16_days_NDVI"].items():
        rel = out["250m_16_days_pixel_reliability"].get(d)
        rows.append({"date": d, "ndvi": v * 0.0001 if v > -3000 else None, "reliability": rel})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--out", default="ndvi.csv")
    a = ap.parse_args()
    y0, y1 = int(a.start[:4]), int(a.end[:4])
    try:
        df = pd.concat([fetch_year(a.lat, a.lon, y) for y in range(y0, y1 + 1)], ignore_index=True)
    except Exception as e:
        print(f"ERROR: {e}\nCheck endpoint/band names in the ORNL DAAC docs or run on a machine with network access.", file=sys.stderr)
        sys.exit(1)
    df.to_csv(a.out, index=False)
    # Store precise coordinates so the runtime never accidentally associates one field with another.
    metadata = {"lat": a.lat, "lon": a.lon, "retrievedAt": datetime.now(timezone.utc).isoformat(),
                "product": "MOD13Q1", "version": "verify-provider-metadata",
                "limitations": "250m mixed pixels; 16-day NDVI, reliability filter needed"}
    Path(a.out).with_name(Path(a.out).stem + ".meta.json").write_text(json.dumps(metadata, indent=2))
    print(f"saved {len(df)} rows -> {a.out}")
