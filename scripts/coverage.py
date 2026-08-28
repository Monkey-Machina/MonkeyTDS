#!/usr/bin/env python3
"""Catalog coverage report: manufacturer count and filaments-per-manufacturer.

    python scripts/coverage.py            # plain text to stdout
    python scripts/coverage.py --out coverage.txt
    python scripts/coverage.py --md       # Markdown (for a workflow job summary)
"""
import argparse
import collections
import datetime as dt
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import compile_materials as cm  # noqa: E402


def tally(materials_dir):
    mats = cm.compile_dir(pathlib.Path(materials_dir))
    counts = collections.Counter(m["manufacturer"] or "(unknown)" for m in mats)
    rows = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0].lower()))
    return len(mats), rows


def render(total, rows, md=False):
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if md:
        out = [f"## MonkeyTDS catalog coverage",
               f"",
               f"_generated {now}_",
               f"",
               f"- **{len(rows)}** manufacturers",
               f"- **{total}** filaments cataloged",
               f"",
               f"| Manufacturer | Filaments |",
               f"| --- | --: |"]
        out += [f"| {name} | {n} |" for name, n in rows]
        return "\n".join(out) + "\n"
    width = max((len(n) for n, _ in rows), default=0)
    out = ["MonkeyTDS catalog coverage",
           f"generated {now}",
           "",
           f"Manufacturers:       {len(rows)}",
           f"Filaments cataloged: {total}",
           ""]
    out += [f"  {name.ljust(width)}  {n:>3}" for name, n in rows]
    return "\n".join(out) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--materials-dir", default="MTDS Materials")
    ap.add_argument("--out", help="write to this file instead of stdout")
    ap.add_argument("--md", action="store_true", help="render as Markdown")
    args = ap.parse_args(argv)

    total, rows = tally(args.materials_dir)
    text = render(total, rows, md=args.md)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")
        print(f"wrote {args.out}")
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
