#!/usr/bin/env python3
"""Compile every .MTDS file in "MTDS Materials/" into one JSON file.

Run on release. Output feeds the frontend, so the shape is stable and flat.

Each field also gets machine-readable numbers:
  valueNumber      - a representative float pulled from the value string
                     ("35 ± 4" -> 35, "9 - 11" -> 10, "> 700" -> 700), or null
  valueRange       - [low, high] when the value is a range / ± / inequality, else null
  valueUncertainty - the ± half-width when present, else null
  canonicalUnit    - the unit this field's value was normalised to
  valueCanonical   - valueNumber converted into canonicalUnit (see scripts/units.py)

Canonical unit per subject comes from the declared SUBJECT_UNITS table (falling
back to the most common recognised unit). A field whose unit is dimensionally
wrong for its subject is an error: `--check` exits non-zero.
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
    text = text.lower().replace("+", " plus ")   # keep "PLA" and "PLA+" distinct
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


def value_spread(s):
    """Extract (low, high, plusminus) from a value string, or (None, None, None).
    "35 ± 4" -> (31, 39, 4);  "9 - 11" -> (9, 11, None);  "> 700" -> (700, None, None)."""
    if s is None:
        return (None, None, None)
    s = str(s).strip().replace(",", "")
    m = re.search(r"(" + _FLOAT + r")\s*±\s*(" + _FLOAT + r")", s)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        return (a - b, a + b, b)
    m = re.search(r"(" + _FLOAT + r")\s*[-–]\s*(" + _FLOAT + r")", s)
    if m and "±" not in s and "e" not in s.lower():
        return (float(m.group(1)), float(m.group(2)), None)
    m = re.match(r"\s*(<|>|≤|≥|<=|>=)\s*(" + _FLOAT + r")", s)
    if m:
        n = float(m.group(2))
        return (n, None, None) if m.group(1) in (">", "≥", ">=") else (None, n, None)
    return (None, None, None)


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
            subject = s[1:].strip().replace("’", "'").replace("‘", "'")
            field = {"category": category, "subject": subject, "_slots": []}
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
            "mtds": path.read_text(encoding="utf-8"),
            "fields": [f for f in fields if f["subject"] != "Source"],
        })
    return materials


# Declared units per subject. The first entry is the canonical target that
# valueCanonical is normalised to; later entries are *also* accepted because they
# are a different, non-interconvertible test convention (ASTM Izod J/m vs ISO
# Charpy kJ/m^2; Graves tear N vs ISO tear kN/m; Taber % vs volume-loss mm^3).
# A field whose unit is known to units.py but is neither an accepted unit here
# nor dimensionally compatible with the canonical is a hard error (see audit()).
# Subjects not listed fall back to "most common recognised unit", with the
# dimension check still enforced against that.
SUBJECT_UNITS = {
    "Density": ["g/cm^3"],
    "Melt Index": ["dg/min"],         # MFR — dg/min is numerically identical to the g/10 min convention
    "Melt Volume Rate": ["mm^3/s"],   # comparable with Maximum Volumetric Speed
    "Melting Temperature": ["°C"],
    "Glass Transition Temperature": ["°C"],
    "Crystallization Temperature": ["°C"],
    "Vicat Softening Temperature": ["°C"],
    "Heat Deflection Temperature": ["°C"],
    "Decomposition Temperature": ["°C"],
    "Coefficient of Thermal Expansion": ["ppm/°C"],
    "Thermal Conductivity": ["W/m·K"],
    "Moisture Absorption": ["%"],
    "Saturated Water Absorption Rate": ["%"],
    "Young's Modulus (In-Plane)": ["MPa"],
    "Young's Modulus (Interlayer)": ["MPa"],
    "Bending Modulus (In-Plane)": ["MPa"],
    "Bending Modulus (Interlayer)": ["MPa"],
    "Tensile Strength (In-Plane)": ["MPa"],
    "Tensile Strength (Interlayer)": ["MPa"],
    "Bending Strength (In-Plane)": ["MPa"],
    "Bending Strength (Interlayer)": ["MPa"],
    "Interlayer Adhesion": ["MPa"],
    "Breaking Elongation Rate (In-Plane)": ["%"],
    "Breaking Elongation Rate (Interlayer)": ["%"],
    "Elongation at Yield (In-Plane)": ["%"],
    "Elongation at Yield (Interlayer)": ["%"],
    "Maximum Elongation": ["%"],
    "Impact Strength (In-Plane)": ["kJ/m^2", "J/m"],
    "Impact Strength (Interlayer)": ["kJ/m^2", "J/m"],
    "Tear Strength": ["kN/m", "N"],
    "Tear Strength (In-Plane)": ["kN/m", "N"],
    "Tear Strength (Interlayer)": ["kN/m", "N"],
    "Abrasion Resistance": ["%", "mm^3", "g"],
    "Compression Set": ["%"],
    "Post-Treatment Shrinkage (In-Plane)": ["%"],
    "Post-Treatment Shrinkage (Interlayer)": ["%"],
    "Volume Resistivity": ["ohm-m", "ohm-cm"],
    "Surface Resistivity": ["ohm/sq", "ohm"],
    "Volume Resistance": ["ohm"],
    "Surface Resistance": ["ohm"],
    "Dielectric Strength": ["kV/mm"],
    "Magnetic Induction at Saturation": ["T"],
    "Diameter": ["mm"],
    "Diameter Tolerance": ["mm"],
    "Nozzle Temperature": ["°C"],
    "Bed Temperature": ["°C"],
    "Chamber Temperature": ["°C"],
    "Print Speed": ["mm/s"],
    "Retraction Length": ["mm"],
    "Retraction Speed": ["mm/s"],
    "Maximum Volumetric Speed": ["mm^3/s"],
    "Max Overhang Angle": ["°"],
    "Cooling Fan": ["%"],
}


def _accepted_units(subject, fallback_canon):
    """Units allowed for a subject: the explicit table if present, else just the
    fallback canonical (any dimensionally-compatible unit still passes the audit
    check and still normalises — see below)."""
    if subject in SUBJECT_UNITS:
        return SUBJECT_UNITS[subject]
    if subject.startswith("Stress at ") and subject.endswith("Strain (In-Plane)"):
        return ["MPa"]
    return [fallback_canon]


def normalize_units(materials):
    """Attach valueNumber / valueRange / canonicalUnit / valueCanonical to every
    field. Canonical unit per subject is the declared one (SUBJECT_UNITS) or the
    most common recognised unit. Each numeric field is converted to the first
    accepted unit it is dimensionally compatible with; an incompatible-but-known
    unit is left in place here and reported by audit()."""
    seen = collections.defaultdict(collections.Counter)
    for m in materials:
        for f in m["fields"]:
            n = rep_num(f["value"])
            f["valueNumber"] = n
            lo, hi, pm = value_spread(f["value"])
            f["valueRange"] = [lo, hi] if (lo is not None or hi is not None) else None
            f["valueUncertainty"] = pm
            if n is not None and f["units"]:
                seen[f["subject"]][units.canonical_name(f["units"])] += 1

    canon = {}
    for subj in set(seen) | set(SUBJECT_UNITS):
        if subj in SUBJECT_UNITS:
            canon[subj] = SUBJECT_UNITS[subj][0]
            continue
        best = next((u for u, _ in seen[subj].most_common() if units.known(u)), None)
        canon[subj] = best or (seen[subj].most_common(1)[0][0] if seen[subj] else None)

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
            cu = canon.get(f["subject"]) or u
            accepted = _accepted_units(f["subject"], cu)
            for target in accepted:
                c = units.convert(n, u, target)
                if c is not None:
                    f["valueCanonical"] = round(c, 6)
                    f["canonicalUnit"] = target
                    break
            else:
                # known unit that doesn't fit any accepted dimension, or unknown unit
                f["valueCanonical"] = n
                f["canonicalUnit"] = units.canonical_name(u)
    return canon, []


PROP_CATS = {"Physical Property", "Mechanical Property", "Chemical Property",
             "Electrical Property", "Magnetic Property"}

# categories whose numeric values are expected to carry a unit
QUANTITY_CATS = {"Physical Property", "Mechanical Property",
                 "Electrical Property", "Magnetic Property"}
# subject names that denote a measured physical quantity (so a bare number needs a unit)
QUANTITY_RE = re.compile(
    r"strength|modulus|elongation|density|temperature|conductivity|resistivity|"
    r"resistance|expansion|adhesion|induction|\bindex\b|deflection|shrinkage|"
    r"toughness|viscosity|\brate\b",
    re.I,
)
# subjects that legitimately carry no unit (scale encoded in the value, or a pure ratio)
UNITLESS_OK_RE = re.compile(r"shore hardness|coefficient|\bratio\b|anisotropy", re.I)
# non-numeric field values that are legitimate results, not data-entry noise
VALUE_OK_NON_NUMERIC = {
    "n/a", "na", "none", "no break", "pass", "fail", "stable", "insoluble",
    "not tested", "not measured", "-", "--", "tbd", "n.d.",
}


def audit(materials, canon):
    """Data-quality lint. Returns [(level, code, material_id, subject, detail)].
    level is 'error' (corruption -> fails --check), 'warn' or 'info' (advisory)."""
    findings = []

    # which subjects ever carry a unit / a number
    has_unit = collections.Counter()
    num_hits = collections.Counter()
    total = collections.Counter()
    fam = collections.defaultdict(list)
    for m in materials:
        for f in m["fields"]:
            s = f["subject"]
            total[s] += 1
            if f.get("valueNumber") is not None:
                num_hits[s] += 1
            if f.get("units"):
                has_unit[s] += 1
            if f.get("valueCanonical") is not None and f["category"] in PROP_CATS:
                fam[(s, m["material"] or "?")].append((m["id"], f["valueCanonical"]))

    for m in materials:
        mid = m["id"]

        if m["productName"] and m["manufacturer"] \
                and m["productName"].lower().startswith(m["manufacturer"].lower() + " "):
            findings.append(("info", "name-prefix", mid, "Product Name",
                             f"{m['productName']!r} repeats the manufacturer"))

        for f in m["fields"]:
            s, cat = f["subject"], f["category"]
            val = (f.get("value") or "").strip()
            unit = f.get("units")
            n = f.get("valueNumber")

            if cat in QUANTITY_CATS and n is not None and not unit \
                    and not UNITLESS_OK_RE.search(s) \
                    and (has_unit[s] >= 2 or QUANTITY_RE.search(s)):
                findings.append(("warn", "no-unit", mid, s, f"{val!r} has no unit"))

            if unit and not units.known(unit):
                findings.append(("warn", "unknown-unit", mid, s,
                                 f"{unit!r} is not in the standard"))
            elif unit:
                cu = canon.get(s) or unit
                accepted = _accepted_units(s, cu)
                if units.canonical_name(unit) not in accepted \
                        and not any(units.compatible(unit, a) for a in accepted):
                    findings.append(("error", "unexpected-unit", mid, s,
                                     f"{unit!r} is not a valid unit for this subject "
                                     f"(expected {' / '.join(accepted[:3])})"))

            if cat in PROP_CATS and val and n is None \
                    and val.lower() not in VALUE_OK_NON_NUMERIC \
                    and num_hits[s] >= max(3, 0.6 * total[s]):
                findings.append(("warn", "unparsed-value", mid, s,
                                 f"{val!r} does not read as a number"))

            mt = re.search(r"([\d.]+)\s*±\s*([\d.]+)", val)
            if mt:
                a, b = float(mt.group(1)), float(mt.group(2))
                if a > 0 and b >= a:
                    findings.append(("error", "tolerance>value", mid, s,
                                     f"{val!r}: ± spread exceeds the value"))

            meth = f.get("method") or ""
            low = s.lower()
            if meth:
                if ("bending" in low or "flexural" in low) and re.search(r"\b527\b|D ?638", meth):
                    findings.append(("info", "method-mismatch", mid, s,
                                     f"flexural subject with tensile method {meth!r}"))
                if "tensile" in low and re.search(r"\b178\b|D ?790", meth):
                    findings.append(("info", "method-mismatch", mid, s,
                                     f"tensile subject with flexural method {meth!r}"))
                if "strength" in low and re.search(r"\b306\b|D ?1525", meth):
                    findings.append(("info", "method-mismatch", mid, s,
                                     f"strength subject with softening-point method {meth!r}"))

    import statistics
    for (s, family), rows in sorted(fam.items()):
        if len(rows) < 6:
            continue
        vals = [v for _, v in rows]
        mu, sd = statistics.mean(vals), statistics.pstdev(vals)
        if sd <= 0:
            continue
        for rid, v in rows:
            if abs(v - mu) > 5 * sd:
                findings.append(("info", "family-outlier", rid, s,
                                 f"{v:g} vs {family} family mean {mu:.3g} (sd {sd:.3g})"))
    return findings


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--materials-dir", default="MTDS Materials")
    ap.add_argument("--out", default="materials.json")
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero on error-level findings (wrong-dimension units, impossible tolerances)")
    ap.add_argument("--audit", action="store_true",
                    help="print the full data-quality report and exit")
    args = ap.parse_args(argv)

    root = pathlib.Path(args.materials_dir)
    if not root.is_dir():
        sys.exit(f"materials directory not found: {root}")

    materials = compile_dir(root)
    if not materials:
        sys.exit(f"no .MTDS files found in {root}")

    canon, _ = normalize_units(materials)
    findings = audit(materials, canon)

    if args.audit or args.check:
        by_code = collections.defaultdict(list)
        for lvl, code, mid, subj, detail in findings:
            by_code[(lvl, code)].append(f"    {mid}  |  {subj}  —  {detail}")
        order = {"error": 0, "warn": 1, "info": 2}
        for (lvl, code), rows in sorted(by_code.items(), key=lambda kv: (order[kv[0][0]], kv[0][1])):
            print(f"[{lvl}] {code}  ({len(rows)})", file=sys.stderr)
            for r in sorted(rows):
                print(r, file=sys.stderr)
        n_err = sum(1 for f in findings if f[0] == "error")
        n_warn = sum(1 for f in findings if f[0] == "warn")
        print(f"audit: {n_err} error, {n_warn} warn, "
              f"{len(findings) - n_err - n_warn} info", file=sys.stderr)

    if args.audit:
        return

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
    print(f"wrote {args.out} ({len(materials)} materials)")

    if args.check:
        n_err = sum(1 for f in findings if f[0] == "error")
        if n_err:
            sys.exit(f"{n_err} data-corruption finding(s) — see report above")


if __name__ == "__main__":
    main()
