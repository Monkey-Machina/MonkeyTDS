# Catalog Expansion Plan

Goal: grow `MTDS Materials/` beyond Bambu Lab by pulling published material data
(TDS / MSDS / RoHS / spec sheets) from major FFF filament manufacturers and
turning it into MTDS-compliant `.MTDS` files.

## Rules for every contributor (human or agent)

1. **Do not add or change MTDS standards.** `MTDS.md` is read-only here. Non-standard
   subjects / methods / values / units are allowed in `.MTDS` files *only* when no
   standard counterpart exists (per `MTDS.md`). Every non-standard token used must be
   logged (see Reporting) so it can be proposed for standardization separately.
2. **File naming:** `<Manufacturer> <Product Name>.MTDS` (e.g. `Polymaker PolyLite PLA.MTDS`).
3. **Format:** exactly as `MTDS.md` defines — categories `# ...`, fields `> Subject`,
   three `<` slots per field in Method / Value / Units order, empty slot written as a
   bare `<`, ` | ` annotation delimiter. Use `MTDS Materials/Bambu Lab PLA Basic.MTDS`
   as the reference example.
4. **Sources:** one `> Source` field per source document, value = document type
   (`TDS`, `MSDS`, `SDS`, `RoHS`, `Hex Code`, …), annotation = the URL.
5. **Tooling stays out of the repo.** Put scrapers / scratch / downloaded source
   PDFs under `scratch/work/expansion/<source-slug>/` in the project folder
   (outside this repo clone). Reference implementations: `scratch/work/scrape.mjs`
   (page scrape via sitemap) and `scratch/work/gen.py` (pdfplumber + PyMuPDF table
   extraction, `pdftotext -layout` fallback) — `pypdf` text extraction is a cheaper
   fallback once you know a source's table layout well enough to regex it, but
   always spot-check it against the rendered PDF first.
6. **Branching:** each source (or fix) gets its own branch — `catalog-expansion/
   <source-slug>` for a new manufacturer, `fix/<issue#>-<slug>` for a correction —
   cut from `main`, with a PR back into `main`.

## Completeness process (breadth + depth)

Two gaps recur if you skip this: **missing filaments** (the manufacturer sells a
product this repo never got) and **missing fields** (a file exists but wasn't
built from every row its own source documents publish). Both trace to the same
failure mode — going straight from "skim the PDF" to "write the `.MTDS` file"
with no saved artifact recording what the *complete* source contained, so there
was never anything to diff completeness against. Full writeup and worked
examples: `scratch/work/PROCESS_DRAFT.md`; tracking issue **#44**.

- **Phase A — inventory.** Get the manufacturer's current, complete product list
  (sitemap.xml filtered to `/products/`, or a full category-page crawl if there's
  no sitemap) and diff it against `MTDS Materials/<Manufacturer> *.MTDS`. Save the
  dated list to `scratch/work/expansion/<slug>/products.txt`. A manufacturer WAF
  blocking the fetch tool is common (seen on Bambu Lab's store) — a direct HTTP
  request with a normal browser `User-Agent` usually isn't blocked the same way.
- **Phase B — field inventory.** Before writing or re-verifying a file, find and
  fetch *every* document type the product has (TDS, MSDS/SDS, RoHS, hex/color
  chart — not just the TDS) and transcribe every row of every table into a plain
  list first. Map each row to its MTDS subject (or a logged non-standard one);
  anything deliberately not carried gets a one-line reason in the expansion
  report, not silence. Build or update the `.MTDS` file *from that list*, then
  re-diff the file's fields against it — everything in the list should resolve to
  either a field in the file or a documented exclusion.
- Prefer capturing a genuinely-published non-standard property (logged, not
  silently dropped) over omitting it for file tidiness — the earlier 3D4Makers /
  Nanovia catalog work under-captured on this axis and is worth a revisit.

## Reporting new standard candidates

Each agent writes `work/expansion-reports/<source-slug>.md` listing anything that
looks like it should become an MTDS standard:

- new **subjects** (property not in `MTDS.md`) with the category it belongs in
- new **methods** (test standards: ASTM Dxxxx, ISO xxxx, internal)
- new **units**
- new recurring categorical **values**

with one real example row each. The maintainer aggregates these into a single
proposal table for review before any `MTDS.md` change.

## Source assignments

| Slug | Manufacturer / source | Entry point |
| --- | --- | --- |
| polymaker | Polymaker | polymaker.com (Technical Data Sheet per product) |
| prusament | Prusa Polymers (Prusament) | prusament.com material pages + TDS PDFs |
| fillamentum | Fillamentum | fillamentum.com (TDS per product) |
| formfutura | FormFutura | formfutura.com (TDS downloads) |
| colorfabb | colorFabb | colorfabb.com (TDS per product) |
| 3dxtech | 3DXTECH | 3dxtech.com (engineering-grade TDS PDFs) |
| esun | eSUN | esun3d.com (TDS PDFs) |
| protopasta | Proto-pasta | proto-pasta.com (TDS per product) |

Target per source: the flagship line first (PLA / PETG / ABS / ASA / TPU / nylon /
CF grades), then as many additional grades as have real published property data.
Quality over quantity — a file with only Specification + Sources is fine if that is
all the manufacturer publishes; skip products with no data at all.
