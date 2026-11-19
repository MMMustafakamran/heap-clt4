#!/usr/bin/env python3
"""CI probe mode: merge shard-*/<page>/run<N>/ into <out>/ and print probe-summary.md (also saved there).
Per page, one row per run: loaded, reply seen, errors. Usage: probe-summary.py <shards-dir> <out-dir> <date>"""
import json, shutil, sys
from pathlib import Path

src, out, date = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
out.mkdir(parents=True, exist_ok=True)
for sh in sorted(src.glob("shard-*")) if src.is_dir() else []:
    shutil.copytree(sh, out, dirs_exist_ok=True)

lines = [f"# Probe summary {date}", "", "| Page | Run | Loaded | Reply seen | Errors |", "|---|---|---|---|---|"]
pages = sorted(p for p in out.iterdir() if p.is_dir())
for page in pages:
    runs = sorted(page.glob("run*/result.json"))
    if not runs:
        lines.append(f"| {page.name} | - | n | n | no result.json |")
        continue
    for rj in runs:
        try:
            r = json.loads(rj.read_text(encoding="utf-8"))
        except Exception as e:
            lines.append(f"| {page.name} | {rj.parent.name} | ? | ? | unreadable result.json ({type(e).__name__}) |")
            continue
        texts = r.get("screenTexts") or []
        loaded = "y" if r.get("appAlive") and texts and not r.get("redbox") else "n"
        before = set(r.get("textsBeforeSend") or [])
        prompted = any(str(s.get("s", "")).startswith("typed:") for s in r.get("steps", []))
        new = [t for t in texts if t not in before]
        if r.get("sent") is False:
            reply = "not sent"
        else:
            reply = ("y" if new else "n") if prompted else "no prompt"
        fu = r.get("followUps") or []
        if fu:
            reply += " / steps " + ",".join("ok" if f.get("ok") else "FAIL" for f in fu)
        errs = list(r.get("errors") or [])
        if r.get("redbox"):
            errs.append("RED BOX")
        credit = [t for t in texts if "credit balance" in t.lower()]
        if credit:
            errs.append("on screen: " + credit[0][:120])
        le = r.get("logErrors") or []
        if le:
            errs.append(f"{len(le)} log errors, first: {le[0][-140:]}")
        cell = "; ".join(errs).replace("|", "/").replace("\n", " ") or "-"
        lines.append(f"| {page.name} | {rj.parent.name} | {loaded} | {reply} | {cell} |")
if not pages:
    lines.append("| (no probe results: the shards uploaded nothing) | | | | |")
md = "\n".join(lines) + "\n"
(out / "probe-summary.md").write_text(md, encoding="utf-8")
print(md)
