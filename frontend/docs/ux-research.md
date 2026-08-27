# UX/UX research — database search & material-selection sites

Research to inform the MonkeyTDS frontend. Covers (1) filament-specific databases,
(2) engineering material databases, (3) general data-exploration tooling, and the
search / compare / detail / discovery / contribution patterns worth stealing.

---

## 1. The comparable landscape

### Filament-specific databases

| Site | What it is | Notable ideas |
| --- | --- | --- |
| **FilamentDB** (`filamentdb.app`) | Quantitative DB built from manufacturer TDS values | Filter by *property* (tensile strength, heat resistance, flexibility); "rankings" pages (strongest / stiffest / highest-temp / best layer adhesion); curated **"X vs Y"** comparison pages; **value / cost-performance calculator**; application- and specialty-based entry points (CF-reinforced, translucent, silk, wood-filled…) |
| **Filament Cheat Sheet** (`filamentcheatsheet.com`) | 2,000+ filaments, 145+ brands, 45 material types | Manufacturer-**verified** badge; pulls print settings + published specs; 2-up side-by-side compare; **tier list**; brand-comparison pages; feeds from the *Open Filament Database* community data |
| **3D Filament Profiles** (`3dfilamentprofiles.com`) | Search/compare **plus** personal inventory | **Spool inventory tracking**, **QR codes** for swatches/spools, shareable "color cards", community data sharing — the DB is the hook, inventory is the retention |
| **Open Filament Database** (`openfilamentdatabase.org`, SimplyPrint) | Community-maintained, **GitHub/OAuth web editor** | **Static REST API** (all responses are pre-built JSON files, rebuilt daily); bulk **JSON / NDJSON / SQLite / CSV** downloads; in-page **schema validation** before submit; MIT-licensed data; "Changes" changelog; stewarded, not owned |
| **SpoolmanDB** (`Donkie/SpoolmanDB`) | Centralized filament + manufacturer facts for tools | Machine-first: designed to be *consumed* by slicers/trackers, not browsed |
| **Bambu Lab Filament Guide** | Vendor comparison table | Clean single-vendor matrix; good "at a glance" density |

### Engineering material databases

| Site | Notable ideas |
| --- | --- |
| **MatWeb** | **Property-range search**: specify min/max for *several* properties at once (melting point AND tensile AND CTE…); iterative narrowing; "add to folder" then **compare many grades in one table** or export; free tier + registered/premium tiers gate export & advanced manipulation; explicit **data-provenance** statement (datasheets, handbooks, staff-derived relationships) |
| **Matmatch** | Property-based selection tied to **supplier connection** (discovery → sourcing); facets for application / property / category / form + free text |
| **Ansys Granta / Total Materia / MakeItFrom** | Granta popularised the **Ashby chart** workflow; MakeItFrom is the free, readable, "explain the material" tone |
| **Ashby plots** (many interactive tools) | Log-log scatter of two properties; material *families* as shaded regions; user picks X/Y property + scale, drags **design-limit lines**, box-selects a region to get the candidate list. The canonical "compare whole classes, not grades" view |

### General data-exploration tooling

| Tool | Notable ideas |
| --- | --- |
| **Datasette** | Every filter/facet/sort state lives **in the URL** → shareable permalinks; CSV/JSON export on *every* view; facet counts inline; "if you can see it, you can export it" |
| Faceted-search literature (e-commerce) | OR within a facet, AND across facets; **counts next to every option**; range sliders (with numeric inputs) beat pre-baked buckets; collapse to full-screen modal on mobile; never let a filter combo reach zero results silently |

---

## 2. Search & filtering — patterns to adopt

- **Two search modes.** (a) Free-text ("I know the product") and (b) property-driven
  selection ("I know the requirement"). MatWeb and Matmatch both do this; it maps
  cleanly onto MTDS: text hits `Manufacturer` / `Product Name` / `Material`;
  property mode filters on `# Physical/Mechanical/Chemical Property` field values.
