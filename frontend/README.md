# MonkeyTDS frontend (bare-bones MVP)

A static, dependency-free search UI over the MTDS material dataset. No build step,
no framework — `index.html` + `app.js` + `style.css`. Visual model: MatWeb / ASM
MatWeb (dense functional tables, thin rules, blue links), with small readability
tweaks (system font, sticky headers, a monospace numeric column, subtle zebra).

## Run

```
cd frontend
python -m http.server 8000
# open http://localhost:8000/
```

(Must be served over HTTP — it `fetch`es `data/materials.json`.)

## Views (all state in the URL — every view is a shareable link)

| Route | |
| --- | --- |
| `#/?<filters>` | faceted search + sortable results table |
| `#/m/<id>` | one material, full MTDS field table + sources |
| `#/compare?ids=a,b,c` | side-by-side matrix, best-in-row highlight, method-mismatch flag |

## Features

- **Text search** across manufacturer / product / material.
- **Facets**: Manufacturer, Material — with live counts.
- **Property range filters**: add any measured property, set min / max; an empty
  range just means "has a value for this property". Multiple ranges are AND-ed.
  Live result count.
- **Sortable columns** (click header; click again for desc; third click clears).
- **Compare tray**: tick rows anywhere, persists in `localStorage`, jump to the
  matrix from the masthead.
- **Compare matrix**: sticky property column, grouped by MTDS category, best value
  per row highlighted, identical values greyed, a row flagged when the materials
  cite different test methods.
- **Export**: CSV or JSON of the current result set / the current comparison.
- **Detail page**: every MTDS field with its method, value, units, annotation and
  source-document links; a core-data completeness bar; per-material JSON download.

## Data

`data/materials.json` is produced by `../scripts/compile_materials.py` from the
`.MTDS` files in `../MTDS Materials/`. It is committed here as a snapshot; re-run
the compile script to refresh it. `app.js` normalises a few data inconsistencies
at load time (curly vs straight apostrophes in subject names) and parses a
representative number out of value strings like `35 ± 4`, `9 - 11`, `> 700`,
`(1.6 ± 0.3) x 10^7` for filtering / sorting / comparison.

## Known gaps (tracked as repo issues)

- Some source catalogs still have thin or unit-less data (3DXTECH units, Fillamentum
  verification, eSUN / FormFutura / colorFabb redos).
- "Bending" vs "Flexural" subject naming is not yet reconciled (#13).
