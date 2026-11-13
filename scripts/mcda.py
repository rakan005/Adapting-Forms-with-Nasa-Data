#!/usr/bin/env python3
"""Explainable MCDA + Monte Carlo uncertainty for crop-rotation strategies.

Usage:
  python mcda.py --crops ../assets/crops.csv --strategies ../assets/strategies.example.json \
                 [--features features.json] [--weights water_saving=0.4,income=0.1,...] \
                 [--n 3000] [--seed 1] [--out results.json]

Method (see references/modeling.md):
  1. Crop criterion scores (1-5, expert assumptions in crops.csv) -> normalised to [0,1].
  2. Strategy score per criterion = mean over the rotation's seasons.
  3. Climate adjustment: weights of water_saving / heat_risk are scaled up with the
     region's aridity / heat_index (from features.json), then renormalised.
  4. Monte Carlo: perturb crop scores (sd 0.5 on 1-5 scale), weights (Dirichlet), and
     climate features (relative noise grows as data_quality falls).
  5. Report mean, P5-P95, P(top) and a confidence label per strategy.

Outputs are SENSITIVITY to assumptions, not probabilities of real-world success.
"""
import argparse, json
import numpy as np
import pandas as pd

CRITERIA = ["water_saving", "soil_building", "erosion_control", "income", "heat_risk"]


def crop_criteria(c):
    """Map crop traits (1-5) to criterion scores (1-5). Higher = better."""
    return {
        "water_saving": 0.6 * (6 - c["water_demand"]) + 0.4 * c["drought_tol"],
        "soil_building": 0.4 * c["organic_matter"] + 0.3 * (5 if c["n_fixing"] else 1) + 0.3 * c["root_depth"],
        "erosion_control": c["erosion_cover"],
        "income": 0.5 * c["market_flex"] + 0.5 * c["forage_value"],
        "heat_risk": 0.5 * c["drought_tol"] + 0.5 * c["frost_tol"],
    }


def norm(x):
    return (x - 1.0) / 4.0


def strategy_matrix(crops, strat, noise=None, rng=None):
    """Returns array [criterion] of mean normalised scores for the strategy."""
    rows = []
    for name in strat["seasons"]:
        r = crops.loc[name]
        if noise:
            r = r.copy()
            for k in ("water_demand", "drought_tol", "organic_matter", "root_depth", "erosion_cover",
                      "market_flex", "forage_value", "frost_tol"):
                r[k] = float(np.clip(r[k] + rng.normal(0, noise), 1, 5))
        cc = crop_criteria(r)
        rows.append([norm(cc[k]) for k in CRITERIA])
    m = np.mean(rows, axis=0)
    # bare-field share penalises erosion control further (explicit, explainable rule)
    bare = np.mean([1.0 if crops.loc[n, "group"] == "fallow" else 0.0 for n in strat["seasons"]])
    m[CRITERIA.index("erosion_control")] *= (1 - 0.5 * bare)
    return m


def effective_weights(w, aridity, heat_index):
    w = np.array([w[k] for k in CRITERIA], dtype=float)
    w[CRITERIA.index("water_saving")] *= (1 + aridity)
    w[CRITERIA.index("heat_risk")] *= (1 + heat_index)
    if not np.isfinite(w).all() or (w < 0).any() or w.sum() <= 0:
        raise ValueError("Weights must be finite, non-negative and not all zero")
    return w / w.sum()


def run(crops, strategies, base_w, feats, n=3000, seed=1, crop_noise=0.5, conc=30.0):
    rng = np.random.default_rng(seed)
    dq = float(feats.get("data_quality", 0.7))
    ar0, he0 = float(feats.get("aridity", 0.5)), float(feats.get("heat_index", 0.3))
    rel_noise = 0.10 + 0.25 * (1 - dq)  # 10%..35% depending on data quality
    base = np.array([base_w[k] for k in CRITERIA], dtype=float)
    if not np.isfinite(base).all() or (base < 0).any() or base.sum() <= 0:
        raise ValueError("Invalid priorities: weights must be finite, non-negative and not all zero")
    base = base / base.sum()

    det = {}
    w0 = effective_weights(dict(zip(CRITERIA, base)), ar0, he0)
    for s in strategies:
        m = strategy_matrix(crops, s)
        det[s["id"]] = {"score": float(m @ w0), "criteria": dict(zip(CRITERIA, np.round(m, 3).tolist()))}

    sims = {s["id"]: np.empty(n) for s in strategies}
    top = {s["id"]: 0 for s in strategies}
    ids = [s["id"] for s in strategies]
    for i in range(n):
        w = rng.dirichlet(base * conc + 1e-6)
        ar = float(np.clip(ar0 * (1 + rng.normal(0, rel_noise)), 0, 1))
        he = float(np.clip(he0 * (1 + rng.normal(0, rel_noise)), 0, 1))
        we = effective_weights(dict(zip(CRITERIA, w)), ar, he)
        vals = {s["id"]: float(strategy_matrix(crops, s, crop_noise, rng) @ we) for s in strategies}
        for k, v in vals.items():
            sims[k][i] = v
        top[max(vals, key=vals.get)] += 1

    out = []
    for s in strategies:
        a = sims[s["id"]]
        p5, p95 = np.percentile(a, [5, 95])
        width = float(p95 - p5)
        conf = "high" if (width < 0.10 and dq >= 0.7) else "medium" if width < 0.20 else "low"
        out.append({
            "id": s["id"], "name": s["name"], "seasons": s["seasons"], "why": s.get("why", ""),
            "score_deterministic": round(det[s["id"]]["score"], 4),
            "mean": round(float(a.mean()), 4), "p5": round(float(p5), 4), "p95": round(float(p95), 4),
            "p_top": round(top[s["id"]] / n, 3), "confidence": conf,
            "criteria": det[s["id"]]["criteria"],
        })
    out.sort(key=lambda r: r["mean"], reverse=True)
    return {"data_quality": dq, "effective_weights_at_features": dict(zip(CRITERIA, np.round(w0, 3).tolist())),
            "ranking_stability_top1": out[0]["p_top"], "strategies": out,
            "caveat": "Sensitivity to assumptions, not probability of success. Review locally."}


def parse_weights(txt, defaults):
    w = dict(defaults)
    if txt:
        for kv in txt.split(","):
            k, v = kv.split("="); w[k.strip()] = float(v)
    return w


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--crops", required=True)
    ap.add_argument("--strategies", required=True)
    ap.add_argument("--features")
    ap.add_argument("--weights")
    ap.add_argument("--n", type=int, default=3000)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="results.json")
    a = ap.parse_args()
    crops = pd.read_csv(a.crops).set_index("crop")
    sj = json.load(open(a.strategies))
    feats = json.load(open(a.features)) if a.features else {"aridity": 0.5, "heat_index": 0.3, "data_quality": 0.5}
    missing = {c for s in sj["strategies"] for c in s["seasons"]} - set(crops.index)
    if missing:
        raise SystemExit(f"unknown crops in strategies: {sorted(missing)}")
    res = run(crops, sj["strategies"], parse_weights(a.weights, sj["weights"]), feats, a.n, a.seed)
    json.dump(res, open(a.out, "w"), indent=2, ensure_ascii=False)
    for r in res["strategies"]:
        print(f"{r['id']:18s} mean={r['mean']:.3f} [{r['p5']:.3f},{r['p95']:.3f}] P(top)={r['p_top']:.2f} conf={r['confidence']}")
