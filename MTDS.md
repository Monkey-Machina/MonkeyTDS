# MTDS (Material Technical Data Standard)
MTDS is a standard for organizing material information built on fields. Specifically here, a field contains a subject, method, value, and units, of which only Subject is required.

MTDS defines a number of standard field Subjects. MTDS also recognizes field categories, and defines 3 standard categories. A MTDS compliant material entry may contain any number of non-standard fields contained within any number of non-standard categories but will not contain non-standard fields or categories for which a standard counterpart already exists. Below is a table of all formally recognized MTDS Standard Fields & Categories. Standard Fields are REQUIRED to be contained within the category defined by MTDS.

### MTDS Standard Categories
| Name | Usage |
| --- | --- |
| Specification | Information which is not a material property |
| Physical Property | Physical material properties |
| Mechanical Property | Mechanical material properties |
| Chemical Property | Chemical material properties |
| Electrical Property | Electrical material properties |
| Magnetic Property | Magnetic material properties |
| Print Setting | Recommended settings and conditions for printing the material |
| Specific | Information which which is not a Specification or Property but not common enough to warrant a new category |

### MTDS Standard Field Subjects
| Category | Subject | Method | Value | Units |
| -------- | ------- | ------ | ---- | ----- | 
| Specification | Manufacturer | N/A | *Req.* | N/A |
| Specification | Product Name | N/A | *Req.* | N/A |
| Specification | Material | N/A | *Req.* | N/A |
| Specification | Diameter     | *Opt.* | *Req.* | *Opt.* |
| Specification | Diameter Tolerance | N/A | *Opt.* | *Opt.* |
| Specification | Net Weight | N/A | *Opt.* | *Opt.* |
| Specification | Spool Material | N/A | *Opt.* | N/A |
| Specification | Spool Size | N/A | *Opt.* | *Opt.* |
| Specification | Filler Content | N/A | *Req.* | *Req.* |
| Specification | Post-Treatment Shrinkage (In-Plane) | *Opt.* | *Req.* | *Opt.* |
| Specification | Post-Treatment Shrinkage (Interlayer) | *Opt.* | *Req.* | *Opt.* |
| Specification | Source | N/A | *Req.* | N/A |
| Physical Property | Density | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melt Index | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melting Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Glass Transition Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Crystallization Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Vicat Softening Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Heat Deflection Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Saturated Water Absorption Rate | *Req.* | *Req.* | *Req.* |
| Physical Property | Moisture Absorption | *Opt.* | *Req.* | *Req.* |
| Physical Property | Coefficient of Thermal Expansion | *Req.* | *Req.* | *Req.* |
| Physical Property | Thermal Conductivity | *Req.* | *Req.* | *Req.* |
| Physical Property | Odor | *Opt.* | *Req.* | *Opt.* |
| Physical Property | Color | *Opt.* | *Req.* | *Opt.* |
| Mechanical Property | Young's Modulus (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Young's Modulus (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Tensile Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Tensile Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Breaking Elongation Rate (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Breaking Elongation Rate (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Elongation at Yield (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Elongation at Yield (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Modulus (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Modulus (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Impact Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Impact Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Interlayer Adhesion | *Opt.* | *Req.* | *Req.* |
| Mechanical Property | Shore Hardness | *Req.* | *Req.* | N/A |
| Chemical Property | Composition | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Chemical Stability | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Solubility | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Resistance to Acid | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Resistance to Alkali | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Resistance to Organic Solvent | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Resistance to Oil and Grease | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Flammability | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Combustion Products | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Odor of Combustion Products | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Thermal Decomposition Products | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Odor of Thermal Decomposition | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Skin Hazards | *Opt.* | *Req.* | *Opt.* |
| Chemical Property | Flammability Rating | *Req.* | *Req.* | N/A |
| Electrical Property | Volume Resistivity | *Req.* | *Req.* | *Req.* |
| Electrical Property | Surface Resistivity | *Req.* | *Req.* | *Req.* |
| Electrical Property | Filament Resistance | *Opt.* | *Req.* | *Req.* |
| Electrical Property | Dielectric Strength | *Req.* | *Req.* | *Req.* |
| Magnetic Property | Magnetic Classification | N/A | *Req.* | N/A |
| Magnetic Property | Magnetic Induction at Saturation | *Opt.* | *Req.* | *Req.* |
| Print Setting | Drying Condition | N/A | *Req.* | N/A |
| Print Setting | Print & Storage Humidity | N/A | *Opt.* | *Req.* |
| Print Setting | Nozzle Size | N/A | *Req.* | *Req.* |
| Print Setting | Nozzle Temperature | N/A | *Req.* | *Req.* |
| Print Setting | Build Plate Type | N/A | *Req.* | N/A |
| Print Setting | Build Plate Surface Preparation | N/A | *Req.* | N/A |
| Print Setting | Bed Temperature | N/A | *Req.* | *Req.* |
| Print Setting | Cooling Fan | N/A | *Opt.* | *Opt.* |
| Print Setting | Print Speed | N/A | *Req.* | *Req.* |
| Print Setting | Retraction Length | N/A | *Opt.* | *Req.* |
| Print Setting | Retraction Speed | N/A | *Opt.* | *Req.* |
| Print Setting | Chamber Temperature | N/A | *Opt.* | *Req.* |
| Print Setting | Max Overhang Angle | N/A | *Opt.* | *Req.* |
| Print Setting | Max Bridging Length | N/A | *Opt.* | *Req.* |
| Print Setting | Support Material | N/A | *Opt.* | N/A |
| Print Setting | Annealing Condition | N/A | *Opt.* | N/A |

`Elongation at Yield` is the strain at the yield point, distinct from `Breaking Elongation Rate` (strain at break). `Interlayer Adhesion` is a single bond-strength value between deposited layers, reported by some manufacturers separately from the direction-resolved mechanical subjects. `Moisture Absorption` is measured at a stated time (annotate the duration), distinct from `Saturated Water Absorption Rate` (equilibrium). `Shore Hardness` carries its scale in the value, e.g. `95A` or `81D`.

## MTDS Standard Field Methods, Values, and Units
In addition to standard fields MTDS outlines standard methods, values and units. Standard methods, values, and units are separate from standard field subjects. Applicable field standard methods, values, and units must still be used outside of standard subject fields to be considered compliant. Standard subject fields can use non-standard methods, values, and units. The purpose of these method, value, and unit standards is to maximize user ability to search and filter MTDS files.

### Field Annotations
Any part of a field (subject, method, value, or units) may be followed by ` | ` and free-form annotation text. The text before the ` | ` is the standardized content; the text after it is an unstandardized note or subtext intended for substring search. For example `< ISO 75 | 1.8 MPa`, `< DSC | 10 °C/min`, or `< 12.2 | X-Y`.

### Standard Methods
| Method | Definition | 
| ------ | ------- |
| ISO 1183 | Determination of the density of plastics |
| ISO 1133 | Determination of melt mass-flow rate |
| ISO 527 | Determination of tensile properties |
| ISO 178 | Determination of flexural properties |
| ISO 179 | Determination of Charpy impact strength |
| ISO 306 | Determination of Vicat softening temperature |
| ISO 75 | Determination of temperature of deflection under load |
| GB/T 1040 | Chinese standard for tensile properties, equivalent to ISO 527 |
| GB/T 9341 | Chinese standard for flexural properties, equivalent to ISO 178 |
| GB/T 1043 | Chinese standard for Charpy impact strength, equivalent to ISO 179 |
| GB/T 1633 | Chinese standard for Vicat softening temperature, equivalent to ISO 306 |
| DSC | Differential scanning calorimetry |
| ASTM D638 | Determination of tensile properties, US equivalent of ISO 527 |
| ASTM D790 | Determination of flexural properties, US equivalent of ISO 178 |
| ASTM D648 | Determination of deflection temperature under load, US equivalent of ISO 75 |
| ASTM D256 | Determination of Izod pendulum impact resistance |
| ASTM D257 | Determination of DC resistance or conductance of insulating materials |
| ASTM E831 | Linear thermal expansion by thermomechanical analysis |
| ISO 11359 | Thermomechanical analysis, coefficient of linear thermal expansion |
| ISO 22007 | Determination of thermal conductivity and thermal diffusivity |
| IEC 60243 | Electric strength of insulating materials |
| UL 94 | Flammability classification of plastic materials |
| ISO 868 | Determination of indentation hardness by means of a durometer (Shore hardness) |
| ISO 7619-1 | Determination of indentation hardness, durometer method (Shore hardness) |
| ISO 37 | Determination of tensile stress-strain properties of rubber and elastomers |
| GB/T 531.1 | Chinese standard for Shore durometer hardness, equivalent to ISO 7619-1 |

A field contains at most one method. To record a property measured by more than one method, repeat the whole field, once per method. Test conditions are added as annotations, such as `< ISO 75 | 1.8 MPa` or `< ISO 1133 | 210 °C, 2.16 kg`.

### Standard Values
| Value | Definition | 
| ----- | ------- |
| Bambu Lab | A specific filament manufacturer |
| Polymaker | A specific filament manufacturer |
| Shenzhen Tuozhu Technology Co., Ltd. | Legal manufacturer of Bambu Lab filaments |
| TDS | Technical data sheet source document |
| MSDS | Material safety data sheet source document |
| SDS | Safety data sheet source document |
| RoHS | Restriction of Hazardous Substances declaration source document |
| Hex Code | Filament color hex code source document |
| PLA | Polylactic acid |
| ABS | Acrylonitrile butadiene styrene |
| ASA | Acrylonitrile styrene acrylate |
| PC | Polycarbonate |
| PETG | Polyethylene terephthalate glycol |
| PET | Polyethylene terephthalate |
| PA | Polyamide (nylon) |
| PVA | Polyvinyl alcohol |
| TPU | Thermoplastic polyurethane |
| PPS | Polyphenylene sulfide |
| PPA | Polyphthalamide |
| HIPS | High impact polystyrene |
| Carbon Fiber | Carbon fiber reinforcement |
| Glass Fiber | Glass fiber reinforcement |
| N/A | Not applicable or not measured |
| Odorless | No perceptible odor |
| Flammable | Supports combustion |
| Flame retardant | Resists ignition and combustion |
| Self-extinguishing | Stops burning when the flame source is removed |
| Insoluble in water | Does not dissolve in water |
| Soluble in water | Dissolves in water |
| Not resistant | Degraded or attacked by the stated agent |
| Resistant | Not degraded or attacked by the stated agent |
| Stable under normal storage and handling conditions | No hazardous reaction under normal storage and handling |
| No hazard | Presents no known hazard |
| V-0 | UL 94 flammability rating |
| V-1 | UL 94 flammability rating |
| V-2 | UL 94 flammability rating |
| 5VA | UL 94 flammability rating |
| 5VB | UL 94 flammability rating |
| HB | UL 94 horizontal-burn rating |
| Ferromagnetic | Strongly attracted to magnets and able to retain magnetization |
| Paramagnetic | Weakly attracted to magnets |
| Non-magnetic | Not attracted to magnets |
| PEI Sheet | Polyetherimide build-plate surface |
| Kapton Tape | Polyimide film build-plate surface |
| Garolite | Glass-epoxy laminate build-plate surface |
| BuildTak | Proprietary textured build-plate surface |

## Standard Units
Every unit is defined over the seven SI base units (kg, m, s, A, K, mol, cd) as a
scale factor times a product of base-unit powers, so any two units of the same
dimension can be converted programmatically. `scripts/units.py` is the reference
implementation; tooling normalises each numeric field to a single canonical unit
per subject (see below) when compiling the dataset.

| Unit | SI definition | Meaning |
| ---- | ------------- | ------- |
| m | 1 · m | Meter |
| cm | 1e-2 · m | Centimeter |
| mm | 1e-3 · m | Millimeter |
| g | 1e-3 · kg | Gram |
| kg | 1 · kg | Kilogram |
| s | 1 · s | Second |
| min | 60 · s | Minute |
| h | 3600 · s | Hour |
| K | 1 · K | Kelvin |
| °C | 1 · K + 273.15 | Degrees Celsius (affine) |
| g/cm^3 | 1e3 · kg·m⁻³ | Grams per cubic centimeter |
| MPa | 1e6 · kg·m⁻¹·s⁻² | Megapascal |
| GPa | 1e9 · kg·m⁻¹·s⁻² | Gigapascal |
| N | 1 · kg·m·s⁻² | Newton (also Graves tear force, ASTM D1004) |
| J/m | 1 · kg·m·s⁻² | Joules per meter (impact energy per specimen width, ASTM Izod) |
| kJ/m | 1e3 · kg·m·s⁻² | Kilojoules per meter |
| kg·cm/cm | 9.80665 · kg·m·s⁻² | Kilogram-force·centimeter per centimeter of width (Izod, older TDS) |
| kJ/m^2 | 1e3 · kg·s⁻² | Kilojoules per square meter (impact energy per area, ISO Charpy) |
| J/m^2 | 1 · kg·s⁻² | Joules per square meter |
| N/m | 1 · kg·s⁻² | Newton per meter (tear strength, ISO 34) |
| kN/m | 1e3 · kg·s⁻² | Kilonewton per meter |
| N/mm | 1e3 · kg·s⁻² | Newton per millimeter |
| m^3 | 1 · m³ | Cubic meter |
| cm^3 | 1e-6 · m³ | Cubic centimeter |
| mm^3 | 1e-9 · m³ | Cubic millimeter (abrasion volume loss, ISO 4649) |
| % | 1e-2 · (dimensionless) | Percent |
| % RH | 1e-2 · (dimensionless) | Percent relative humidity |
| wt% | 1e-2 · (dimensionless) | Percent by weight |
| ° | π/180 · (dimensionless) | Degree of angle |
| mm/s | 1e-3 · m·s⁻¹ | Millimeters per second |
| mm^3/s | 1e-9 · m³·s⁻¹ | Cubic millimeters per second (volumetric print speed) |
| cm^3/s | 1e-6 · m³·s⁻¹ | Cubic centimeters per second |
| g/10 min | 1.667e-6 · kg·s⁻¹ | Melt mass-flow rate — grams through the die per 600 s (ISO 1133) |
| g/min | 1.667e-5 · kg·s⁻¹ | Grams per minute |
| dg/min | 1.667e-6 · kg·s⁻¹ | Decigrams per minute (numerically equal to g/10 min) |
| g/s | 1e-3 · kg·s⁻¹ | Grams per second |
| kg/h | 2.778e-4 · kg·s⁻¹ | Kilograms per hour |
| cm^3/10 min | 1.667e-9 · m³·s⁻¹ | Melt volume-flow rate — cm³ through the die per 600 s (ISO 1133) |
| ohm | 1 · kg·m²·s⁻³·A⁻² | Ohm |
| kohm | 1e3 · kg·m²·s⁻³·A⁻² | Kilohm |
| Mohm | 1e6 · kg·m²·s⁻³·A⁻² | Megohm |
| ohm-cm | 1e-2 · kg·m³·s⁻³·A⁻² | Ohm-centimeter (volume resistivity) |
| ohm-m | 1 · kg·m³·s⁻³·A⁻² | Ohm-meter (volume resistivity) |
| ohm/sq | 1 · kg·m²·s⁻³·A⁻² | Ohm per square (surface resistivity) |
| kV/mm | 1e6 · kg·m·s⁻³·A⁻¹ | Kilovolt per millimeter (dielectric strength) |
| T | 1 · kg·s⁻²·A⁻¹ | Tesla (magnetic flux density) |
| W/m·K | 1 · kg·m·s⁻³·K⁻¹ | Watt per meter-kelvin (thermal conductivity) |
| ppm/°C | 1e-6 · K⁻¹ | Parts per million per degree Celsius (thermal expansion) |

### Canonical units
When the dataset is compiled, each numeric field is emitted with `valueNumber`
(a representative number parsed from the value string), `valueRange` /
`valueUncertainty` (when the value is a range, ± spread, or inequality), and a
`valueCanonical` / `canonicalUnit` pair.

Each subject has a **declared canonical unit** — the reference list lives in
`SUBJECT_UNITS` in `scripts/compile_materials.py`; subjects not listed fall back
to the most common recognised unit. A subject may declare more than one accepted
unit when a property is genuinely reported in two non-interconvertible
conventions (impact strength as `kJ/m^2` *or* `J/m`; tear strength as `kN/m` *or*
`N`; abrasion loss as `%`, `mm^3`, *or* `g`). The compiler converts each value to
the first accepted unit it is dimensionally compatible with; a value already in
an accepted-but-non-convertible unit is kept as-is.

Files may report a property in any dimensionally consistent unit; the compiler
normalises it. A unit that is dimensionally wrong for its subject (and not one of
that subject's declared alternates) is an error — `compile_materials.py --check`
exits non-zero.

### .MTDS File Format
The .MTDS file format is a standard for storing MTDS material information in a plain text file that is distinct from other plan text files. MTDS compliant information could be stored in other formats, but databases or systems must follow this format to be considered compliant. The purposes of this is to allow for future feature growth and expansion into more complex data storage.

A subject may appear more than once within a category, for example multiple Source fields or one property measured by several methods.

Every field has exactly three `<` lines in fixed order: Method, Value, Units. A part that is absent is written as an empty `<` line so the position of each part is unambiguous.

### Example .MTDS Files (comments highlighted)
###### Short Template Example
```
# Category
> Subject
  < Method
  < Value
  < Units

> Subject
  <
  < Value
  <
```
###### Short Standard Subjects Example
```
# Specification
> Manufacturer
  <
  < Inland
  <

> Product Name
  <
  < PLA Basic
  <

# Physical Property
> Density
  < ISO 1183
  < 1.22
  < g/cm^3

> Heat Deflection Temperature
  < ISO 75 | 1.8 MPa
  < 54
  < °C

> Crystallization Temperature
  < DSC | 10 °C/min
  < N/A
  <
```
