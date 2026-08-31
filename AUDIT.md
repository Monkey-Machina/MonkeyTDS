# Dataset accuracy audit

Tracking issue: [#31](https://github.com/Monkey-Machina/MonkeyTDS/issues/31).
Run the lint with `python scripts/compile_materials.py --audit`.

## Lint

`compile_materials.py` now runs a data-quality pass. `--audit` prints the full
report; `--check` exits non-zero on **error**-level findings only (data
corruption), so it is safe to gate CI on. See `.github/workflows/audit.yml`.

| level | codes | gates `--check` |
| --- | --- | --- |
| error | `unexpected-unit` (unit dimensionally wrong for its subject), `tolerance>value` | yes |
| warn | `no-unit`, `unit-in-value`, `unknown-unit`, `unparsed-value` | no |
| info | `name-prefix`, `method-mismatch`, `family-outlier` | no |

`unit-in-value`: the value string carries a unit token (`240 - 280 °C`) while the
units slot is empty — it belongs in the units slot.

Current: **0 error, 0 warn, 8 info** — the remaining info-level findings are
`family-outlier` (6, all explained below) and `name-prefix` (2). The 87 `no-unit`
warnings on 3DXTECH mechanical rows were cleared in #19.

### Unit handling

`scripts/units.py` is a compositional dimensional-analysis engine — it parses
`mm^3/s`, `W/m·K`, `dg/min`, `MΩ·cm` from SI base units + prefixes + named units,
rather than a fixed list. Full reference: [UNITS.md](UNITS.md).

Canonical unit per subject is **declared** in `SUBJECT_UNITS`
(`scripts/compile_materials.py`), chosen for a comparable dataset (melt mass-flow
→ `dg/min`, melt volume-flow → `mm^3/s`), not to match TDS spelling. A subject
can list more than one accepted unit for genuinely non-interconvertible test
conventions — impact as `kJ/m^2` (ISO Charpy) *or* `J/m` (ASTM Izod); tear as
`kN/m` *or* `N`; abrasion loss as `%` / `mm^3` / `g`. A unit that is neither a
declared alternate nor dimensionally compatible with the canonical is an
`unexpected-unit` **error**. `python scripts/units.py` self-tests and runs in CI.

Data migrated for this: `g/10 min` → `dg/min` (identical value, 174 files),
`cm^3/10 min` → `mm^3/min` (value ×100, 21 Prusament files) — neither embedded-
number spelling is a valid unit any more (`g/10 min` stays as a parse alias).

## Fixed in this pass

| manufacturer | fix | files |
| --- | --- | --- |
| 3DXTECH | added missing units to Density (`g/cm^3`) and glass-transition / heat-deflection / Vicat / melting temperatures (`°C`) | ~33 |
| 3DXTECH | `Not Applicable` → `N/A` | 5 |
| Polymaker | `ABS Max/ABS Pro/PC-ABS/PC-PBT/PETG` Product Name: dropped the redundant `Polymaker ` prefix (44/49 files already omit it) | 5 |
| Polymaker | HT-PLA & PolyLite ABS: X-Y tensile-strength tolerance is a verified misprint in the source TDS (`± 160.44`, `± 92.7` copied from the modulus row) — kept the mean, annotated the tolerance | 2 |
| Polymaker | PolyLite ABS/PLA Pro/PC/LW-PLA/CosPLA A+B, PolyMax PC/PC-FR, Fiberon ASA-CF08/PET-GF15: flexural rows carried the tensile method (`ISO 527` / `ISO 306`) — set to `ISO 178` with a note that the TDS table misprints it | 10 |
| Bambu Lab | PLA Aero Density `1.21 g/cm³(filament)` → value `1.21`, unit `g/cm^3` | 1 |
| Bambu Lab | PLA Sparkle Flexural Modulus (Interlayer) missing `MPa` | 1 |
| standard | renamed `Bending Modulus/Strength` → `Flexural …` (#13, ISO 178 / ASTM D790); added standard subjects `Decomposition Temperature` (#21) + `Light Transmission` (#22) | 196 |
| Proto-pasta | Carbon Fiber HTPLA / Magnetic Iron PLA / Stainless Steel PLA: removed prose-only "mechanical" rows (`"Increased rigidity vs. standard PLA"` etc.) — no measured values at the source | 3 |
| Prusament | `NB (no break)` / `no break` → `No break` | 2 |
| NinjaTek | Armadillo / Cheetah / NinjaFlex Abrasion Resistance: `0.03 g` etc. → value `0.03`, units `g` | 3 |
| Bambu Lab / Polymaker / eSUN / colorFabb / Fillamentum / FormFutura | Print Setting rows carried the unit in the value string (`240 - 280 °C`, `20 - 40 mm/s`, `0 - 80%`) with an empty units slot — moved every unit into the units slot (Nozzle/Bed/Chamber temp, Print Speed, Retraction, Cooling Fan, Nozzle Size, Overhang, Bridging) | 160 |

## 3DXTECH mechanical units + subject names (#19)

Every 3DXTECH `.MTDS` was cross-checked against its source TDS PDF.

- **Subject names:** `Tensile Strength` / `Flexural Strength` / `Flexural Modulus`
  / `Impact Strength` → the MTDS standard `… (In-Plane)` form (34 files).
- **Units backfilled** from each TDS: `MPa` on the ISO 527/178 sheets and the
  metric 3DXLABS ASTM sheet (26 files); `psi` on the two per-orientation ASTM
  D638/D790 sheets that print imperial (EMI-ABS, CarbonX HTN-CF); `GPa` for
  ESD-PLA flexural modulus; `kJ/m^2` for CarbonX PP-CF Izod. The compiler
  normalises all of these to canonical `MPa` / `kJ/m^2`.
- **Wrong values corrected** on the 5 per-orientation sheets — the prior pass had
  taken the *Vertical* (Z / interlayer) row, and for the two Obsidian sheets the
  *Markforged competitor* column:
  - EMI-ABS tensile `1,380` → `6,580` psi (Flat)
  - CarbonX HTN-CF tensile `4,500` → `15,500` psi (Flat); flexural modulus
    `1,380` → `1,380,000` psi (source prints `1,380 ksi`)
  - 3DXSTAT ESD-PLA tensile `23` → `41` MPa (Flat)
  - Obsidian FR-Nylon tensile `10.4` → `30.4`, flexural `43.3` → `48.4` MPa
    (were Onyx-FR numbers; 3DXTECH product, page-2 single-material table)
  - Obsidian-CF v2 tensile `20.1` → `23.8`, flexural `30.8` → `33.9`, flexural
    modulus `820.5` → `1048` MPa (were Onyx numbers)
- `| flat` / `| on edge` annotations record the specimen orientation on the
  per-orientation sheets.

Audit went from **87 warn → 0 warn**. Not done here (own follow-up, #39): the TDS
sheets also publish tensile/Young's modulus, per-orientation *(Interlayer)*
values, and Izod impact that these files don't yet carry.

## Fillamentum catalog rebuilt from source TDS (#20)

All 8 `Fillamentum *.MTDS` files were **systematically fabricated** by the original
catalog agent (which reported it had no PDF access): invented In-Plane / Interlayer
splits on every mechanical property, `ISO` method labels where the source is
`ASTM` / `DIN`, `DSC` melting / Vicat / crystallization / glass-transition /
saturated-water-absorption rows absent from the TDS, invented melt-index values,
and ~12 fabricated print settings per file (retraction, chamber temp, humidity,
drying) that no Fillamentum TDS carries.

Fetched the 8 source TDS PDFs (7 from the Fillamentum data-sheets page, plus
`Nylon CF15 Carbon` for the file catalogued as `PA12-CF`) and regenerated every
file to contain **only** TDS-published data:

- single values with the source's real ASTM/DIN/ISO method + test condition
  (`| at yield, 50 mm/min` etc.), no fabricated orientation split;
- `Melt Volume Rate` (`mm^3/min`) where the sheet gives MVR not MFR (ABS, TPU 92A);
- `Stress at N% Strain (In-Plane)` for the TPU tensile-stress-at-elongation rows;
- `Light Transmission` + `Haze` for the translucent grades (PETG, CPE HG100);
- `CPE` → noted as "CPE HG100"; `PA12-CF` → noted as "Nylon CF15 Carbon" (Product
  Name annotation, source PDF is the authority).

Net ~680 lines removed across the 8 files (fabricated rows); audit stays clean
(0 error / 0 warn added). Rockwell hardness (ASA/PETG/CPE) was dropped — no MTDS
standard subject; logged for a standards pass.

## Catalog expansion — 3D4Makers + Nanovia

Two new industrial-FFF manufacturers added from their source TDS PDFs (see
`work/expansion-reports/{3d4makers,nanovia}.md` for the per-file non-standard
token logs):

- **3D4Makers** (21 files) — PEEK, R-PEEK, PEKK-A, PPSU, PEI Ultem 9085/1010, the
  LEHVOSS LUVOCOM 3F line, ABS-ESD, ABS-Kevlar, PETG-Carbon.
- **Nanovia** (12 files) — ABS/PC/PETG in CF/GF/aramid/ESD, PC-PTFE, PEI Ultem
  1010, TPU 70D. 0° / 90° printed-specimen data mapped to `(In-Plane)` /
  `(Interlayer)`.

Both add **0 error / 0 warn**. New non-standard subjects introduced consistently:
`Continuous Service Temperature`, `Coefficient of Friction` (PC-PTFE) — both
flagged for a `MTDS.md` standards pass, along with `Melt Volume Rate` (already in
23 Prusament files).

Coverage after all four merges: **17 manufacturers, 324 filaments** (was 15 / 291).

## Still open

- **3DXTECH catalog enrichment (#39).** Modulus / interlayer / Izod data present
  in the same TDSs, not yet carried.
- **eSUN / FormFutura / colorFabb redos (#15 / #16 / #17).** Still spec-only stubs
  where present.
- **`family-outlier` review.** `Proto-pasta Stainless Steel PLA` density `2.4` is
  correct (metal-filled — the "PLA" family label is just too coarse).
  `3DXTECH 3DXMAX LTS2` Tg `100 °C` under a PLA label is suspect — verify grade.
- **`3DXTECH ABS` Product Name repeats the manufacturer** — left as-is (it is the
  actual product name; only one file).
- **Method annotations elsewhere.** The `ISO 527` in bending cells was the
  systematic Polymaker case; scan other manufacturers for the same on the next pass.
