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
| Specification | Source | N/A | *Req.* | N/A |
| Physical Property | Density | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melt Index | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melting Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Glass Transition Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Crystallization Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Vicat Softening Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Heat Deflection Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Saturated Water Absorption Rate | *Req.* | *Req.* | *Req.* |
| Physical Property | Odor | *Opt.* | *Req.* | *Opt.* |
| Physical Property | Color | *Opt.* | *Req.* | *Opt.* |
| Mechanical Property | Young's Modulus (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Young's Modulus (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Tensile Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Tensile Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Breaking Elongation Rate (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Breaking Elongation Rate (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Modulus (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Modulus (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Bending Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Impact Strength (In-Plane) | *Req.* | *Req.* | *Req.* |
| Mechanical Property | Impact Strength (Interlayer) | *Req.* | *Req.* | *Req.* |
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

## MTDS Standard Field Methods, Values, and Units
In addition to standard fields MTDS outlines standard methods, values and units. Standard methods, values, and units are separate from standard field subjects. Applicable field standard methods, values, and units must still be used outside of standard subject fields to be considered compliant. Standard subject fields can use non-standard methods, values, and units. The purpose of these method, value, and unit standards is to maximize user ability to search and filter MTDS files.

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

#### Method Field Syntax
A field MAY contain more than one `< Method` entry, one per line, to record parallel methods such as an ISO method and its GB/T equivalent.

Each `< Method` entry is one of:
- a Standard Method written exactly as it appears in the table above, or
- a Standard Method, then `, ` (comma and space), then free-form test condition text.

A parser splits an entry on its first `, `. The text before it MUST match a Standard Method exactly; the text after it is the test condition. Test conditions are not standardized and are meant for substring search. Common condition text includes `1.8 MPa`, `0.45 MPa`, `10 °C/min`, `210 °C, 2.16 kg`, `25 °C, 55% RH`, `notched`, and `unnotched`.

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
| notched | Impact test condition: notched specimen |
| unnotched | Impact test condition: unnotched specimen |

## Standard Units
| Unit | Definition | 
| ----- | ------- |
| m | Meter |
| mm | Millimeter |
| g | Gram |
| kg | Kilogram |
| g/cm^3 | Grams per cubic centimeter |
| g/10 min | Grams per ten minutes (melt flow rate) |
| °C | Degrees Celsius |
| MPa | Megapascal |
| kJ/m^2 | Kilojoules per square meter |
| % | Percent |
| % RH | Percent relative humidity |
| ° | Degree of angle |
| mm/s | Millimeters per second |
| h | Hour |
| min | Minute |

### .MTDS File Format
The .MTDS file format is a standard for storing MTDS material information in a plain text file that is distinct from other plan text files. MTDS compliant information could be stored in other formats, but databases or systems must follow this format to be considered compliant. The purposes of this is to allow for future feature growth and expansion into more complex data storage.

### Example .MTDS Files (comments highlighted)
###### Short Template Example
```
# Category
> Subject
  < Method
  < Value
  < Units

> Subject
  < Value

# Category
> Subject
  < Value
```
###### Short Standard Subjects Example
```
# Specification
> Manufacturer
  < Inland

> Product Name
  < PLA Basic

# Physical Property
> Density
  < ISO 1183
  < 1.22
  < g/cm^3

```
