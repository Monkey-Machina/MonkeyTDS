#!/usr/bin/env python3
"""Compile every .MTDS file in "MTDS Materials/" into one JSON file.

Run on release. Output feeds the frontend, so the shape is stable and flat.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import sys

SLOTS = ("method", "value", "units")


def slugify(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def split_annotation(part):
    """`text | note` -> (text, note). Note keeps any further ` | ` verbatim."""
    if part is None:
        return None
    bits = part.split(" | ")
    text = bits[0].strip()
    note = " | ".join(bits[1:]).strip() if len(bits) > 1 else None
    return {"text": text or None, "note": note}


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
            for f in fields
            if f["subject"] == "Source"
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


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--materials-dir", default="MTDS Materials")
    ap.add_argument("--out", default="materials.json")
    args = ap.parse_args(argv)

    root = pathlib.Path(args.materials_dir)
    if not root.is_dir():
        sys.exit(f"materials directory not found: {root}")

    materials = compile_dir(root)
    if not materials:
        sys.exit(f"no .MTDS files found in {root}")

    payload = {
        "schema": "mtds-compiled/1",
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "materialCount": len(materials),
        "materials": materials,
    }
    pathlib.Path(args.out).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {args.out} ({len(materials)} materials)")


if __name__ == "__main__":
    main()
