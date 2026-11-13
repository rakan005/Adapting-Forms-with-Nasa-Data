#!/usr/bin/env python3
"""Fetch NASA POWER daily point data to CSV (no API key needed).

Usage:
  python power_fetch.py --lat 31.9 --lon 35.9 --start 2020-01-01 --end 2024-12-31 --out power.csv

Notes:
- Missing values (-999) are converted to NaN.
- Needs outbound HTTPS to power.larc.nasa.gov. If the network is blocked, run it
  on your own machine and copy the CSV into the project.
- Spatial resolution is coarse (~0.5 deg for meteorology): regional, not field-level.
"""
import argparse, sys, time
import requests
import pandas as pd

BASE = "https://power.larc.nasa.gov/api/temporal/daily/point"
DEFAULT_PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP,GWETROOT"


def fetch(lat, lon, start, end, params=DEFAULT_PARAMS, community="AG", retries=3):
    q = {
        "parameters": params, "community": community,
        "latitude": lat, "longitude": lon,
        "start": start.replace("-", ""), "end": end.replace("-", ""),
        "format": "JSON",
    }
    last = None
    for i in range(retries):
        try:
            r = requests.get(BASE, params=q, timeout=120)
            if r.status_code == 200:
                data = r.json()
                par = data["properties"]["parameter"]
                df = pd.DataFrame(par)
                df.index = pd.to_datetime(df.index, format="%Y%m%d")
                df.index.name = "date"
                return df.where(df > -990)  # -999 -> NaN
            last = f"HTTP {r.status_code}: {r.text[:200]}"
        except requests.RequestException as e:
            last = str(e)
        time.sleep(2 ** i)
    raise RuntimeError(f"POWER request failed: {last}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--params", default=DEFAULT_PARAMS)
    ap.add_argument("--out", default="power.csv")
    a = ap.parse_args()
    try:
        df = fetch(a.lat, a.lon, a.start, a.end, a.params)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    df.to_csv(a.out)
    print(f"saved {len(df)} rows -> {a.out}; NaN share: {df.isna().mean().round(3).to_dict()}")
