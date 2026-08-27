#!/usr/bin/env python3
"""Compile every .MTDS file in "MTDS Materials/" into one JSON file.

Run on release. Output feeds the frontend, so the shape is stable and flat.

Each field also gets machine-readable numbers:
  valueNumber    - a representative float pulled from the value string
                   ("35 ± 4" -> 35, "9 - 11" -> 10, "> 700" -> 700), or null
  canonicalUnit  - the unit this subject is normalised to across the dataset
  valueCanonical - valueNumber converted into canonicalUnit (see scripts/units.py),
                   or valueNumber unchanged when no conversion is possible
"""
import argparse
import collections
import datetime as dt
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import units  # noqa: E402

SLOTS = ("method", "value", "units")


def slugify(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def split_annotation(part):
    if part is None:
        return None
    bits = part.split(" | ")
    text = bits[0].strip()
    note = " | ".join(bits[1:]).strip() if len(bits) > 1 else None
    return {"text": text or None, "note": note}


_FLOAT = r"-?\d*\.?\d+(?:e[+-]?\d+)?"


def rep_num(s):
    """One representative number out of a value string, mirroring the frontend.
    Handles "35 ± 4" -> 35, "9 - 11" -> 10, "> 700" -> 700,
    "1.6 x 10^7" / "(1.6 ± 0.3) x 10^7" -> 1.6e7, "10^12" -> 1e12."""
    if s is None:
        return None
    s = str(s).strip().replace(",", "")
    if s == "" or re.fullmatch(r"n\s*/?\s*a", s, re.I) or "no break" in s.lower():
        return None
    try:
        m = re.search(r"([\d.]+)\s*(?:±\s*[\d.]+\s*)?[x×·*]\s*10\s*\^?\s*([+-]?\d+)", s)
        if m:
            return float(m.group(1)) * 10.0 ** int(m.group(2))
        m = re.search(r"(?<![\d.])10\s*\^\s*([+-]?\d+)", s)
        if m:
            return 10.0 ** int(m.group(1))
        rng = re.search(r"(" + _FLOAT + r")\s*[-–]\s*(" + _FLOAT + r")", s, re.I)
        if rng and "±" not in s:
            return (float(rng.group(1)) + float(rng.group(2))) / 2
        m = re.search(_FLOAT, s, re.I)
        return float(m.group(0)) if m else None
    except ValueError:
        return None


def parse_mtds(path):
    category = None
    field = None
    fields = []

    def close():
        if field is None:
            return
        slots = field["_slots"]
        for i, name in enumerate(SLOTS):
            raw = slots[i] if i < len(slots) else None
            ann = split_annotation(raw) if raw not in (None, "") else None
            field[name] = ann["text"] if ann else None
            field[name + "Note"] = ann["note"] if ann else None
        del field["_slots"]
        fields.append(field)

    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("#"):
            close()
            field = None
            category = s.lstrip("#").strip()
        elif s.startswith(">"):
            close()
            field = {"category": category, "subject": s[1:].strip(), "_slots": []}
        elif s.startswith("<"):
            if field is not None:
                field["_slots"].append(s[1:].strip())
    close()
    return fields


def first_value(fields, subject):
    for f in fields:
        if f["category"] == "Specification" and f["subject"] == subject:
            return f["value"]
    return None


def compile_dir(root):
    materials = []
    for path in sorted(root.glob("*.MTDS")):
        fields = parse_mtds(path)
        sources = [
            {"type": f["value"], "url": f["valueNote"]}
            for f in fields if f["subject"] == "Source"
        ]
        materials.append({
            "id": slugify(path.stem),
            "file": path.name,
            "manufacturer": first_value(fields, "Manufacturer"),
            "productName": first_value(fields, "Product Name"),
            "material": first_value(fields, "Material"),
            "sources": sources,
            "fields": [f for f in fields if f["subject"] != "Source"],
        })
    return materials


def normalize_units(materials):
    """Pick a canonical unit per subject (the most common one that units.py
    understands) and convert every numeric field into it."""
    seen = collections.defaultdict(collections.Counter)
    for m in materials:
        for f in m["fields"]:
            n = rep_num(f["value"])
            f["valueNumber"] = n
            if n is not None and f["units"]:
                seen[f["subject"]][f["units"]] += 1

    canon = {}
    for subj, counter in seen.items():
        best = None
        for u, _ in counter.most_common():
            if units.known(u):
                best = u
                break
        canon[subj] = best or counter.most_common(1)[0][0]

    warnings = []
    for m in materials:
        for f in m["fields"]:
            f["valueCanonical"] = None
            f["canonicalUnit"] = None
            n = f["valueNumber"]
            if n is None:
                continue
            u = f["units"]
            if not u:
                f["valueCanonical"] = n
                continue
            cu = canon.get(f["subject"], u)
            f["canonicalUnit"] = cu
            if cu == u or not units.known(u):
                f["valueCanonical"] = n
                continue
            c = units.convert(n, u, cu)
            if c is None:
                f["valueCanonical"] = n
                f["canonicalUnit"] = u
                warnings.append(f"{m['id']} / {f['subject']}: {u!r} not convertible to canonical {cu!r}")
            else:
                f["valueCanonical"] = round(c, 6)
    return canon, warnings


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--materials-dir", default="MTDS Materials")
    ap.add_argument("--out", default="materials.json")
    ap.add_argument("--check", action="store_true", help="exit non-zero on any unit-conversion warning")
    args = ap.parse_args(argv)

    root = pathlib.Path(args.materials_dir)
    if not root.is_dir():
        sys.exit(f"materials directory not found: {root}")

    materials = compile_dir(root)
    if not materials:
        sys.exit(f"no .MTDS files found in {root}")

    canon, warnings = normalize_units(materials)
    for w in warnings:
        print("warning:", w, file=sys.stderr)

    payload = {
        "schema": "mtds-compiled/2",
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "materialCount": len(materials),
        "canonicalUnits": {k: canon[k] for k in sorted(canon)},
        "materials": materials,
    }
    pathlib.Path(args.out).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {args.out} ({len(materials)} materials, {len(warnings)} unit warnings)")

    if args.check and warnings:
        sys.exit(f"{len(warnings)} unit-conversion warning(s)")


if __name__ == "__main__":
    main()
