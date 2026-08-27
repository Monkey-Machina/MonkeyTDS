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
| Specific | Information which which is not a Specification or Property but not common enough to warrant a new category |

### MTDS Standard Field Subjects
| Category | Subject | Method | Value | Units |
| -------- | ------- | ------ | ---- | ----- | 
| Specification | Manufacturer | N/A | *Req.* | N/A |
| Specification | Product Name | N/A | *Req.* | N/A |
| Specification | Diameter     | *Opt.* | *Req.* | N/A |
| Specification | Source | N/A | *Req.* | N/A |
| Physical Property | Density | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melt Index | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melt Index | *Req.* | *Req.* | *Req.* | 
| Physical Property | Melting Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Glass Transition Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Crystallization Temperature | *Req.* | *Req.* | *Req.* |
| Physical Property | Vicar Softening Temperature | *Req.* | *Req.* | *Req.* |
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
| Chemical Property | Skin Hazards | *Opt.* | *Req.* | *Opt.* |

## MTDS Standard Field Methods, Values, and Units
In addition to standard fields MTDS outlines standard methods, values and units. Standard methods, values, and units are separate from standard field subjects. Applicable field standard methods, values, and units must still be used outside of standard subject fields to be considered compliant. Standard subject fields can use non-standard methods, values, and units. The purpose of these method, value, and unit standards is to maximize user ability to search and filter MTDS files.

### Standard Methods
| Method | Definition | 
| ------ | ------- |
|  |  |

### Standard Values
| Value | Definition | 
| ----- | ------- |
| Bambu Lab | A specific filament manufacturer |
| Polymaker | A specific filament manufacturer |

## Standard Units
| Unit | Definition | 
| ----- | ------- |
| m | Meter |
| mm | Millimeter |

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
