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

Current: **0 error, 87 warn, 8 info** — all 87 warnings are 3DXTECH mechanical rows
missing units (#19, see below).

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
| Proto-pasta | Carbon Fiber HTPLA / Magnetic Iron PLA / Stainless Steel PLA: removed prose-only "mechanical" rows (`"Increased rigidity vs. standard PLA"` etc.) — no measured values at the source | 3 |
| Prusament | `NB (no break)` / `no break` → `No break` | 2 |
| NinjaTek | Armadillo / Cheetah / NinjaFlex Abrasion Resistance: `0.03 g` etc. → value `0.03`, units `g` | 3 |
| Bambu Lab / Polymaker / eSUN / colorFabb / Fillamentum / FormFutura | Print Setting rows carried the unit in the value string (`240 - 280 °C`, `20 - 40 mm/s`, `0 - 80%`) with an empty units slot — moved every unit into the units slot (Nozzle/Bed/Chamber temp, Print Speed, Retraction, Cooling Fan, Nozzle Size, Overhang, Bridging) | 160 |

## Still open

- **3DXTECH mechanical units (#19).** 87 `no-unit` warnings across ~30 files —
  Tensile / Flexural Strength / Flexural Modulus. Some sheets report in **psi**
  (comma-grouped, e.g. `314,000`), some in **MPa**; a few files look
  column-shifted (e.g. CarbonX HTN-CF: modulus `1,380` < strength `26,900`).
  Needs each TDS. Not touched here — too much guesswork.
- **Fillamentum value verification (#20).** 8 files, full property sections, not
  yet cross-checked against the source PDFs.
- **eSUN / FormFutura / colorFabb redos (#15 / #16 / #17).** Still spec-only stubs
  where present.
- **`family-outlier` review.** `Proto-pasta Stainless Steel PLA` density `2.4` is
  correct (metal-filled — the "PLA" family label is just too coarse).
  `3DXTECH 3DXMAX LTS2` Tg `100 °C` under a PLA label is suspect — verify grade.
- **`3DXTECH ABS` Product Name repeats the manufacturer** — left as-is (it is the
  actual product name; only one file).
- **Method annotations elsewhere.** The `ISO 527` in bending cells was the
  systematic Polymaker case; scan other manufacturers for the same on the next pass.
