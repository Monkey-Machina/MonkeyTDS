#!/usr/bin/env python3
"""Minimal, dependency-free unit engine for MTDS.

Every unit is defined as (scale, dimension-vector[, offset]) over the seven SI
base units, so any two dimensionally-compatible units can be converted with no
external library. The registry below is the reference implementation of the
"Standard Units" table in MTDS.md.

    from units import convert, dimension
    convert(2.33, "GPa", "MPa")   -> 2330.0
    convert(1.0, "ohm-cm", "ohm-m") -> 0.01
    dimension("MPa") == dimension("Pa")   -> True
"""

# SI base dimensions: kg, m, s, A, K, mol, cd
_BASE = ("kg", "m", "s", "A", "K", "mol", "cd")


def _d(**kw):
    return tuple(kw.get(b, 0) for b in _BASE)


class U:
    __slots__ = ("scale", "dim", "offset")

    def __init__(self, scale, dim, offset=0.0):
        self.scale = float(scale)
        self.dim = dim
        self.offset = float(offset)          # affine units (°C); scale-to-SI: si = value*scale + offset


# --- registry -------------------------------------------------------------
DIMENSIONLESS = _d()
_PA = _d(kg=1, m=-1, s=-2)
_OHM = _d(kg=1, m=2, s=-3, A=-2)

REGISTRY = {
    # base / plain
    "kg": U(1, _d(kg=1)),
    "g": U(1e-3, _d(kg=1)),
    "m": U(1, _d(m=1)),
    "cm": U(1e-2, _d(m=1)),
    "mm": U(1e-3, _d(m=1)),
    "s": U(1, _d(s=1)),
    "min": U(60, _d(s=1)),
    "h": U(3600, _d(s=1)),
    "K": U(1, _d(K=1)),
    "°C": U(1, _d(K=1), 273.15),
    "A": U(1, _d(A=1)),
    "mol": U(1, _d(mol=1)),
    # pressure / stress
    "Pa": U(1, _PA),
    "kPa": U(1e3, _PA),
    "MPa": U(1e6, _PA),
    "GPa": U(1e9, _PA),
    # ratios
    "%": U(1e-2, DIMENSIONLESS),
    "% RH": U(1e-2, DIMENSIONLESS),
    "wt%": U(1e-2, DIMENSIONLESS),
    "ppm": U(1e-6, DIMENSIONLESS),
    "°": U(3.141592653589793 / 180, DIMENSIONLESS),   # angle
    # flow-rate style (kept atomic; "per 10 min" is a reporting convention)
    "g/10 min": U(1, _d(kg=1)),                       # 1 g / 10 min  (compared like-for-like)
    "cm^3/10 min": U(1, _d(m=3)),
    "mm/s": U(1e-3, _d(m=1, s=-1)),
    "mm^3/s": U(1e-9, _d(m=3, s=-1)),
    # energy density / impact
    "kJ/m^2": U(1e3, _d(kg=1, s=-2)),
    "J/m^2": U(1, _d(kg=1, s=-2)),
    # thermal
    "W/m·K": U(1, _d(kg=1, m=1, s=-3, K=-1)),
    "ppm/°C": U(1e-6, _d(K=-1)),
    # electrical
    "ohm": U(1, _OHM),
    "kohm": U(1e3, _OHM),
    "Mohm": U(1e6, _OHM),
    "ohm-cm": U(1e-2, _d(kg=1, m=3, s=-3, A=-2)),     # resistivity: ohm * cm
    "ohm-m": U(1, _d(kg=1, m=3, s=-3, A=-2)),
    "ohm/sq": U(1, _OHM),                             # sheet resistance, dimensionally ohm
    "kV/mm": U(1e6, _d(kg=1, m=1, s=-3, A=-1)),
    # magnetic
    "T": U(1, _d(kg=1, s=-2, A=-1)),
}

# spelling / mojibake aliases seen in source data
ALIAS = {
    "g/cm3": "g/cm^3", "g/cm³": "g/cm^3",
    "kJ/m2": "kJ/m^2", "kJ/m²": "kJ/m^2",
    "cm3/10 min": "cm^3/10 min", "cm_3_/10 min": "cm^3/10 min",
    "mm3/s": "mm^3/s",
    "C": "°C", "degC": "°C", "℃": "°C",
    "meters": "m", "meter": "m",
    "% by weight": "wt%", "wt %": "wt%",
    "Tesla": "T", "tesla": "T",
    "ohm·m": "ohm-m", "ohm*m": "ohm-m", "ohm.m": "ohm-m", "Ohm x m": "ohm-m",
    "ohm·cm": "ohm-cm", "Ohm-cm": "ohm-cm",
    "Ohm/sq": "ohm/sq",
    "ohms": "ohm", "Ohm": "ohm",
    "W/mK": "W/m·K", "W/m-K": "W/m·K", "W/(m·K)": "W/m·K", "W/m.K": "W/m·K",
    "degree": "°", "deg": "°",
}

# g/cm^3 defined via composition so we don't have to hand-write its vector
REGISTRY["g/cm^3"] = U(1e-3 / (1e-2 ** 3), _d(kg=1, m=-3))   # 1000 kg/m^3


def _lookup(name):
    if name is None:
        return None
    name = name.strip()
    name = ALIAS.get(name, name)
    return REGISTRY.get(name)


def dimension(name):
    u = _lookup(name)
    return u.dim if u else None


def compatible(a, b):
    da, db = dimension(a), dimension(b)
    return da is not None and da == db


def convert(value, frm, to):
    """Convert a number from unit `frm` to unit `to`. Returns None if the units
    are unknown or dimensionally incompatible."""
    a, b = _lookup(frm), _lookup(to)
    if a is None or b is None or a.dim != b.dim:
        return None
    si = value * a.scale + a.offset
    return (si - b.offset) / b.scale


def known(name):
    return _lookup(name) is not None


if __name__ == "__main__":
    tests = [
        (2.33, "GPa", "MPa", 2330.0),
        (1.0, "ohm-cm", "ohm-m", 0.01),
        (100.0, "°C", "K", 373.15),
        (1.24, "g/cm^3", "g/cm^3", 1.24),
        (5.0, "%", "%", 5.0),
    ]
    for v, f, t, exp in tests:
        got = convert(v, f, t)
        print(f"{v} {f} -> {t} = {got}  (expect {exp})  {'OK' if abs(got - exp) < 1e-9 else 'FAIL'}")
