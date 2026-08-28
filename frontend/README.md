# MonkeyTDS frontend (bare-bones MVP)

A static, dependency-free search UI over the MTDS material dataset. No build step,
no framework — `index.html` + `app.js` + `style.css`. Visual model: MatWeb / ASM
MatWeb (dense functional tables, thin rules, blue links), with small readability
tweaks (system font, sticky headers, a monospace numeric column, subtle zebra).

## Run

Just open `frontend/index.html` in a browser — the data is loaded as a plain
`<script>` (`data/materials.js`), so no server is required.

To serve it over HTTP instead (e.g. to mimic deployment):

```
cd frontend
python -m http.server 8000   # -> http://localhost:8000/
```

## Regenerate the data

```
cd frontend
python ../scripts/compile_materials.py --out data/materials.json
{ printf 'window.__MTDS_DATA__ = '; cat data/materials.json; printf ';\n'; } > data/materials.js
```

## Layout

The search view is split into two independently-scrolling panes: a fixed-width
filter column on the left and the results table on the right. The page itself
never scrolls — scroll the filter column and the results table separately. The
results header bar (count, "current results", CSV / JSON export) and the table's
column-header row both stay pinned while you scroll the results.

## Views (all state in the URL — every view is a shareable link)

| Route | |
| --- | --- |
| `#/?<filters>` | faceted search + sortable results table |
| `#/m/<id>` | one material, full MTDS field table + sources |
| `#/compare?ids=a,b,c` | side-by-side matrix, best-in-row highlight, method-mismatch flag |

## Features

- **Text search** across manufacturer / product / material.
- **Facets**: Manufacturer, Material — live counts; collapsed to the 5 largest,
  "show all N" expands the full list alphabetically (state remembered).
- **Property range filters**: add any measured property, set min / max; an empty
  range just means "has a value for this property". Multiple ranges are AND-ed.
  Live result count.
- **Result columns are configurable**: drag a header to reorder; `📍` pins a
  column to the left (pinned columns stack and stay visible while scrolling
  sideways); `×` removes; `+` adds one (any property, or a removed fixed column).
  Manufacturer / Product / Material / the checkbox are pinned by default. Column
  order + pins are saved in `localStorage`.
- **Sortable columns** (click header label; again for desc; third click clears).
- **Units** are shown in grey after each value (values across a column may carry
  different units, so there is no single column-level unit).
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
`.MTDS` files in `../MTDS Materials/`; `data/materials.js` is that same JSON wrapped
as `window.__MTDS_DATA__ = …;` so the page works from `file://`. Both are committed
snapshots — see "Regenerate the data" above. `app.js` normalises a few data inconsistencies
at load time (curly vs straight apostrophes in subject names) and parses a
representative number out of value strings like `35 ± 4`, `9 - 11`, `> 700`,
`(1.6 ± 0.3) x 10^7` for filtering / sorting / comparison.

## Known gaps (tracked as repo issues)

- Some source catalogs still have thin or unit-less data (3DXTECH units, Fillamentum
  verification, eSUN / FormFutura / colorFabb redos).
- "Bending" vs "Flexural" subject naming is not yet reconciled (#13).
