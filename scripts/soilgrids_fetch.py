#!/usr/bin/env python3
"""Fetch modelled soil properties (ISRIC SoilGrids v2.0) for a point.

Usage:
  python soilgrids_fetch.py --lat 31.9 --lon 35.9 --out soil.json

IMPORTANT: SoilGrids values are MODELLED estimates (250 m), not measurements.
Label them as such in the UI and prefer farmer/lab data when available.
The service can be slow or rate-limited; cache the result.
Unit conversions (d_factor) are returned by the API; we divide mean by d_factor.
"""
import argparse, json, sys
from datetime import datetime, timezone
import requests

URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPS = ["clay", "sand", "silt", "soc", "phh2o"]
DEPTHS = ["0-5cm", "5-15cm", "15-30cm"]


def fetch(lat, lon):
    params = [("lat", lat), ("lon", lon), ("value", "mean")]
    params += [("property", p) for p in PROPS] + [("depth", d) for d in DEPTHS]
    r = requests.get(URL, params=params, timeout=120)
    r.raise_for_status()
    out = {}
    for layer in r.json()["properties"]["layers"]:
        name, factor = layer["name"], layer["unit_measure"].get("d_factor", 1) or 1
        out[name] = {d["label"]: (d["values"]["mean"] / factor if d["values"].get("mean") is not None else None)
                     for d in layer["depths"]}
    return {"retrievedAt": datetime.now(timezone.utc).isoformat(), "source": "ISRIC SoilGrids v2.0 (modelled)", "lat": lat, "lon": lon, "properties": out}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--out", default="soil.json")
    a = ap.parse_args()
    try:
        res = fetch(a.lat, a.lon)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    json.dump(res, open(a.out, "w"), indent=2)
    print(f"saved -> {a.out}")
