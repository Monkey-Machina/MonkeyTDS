# MTDS Unit Engine

`scripts/units.py` is a small, dependency-free dimensional-analysis engine. It
**parses** unit strings compositionally rather than looking them up in a table:
`mm^3/s` is understood as `mm` (milli + metre) cubed over `s`, `W/m·K` as watt
over metre·kelvin, `dg/min` as decigram over minute.

Every parsed unit resolves to `(scale, dimension, offset)` where `dimension` is a
7-tuple of exponents over the SI base units `kg, m, s, A, K, mol, cd`. Two units
convert iff their dimensions are equal.

```python
from units import convert, dimension, compatible, known
convert(2.33, "GPa", "MPa")      # 2330.0
convert(9.0, "dg/min", "g/s")    # 0.015
convert(1.0, "J/m", "kJ/m^2")    # None  — different dimension
compatible("ohm·cm", "ohm-m")    # True
```

## Grammar

A unit string is `<numerator> ( "/" <denominator> )*`. Each part is a product of
terms; **every `/` starts another denominator group**, so:

| written | means |
| --- | --- |
| `mm^3/s` | mm³ · s⁻¹ |
| `W/m·K` | W · m⁻¹ · K⁻¹ |
| `kg/m/s^2` | kg · m⁻¹ · s⁻² |
| `N·m/m` | N |

Term separators — all mean multiply: `·`, `*`, `×`, `.`, a space, or a hyphen
between two unit letters (`ohm-cm` = `ohm·cm`).

Powers: `^n` or `^-n` (`s^-2`), or a bare trailing integer (`cm3` → `cm^3`), or a
Unicode superscript (`m³`, `s⁻²`).

## Base units

| token | SI | note |
| --- | --- | --- |
| `g` | 1e-3 kg | gram (mass stem; `kg` = kilo + g) |
| `m` | m | metre |
| `s` | s | second |
| `A` | A | ampere |
| `K` | K | kelvin |
| `mol` | mol | mole |
| `cd` | cd | candela |

## SI prefixes

All base units and named derived units below take any SI prefix
(`kg`, `mm`, `µS`, `MΩ`, `GPa`, `dg`, `daN`, …).

`Y` 1e24 · `Z` 1e21 · `E` 1e18 · `P` 1e15 · `T` 1e12 · `G` 1e9 · `M` 1e6 ·
`k` 1e3 · `h` 1e2 · `da` 1e1 · `d` 1e-1 · `c` 1e-2 · `m` 1e-3 ·
`u`/`µ` 1e-6 · `n` 1e-9 · `p` 1e-12 · `f` 1e-15 · `a` 1e-18 · `z` 1e-21 · `y` 1e-24

A bare token that is itself a unit is never treated as prefixed: `m` is metre
(not milli), `T` is tesla, `min` is minute, `cd` is candela.

## Named derived units (prefixable)

| token | expansion |
| --- | --- |
| `N` | kg·m·s⁻² |
| `Pa` | kg·m⁻¹·s⁻² |
| `J` | kg·m²·s⁻² |
| `W` | kg·m²·s⁻³ |
| `V` | kg·m²·s⁻³·A⁻¹ |
| `ohm` (`Ω`) | kg·m²·s⁻³·A⁻² |
| `S` | kg⁻¹·m⁻²·s³·A² (siemens) |
| `F` | kg⁻¹·m⁻²·s⁴·A² (farad) |
| `H` | kg·m²·s⁻²·A⁻² (henry) |
| `Wb` | kg·m²·s⁻²·A⁻¹ (weber) |
| `T` | kg·s⁻²·A⁻¹ (tesla) |
| `Hz` | s⁻¹ |

## Accepted non-SI units (NOT prefixable)

| token | SI |
| --- | --- |
| `min` | 60 s |
| `h` | 3600 s |
| `day` | 86400 s |
| `L` | 1e-3 m³ |
| `t` | 1e3 kg (tonne) |
| `bar` | 1e5 Pa |
| `in` | 0.0254 m |
| `mil` | 2.54e-5 m |
| `ft` | 0.3048 m |
| `kgf` | 9.80665 N (kilogram-force) |
| `lbf` | 4.4482216 N |
| `psi` | 6894.757 Pa |
| `°` | π/180 (angle) |
| `rad`, `sr` | 1 |
| `sq` | 1 — "per square" notation, e.g. `ohm/sq` |
| `%` | 1e-2 |
| `ppm` | 1e-6 |
| `ppb` | 1e-9 |

`wt%`, `vol%`, `mol%`, `% RH` all alias to `%` — the qualifier belongs in a field
annotation, not the unit.

## Affine units

`°C` and `°F` carry an offset, so they are only valid as the **entire** unit
string (`convert(100, "°C", "K") == 373.15`). Inside a compound (`ppm/°C`,
`°C/min`) they contribute only their scale and the `K` dimension — a temperature
*interval*.

## What is deliberately not supported

- **Reporting conventions with an embedded number** — `g/10 min`, `cm^3/10 min`.
  A file must use a real composable unit: melt mass-flow rate as `dg/min`
  (numerically identical to `g/10 min`), melt volume-flow rate as `mm^3/min` or
  `mm^3/s`. (`g/10 min` is kept as a spelling alias for `dg/min`; `cm^3/10 min`
  is not.)
- **Currency, information, counting units.**

## Canonical unit per subject

When the dataset compiles, each numeric field gets `valueCanonical` /
`canonicalUnit`. The target unit per subject is declared in `SUBJECT_UNITS`
(`scripts/compile_materials.py`) and chosen for a **coherent, comparable
dataset**, not to match data-sheet spelling — e.g. melt mass-flow rate → `dg/min`,
melt volume-flow rate → `mm^3/s` (directly comparable with extrusion volumetric
speed). The verbatim value and its original unit are always kept on the field.

A subject may declare more than one accepted unit when a property is genuinely
reported in two non-interconvertible conventions — impact strength as `kJ/m^2`
(ISO Charpy, energy per area) *or* `J/m` (ASTM Izod, energy per width); tear
strength as `kN/m` *or* `N`; abrasion loss as `%`, `mm^3`, *or* `g`. A unit that
is neither a declared alternate nor dimensionally compatible with the canonical
is an error (`compile_materials.py --check` exits non-zero).

## Self-test

`python scripts/units.py` runs the engine's conversion tests and the
cross-dimension guards. It runs in CI (`.github/workflows/audit.yml`).
