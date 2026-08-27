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
5. **Tooling stays out of the repo.** Put scrapers / scratch under
   `C:\Users\ethan\Projects\MonkeyTDS\work\expansion\<source-slug>\`. Reference
   implementations: `work/scrape.mjs` (page scrape via sitemap) and `work/gen.py`
   (pdfplumber + PyMuPDF table extraction, `pdftotext -layout` fallback).
6. **Branching:** each source gets its own branch `catalog-expansion/<source-slug>`
   cut from `origin/catalog-expansion`; push it and open a **draft** PR into
   `catalog-expansion`.

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
