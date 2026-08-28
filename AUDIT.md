# Dataset accuracy audit

Tracking issue: [#31](https://github.com/Monkey-Machina/MonkeyTDS/issues/31).
Run the lint with `python scripts/compile_materials.py --audit`.

## Lint

`compile_materials.py` now runs a data-quality pass. `--audit` prints the full
report; `--check` exits non-zero on **error**-level findings only (data
corruption), so it is safe to gate CI on. See `.github/workflows/audit.yml`.

| level | codes | gates `--check` |
| --- | --- | --- |
| error | `unit-convert`, `tolerance>value` | yes |
| warn | `no-unit`, `unknown-unit`, `unparsed-value` | no |
| info | `name-prefix`, `method-mismatch`, `family-outlier` | no |

Current: **0 error, 87 warn, 3 info** — the 87 warnings are all 3DXTECH
mechanical rows missing units (see below).

## Fixed in this pass

| manufacturer | fix | files |
| --- | --- | --- |
| 3DXTECH | added missing units to Density (`g/cm^3`) and glass-transition / heat-deflection / Vicat / melting temperatures (`°C`) | ~33 |
| 3DXTECH | `Not Applicable` → `N/A` | 5 |
| Polymaker | `ABS Max/ABS Pro/PC-ABS/PC-PBT/PETG` Product Name: dropped the redundant `Polymaker ` prefix (44/49 files already omit it) | 5 |
| Polymaker | HT-PLA & PolyLite ABS: X-Y tensile-strength tolerance is a verified misprint in the source TDS (`± 160.44`, `± 92.7` copied from the modulus row) — kept the mean, annotated the tolerance | 2 |
| Polymaker | PolyLite ABS/PLA Pro/PC/LW-PLA/CosPLA A+B, PolyMax PC/PC-FR, Fiberon ASA-CF08/PET-GF15: flexural rows carried the tensile method (`ISO 527` / `ISO 306`) — set to `ISO 178` with a note that the TDS table misprints it | 10 |
| Bambu Lab | PLA Aero Density `1.21 g/cm³(filament)` → value `1.21`, unit `g/cm^3` | 1 |
| Bambu Lab | PLA Sparkle Bending Modulus (Interlayer) missing `MPa` | 1 |
| Proto-pasta | Carbon Fiber HTPLA / Magnetic Iron PLA / Stainless Steel PLA: removed prose-only "mechanical" rows (`"Increased rigidity vs. standard PLA"` etc.) — no measured values at the source | 3 |
| Prusament | `NB (no break)` / `no break` → `No break` | 2 |

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
