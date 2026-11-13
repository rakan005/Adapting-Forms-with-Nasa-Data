#!/usr/bin/env python3
"""Optional independent cross-check of POWER precipitation against Open-Meteo archive.

Usage:
  python scripts/validate_era5.py --power data/observations/power.csv --lat 31.9 --lon 35.9

The response can depend on Open-Meteo's chosen archive reanalysis backend. Treat
results as a *cross-dataset disagreement* indicator, not field-ground truth.
Requires internet, pandas and requests. No values are fabricated on API failure.
"""
import argparse
import json
import math
import requests
import pandas as pd


def validate(power_path, lat, lon):
    p = pd.read_csv(power_path, parse_dates=['date']).set_index('date')
    if 'PRECTOTCORR' not in p.columns:
        raise ValueError('POWER CSV must contain PRECTOTCORR')
    start, end = p.index.min(), p.index.max()
    q = {
        'latitude': lat, 'longitude': lon,
        'start_date': start.strftime('%Y-%m-%d'),
        'end_date': end.strftime('%Y-%m-%d'),
        'daily': 'precipitation_sum', 'timezone': 'GMT',
        'models': 'era5_land'
    }
    r = requests.get('https://archive-api.open-meteo.com/v1/archive', params=q, timeout=90)
    r.raise_for_status()
    daily = r.json()['daily']
    other = pd.Series(daily['precipitation_sum'], index=pd.to_datetime(daily['time']))
    pair = pd.concat([p['PRECTOTCORR'].rename('power'), other.rename('era5')], axis=1).dropna()
    pair = pair[(pair['power'] > -990)]
    if len(pair) < 30:
        raise ValueError('Insufficient shared observations to calculate bias/RMSE')
    diff = pair['power'] - pair['era5']
    return {'daysCompared': len(pair), 'biasMmPerDay': round(float(diff.mean()),3),
            'rmseMmPerDay': round(math.sqrt(float((diff*diff).mean())),3),
            'source': 'NASA POWER vs Open-Meteo ERA5-Land; not field ground truth',
            'warning': 'The datasets have different spatial grids and processing methods.'}


if __name__ == '__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--power',required=True);ap.add_argument('--lat',type=float,required=True);ap.add_argument('--lon',type=float,required=True)
    a=ap.parse_args()
    print(json.dumps(validate(a.power,a.lat,a.lon),indent=2))