- **Faceted sidebar** with: Manufacturer, Material family (PLA/PETG/ABS/ASA/PC/PA/TPU/PPS…),
  Reinforcement (none / carbon fiber / glass fiber), Form/Diameter, and a
  **"has data for…"** facet (only show materials that publish a Young's modulus, an
  HDT, etc.) — sparse data is the norm, so let people filter to what's measured.
- **Range sliders with numeric inputs** for every continuous property
  (density, tensile strength, HDT, elongation, price/kg if we add it). Show the
  **result count** live. Support "≥ X" one-sided constraints.
- **Multi-property constraint search** (MatWeb's key trick): stack several ranges and
  narrow. This is the single most valued feature in engineering DBs.
- **Counts on every facet option**; **AND across groups, OR within a group**.
- **URL-encoded state** (Datasette) so a filtered view is a shareable link — cheap to
  build for a static site and great for forums/Reddit.
- **Never dead-end**: if a combination yields nothing, say which filter to loosen.
- **Mobile**: filters in a full-screen sheet; comparison switches to horizontal
  scroll or stacked cards below ~768px.

## 3. Comparison — patterns to adopt

- **Compare tray**: check items anywhere (list, detail, search) → persistent
  "Compare (3)" bar → comparison view. Cap at ~4–5 columns.
- **Sticky first column** (property names) + **sticky header** (product names) so
  you never lose your place scrolling a wide matrix.
- **Highlight differences / best-in-row**: dim identical values, bold the
  max (or min, per property) — turns a table into an answer.
- **Row grouping by MTDS category** (Specification / Physical / Mechanical / Chemical
  / Print Setting), collapsible.
- **Show method + conditions inline**: a value of "54 °C" is meaningless without
  "HDT, ISO 75, 1.8 MPa". MTDS already carries this in the method + ` | ` annotation —
  surface it as a tooltip or a secondary line, and let users **filter comparisons to
  a common method** so they're not comparing ISO 75 against ASTM D648.
- **"X vs Y" SEO pages** (FilamentDB, Filament Cheat Sheet): pre-render the popular
  pairings (PLA vs PETG, ASA vs ABS, PA6-CF vs PA6-GF). Big organic-traffic driver
  for a niche DB and nearly free on a static build.

## 4. Detail page — patterns to adopt

- **Provenance first.** Every value links to its `Source` document (TDS/MSDS/RoHS/…).
  MatWeb's credibility comes from stating where numbers come from; our `Source`
  fields already model this — make each property row cite which source it came from
  when a material has several.
- **Repeated subjects rendered honestly**: MTDS allows the same subject multiple
  times (e.g. Impact Strength notched *and* un-notched, or a property from two
  sources). Group them under the subject with their distinguishing annotation.
- **Units always explicit**, with an optional unit-system toggle (SI ⇄ imperial) —
  the data is SI; convert in the view.
- **"Data completeness" meter** per material (how many standard subjects are filled).
- **Downloadable**: per-material JSON + the raw `.MTDS` file + links to original PDFs.
- **Changelog / last-updated** per material (Open Filament DB's "Changes" section);
  since our data is git-backed, link the file history.

## 5. Discovery & visualization

- **Ashby-style scatter plot**: pick any two numeric properties for X/Y (log toggle),
  colour by material family, box-select to filter the list. This is *the* feature
  that makes an engineering DB feel powerful and that filament sites mostly lack.
- **Rankings / leaderboards**: strongest, stiffest, highest HDT, best elongation,
  lowest moisture absorption — each a shareable page.
- **Use-case entry points**: "high-heat", "impact-resistant", "flexible",
  "food-contact", "flame-retardant", "outdoor/UV" — map these to property thresholds
  and/or MTDS chemical fields.
- **Family overview pages** ("everything PLA"): distribution plots of key properties
  across all grades in the family, with each grade as a point.

## 6. Niche / unique features seen in the wild

- Personal **spool inventory + QR codes** (3D Filament Profiles) — turns a reference
  DB into a daily tool; strong retention, but scope creep for v1.
- **Static pre-built API** (Open Filament DB): no server, every query is a JSON file,
  rebuilt on a schedule — exactly the shape of our release-asset pipeline.
- **Community web editor with schema validation** gating GitHub PRs — lowers the
  contribution barrier without lowering data quality.
- **Cost-performance / "value" calculator** (FilamentDB): property-per-dollar.
- **Manufacturer-verified badges** and **community-validated** vs **TDS-only** vs
  **independently-tested** data tiers (Minimal 3DP, Filament Cheat Sheet) — a
  **confidence/source-type indicator** per value is very relevant to MTDS since
  we'll soon mix vendor TDS with third-party test data.
- **Tier lists** — opinionated, shareable, drives traffic; keep separate from the
  objective data.
- **Everything is exportable** (Datasette dogma) — CSV/JSON on every view.
- **Shareable stateful URLs** for any filtered/compared view.

---

## 7. Recommendations for the MonkeyTDS frontend

**Architecture** — static site + the compiled `materials.json` (already produced on
release). Optionally also ship SQLite/CSV like Open Filament DB. No backend needed
for search, compare, plots, or export.

**v1 (MVP)**
1. Searchable, faceted list (manufacturer, material family, reinforcement, "has data for X").
2. Property range-filter panel with live counts + URL state.
3. Material detail page: MTDS categories, every value with method + annotation +
   source link, completeness meter, raw `.MTDS` / JSON / PDF downloads.
4. Compare tray → sticky-axis matrix with difference highlighting and method-match warning.
5. CSV/JSON export of any current view.

**v2**
6. Ashby scatter plot (any X/Y numeric property, family colour, box-select-to-filter).
7. Pre-rendered "X vs Y" and rankings pages (SEO).
8. Per-value confidence/source-type indicator once third-party data lands.
9. Unit-system toggle; family overview pages.

**Later / optional**
10. Community submission flow (web editor → validated PR into `catalog-expansion`).
11. Spool inventory + QR (separate module).

**MTDS-specific care**
- Design every view around *repeated subjects* and *method/annotation* metadata —
  these are what set MTDS apart from flat filament sheets and what make comparisons trustworthy.
- Treat missing data as first-class (filter for it, show it, meter it) — most
  manufacturers publish only a handful of properties.

---

## Sources

- [MatWeb advanced/property search](https://www.matweb.com/search/advancedsearch.aspx), [property search technique](https://www.matweb.com/help/PropertySearch.aspx), [new features](https://www.matweb.com/NewFeatures.aspx)
- [Matmatch — MatWeb alternatives](https://matmatch.com/resources/blog/matweb-alternative/)
- [FilamentDB](https://filamentdb.app/)
- [Filament Cheat Sheet database](https://filamentcheatsheet.com/database/) and [comparison tool](https://filamentcheatsheet.com/compare/)
- [3D Filament Profiles](https://3dfilamentprofiles.com/) and [help](https://3dfilamentprofiles.com/help)
- [Open Filament Database](https://openfilamentdatabase.org/), [repo](https://github.com/OpenFilamentCollective/open-filament-database), [SimplyPrint page](https://simplyprint.io/open-filament-database)
- [SpoolmanDB](https://github.com/Donkie/SpoolmanDB)
- [Bambu Lab Filament Comparison Guide](https://bambulab.com/en-us/filament/guide)
- [What is an Ashby Plot? (Ansys/Synopsys)](https://ansys.synopsys.com/simulation-topics/what-is-an-ashby-plot), [interactive Ashby chart (EngineersUniverse)](https://engineersuniverse.com/webapps/ashby-materials-selection-chart)
- [Datasette](https://datasette.io/), [Datasette facets (Simon Willison)](https://simonwillison.net/2018/May/20/datasette-facets/), [docs](https://docs.datasette.io/)
- [Faceted search best practices (Fact-Finder)](https://www.fact-finder.com/blog/faceted-search/), [filter vs facet (UXtweak)](https://blog.uxtweak.com/filter-vs-facet/)
- [Sticky headers vs fixed columns (Ninja Tables)](https://ninjatables.com/sticky-headers-vs-fixed-columns/), [sticky header + first column (CSS-Tricks)](https://css-tricks.com/a-table-with-both-a-sticky-header-and-a-sticky-first-column/)
- [Advanced Search UX (UXPin)](https://www.uxpin.com/studio/blog/advanced-search-ux/)
