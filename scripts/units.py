#!/usr/bin/env python3
"""Compositional, dependency-free unit engine for MTDS.

A unit string is *parsed*, not looked up in a table. `mm^3/s` is understood as
`mm` (milli + metre) cubed, divided by `s`; `W/m·K` as watt over metre·kelvin;
`dg/min` as decigram over minute. See UNITS.md for the full grammar, the base
units, the SI prefixes, and the named derived units.

    from units import convert, dimension, compatible, known
    convert(2.33, "GPa", "MPa")     -> 2330.0
    convert(9.0, "dg/min", "g/s")   -> 0.015
    convert(1.0, "ohm·cm", "ohm·m") -> 0.01
    dimension("MPa") == dimension("Pa")   -> True
    convert(1.0, "J/m", "kJ/m^2")   -> None   (different dimension)
"""
import math
import re

# --- SI base dimensions: kg, m, s, A, K, mol, cd --------------------------
_BASE = ("kg", "m", "s", "A", "K", "mol", "cd")


def _d(**kw):
    return tuple(kw.get(b, 0) for b in _BASE)


DIMENSIONLESS = _d()

# --- SI prefixes --------------------------------------------------------------
_PREFIX = {
    "Y": 1e24, "Z": 1e21, "E": 1e18, "P": 1e15, "T": 1e12, "G": 1e9, "M": 1e6,
    "k": 1e3, "h": 1e2, "da": 1e1,
    "d": 1e-1, "c": 1e-2, "m": 1e-3, "u": 1e-6, "µ": 1e-6, "μ": 1e-6,
    "n": 1e-9, "p": 1e-12, "f": 1e-15, "a": 1e-18, "z": 1e-21, "y": 1e-24,
}

# --- atomic units: token -> (scale to SI, dimension) -------------------------
# "prefixable" ones may take an SI prefix (kg, mm, MPa, µS, ...).
_PA = _d(kg=1, m=-1, s=-2)
_FORCE = _d(kg=1, m=1, s=-2)
_UNIT = {
    # SI base (all prefixable; "kg" is kilo+g)
    "g": (1e-3, _d(kg=1)),
    "m": (1.0, _d(m=1)),
    "s": (1.0, _d(s=1)),
    "A": (1.0, _d(A=1)),
    "K": (1.0, _d(K=1)),
    "mol": (1.0, _d(mol=1)),
    "cd": (1.0, _d(cd=1)),
    # named SI-derived (prefixable)
    "N": (1.0, _FORCE),
    "Pa": (1.0, _PA),
    "J": (1.0, _d(kg=1, m=2, s=-2)),
    "W": (1.0, _d(kg=1, m=2, s=-3)),
    "V": (1.0, _d(kg=1, m=2, s=-3, A=-1)),
    "ohm": (1.0, _d(kg=1, m=2, s=-3, A=-2)),
    "S": (1.0, _d(kg=-1, m=-2, s=3, A=2)),
    "F": (1.0, _d(kg=-1, m=-2, s=4, A=2)),
    "H": (1.0, _d(kg=1, m=2, s=-2, A=-2)),
    "Wb": (1.0, _d(kg=1, m=2, s=-2, A=-1)),
    "T": (1.0, _d(kg=1, s=-2, A=-1)),
    "Hz": (1.0, _d(s=-1)),
    # accepted non-SI (NOT prefixable)
    "min": (60.0, _d(s=1)),
    "h": (3600.0, _d(s=1)),
    "day": (86400.0, _d(s=1)),
    "L": (1e-3, _d(m=3)),
    "t": (1e3, _d(kg=1)),
    "bar": (1e5, _PA),
    "in": (0.0254, _d(m=1)),
    "mil": (2.54e-5, _d(m=1)),
    "ft": (0.3048, _d(m=1)),
    "kgf": (9.80665, _FORCE),
    "lbf": (4.4482216, _FORCE),
    "psi": (6894.757, _PA),
    # dimensionless
    "rad": (1.0, DIMENSIONLESS),
    "sr": (1.0, DIMENSIONLESS),
    "sq": (1.0, DIMENSIONLESS),          # "per square" (sheet-resistance notation)
    "%": (1e-2, DIMENSIONLESS),
    "ppm": (1e-6, DIMENSIONLESS),
    "ppb": (1e-9, DIMENSIONLESS),
}
_NOPREFIX = {"min", "h", "day", "bar", "in", "mil", "ft", "kgf", "lbf", "psi",
             "mol", "cd", "rad", "sr", "sq", "%", "ppm", "ppb"}

# affine units — only valid as the *entire* string, never inside a compound.
# scale to K, plus offset:  T_K = value * scale + offset
_AFFINE = {
    "°C": (1.0, 273.15), "degC": (1.0, 273.15),
    "°F": (5.0 / 9.0, 459.67 * 5.0 / 9.0), "degF": (5.0 / 9.0, 459.67 * 5.0 / 9.0),
}

# whole-string spelling fixes (mojibake, legacy reporting conventions).
# These are *aliases*, not distinct units — they resolve to a compositional form.
_ALIAS = {
    "g/cm3": "g/cm^3", "g/cm³": "g/cm^3",
    "kg/m3": "kg/m^3", "kg/m³": "kg/m^3",
    "kJ/m2": "kJ/m^2", "kJ/m²": "kJ/m^2", "J/m2": "J/m^2", "J/m²": "J/m^2",
    "mm3": "mm^3", "mm³": "mm^3", "cm3": "cm^3", "cm³": "cm^3", "m3": "m^3", "m³": "m^3",
    "mm3/s": "mm^3/s", "mm³/s": "mm^3/s", "cm3/s": "cm^3/s", "cm³/s": "cm^3/s",
    "℃": "°C", "C": "°C", "degrees C": "°C", "deg C": "°C",
    "℉": "°F", "deg F": "°F",
    "Tesla": "T", "tesla": "T", "Teslas": "T",
    "Ω": "ohm", "Ω·m": "ohm·m", "Ω·cm": "ohm·cm", "Ω/sq": "ohm/sq", "ohms": "ohm",
    "ohm-m": "ohm·m", "ohm-cm": "ohm·cm", "ohm.m": "ohm·m", "Ohm-cm": "ohm·cm",
    "ohm*m": "ohm·m", "Ohm x m": "ohm·m", "Ohm/sq": "ohm/sq",
    "W/mK": "W/m·K", "W/m-K": "W/m·K", "W/(m·K)": "W/m·K", "W/m.K": "W/m·K",
    "W/m*K": "W/m·K",
    "µm": "um", "μm": "um",
    "sec": "s", "secs": "s", "seconds": "s", "hours": "h", "hr": "h",
    "meters": "m", "meter": "m", "grams": "g", "gram": "g",
    "wt%": "%", "% by weight": "%", "wt %": "%", "% RH": "%", "%RH": "%",
    "vol%": "%", "mol%": "%",
    "degree": "°", "degrees": "°", "deg": "°",
    "kgf·cm/cm": "kgf·cm/cm", "kgf.cm/cm": "kgf·cm/cm", "kg·cm/cm": "kgf·cm/cm",
    "kgf cm/cm": "kgf·cm/cm", "kg*cm/cm": "kgf·cm/cm", "kg.cm/cm": "kgf·cm/cm",
    # legacy melt-rate reporting conventions -> compositional equivalents
    "g/10 min": "dg/min", "g/10min": "dg/min", "g/10 mins": "dg/min",
    "dg/10 min": "cg/min",
}

_SUP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻", "0123456789+-")


def _normalize(u):
    """Whole-string alias, superscripts -> ^n, unify separators."""
    u = u.strip()
    u = _ALIAS.get(u, u)
    if u in _AFFINE:
        return u
    u = _ALIAS.get(u, u)
    # superscript runs -> ^<digits>
    u = re.sub(r"[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+", lambda m: "^" + m.group(0).translate(_SUP), u)
    # a letter immediately followed by a signed integer -> insert ^  (cm3 -> cm^3)
    u = re.sub(r"([A-Za-z°Ωµμ])(-?\d)", r"\1^\2", u)
    # multiplication separators -> "*"
    u = u.replace("·", "*").replace("⋅", "*").replace("×", "*").replace(" ", "*").replace(".", "*")
    # hyphen between two unit letters means multiply (ohm-cm); leave ^-2 alone
    u = re.sub(r"(?<=[A-Za-z)Ω])-(?=[A-Za-z(µμΩ])", "*", u)
    return u


def _atom(tok):
    """(scale, dim) for a single prefixed atomic token, or None."""
    tok = _ALIAS.get(tok, tok)
    if tok in _UNIT:
        return _UNIT[tok]
    if tok in _AFFINE:               # °C used as an interval inside a compound
        return (_AFFINE[tok][0], _d(K=1))
    if tok == "°":
        return (math.pi / 180.0, DIMENSIONLESS)
    for plen in (2, 1):
        if len(tok) > plen:
            pfx, rest = tok[:plen], tok[plen:]
            rest = _ALIAS.get(rest, rest)
            if pfx in _PREFIX and rest in _UNIT and rest not in _NOPREFIX:
                sc, dim = _UNIT[rest]
                return (_PREFIX[pfx] * sc, dim)
    return None


def _terms(chunk, out, direction):
    for tok in chunk.split("*"):
        tok = tok.strip()
        if not tok:
            continue
        m = re.match(r"^(.*?)\^([+-]?\d+)$", tok)
        base, power = (m.group(1), int(m.group(2))) if m else (tok, 1)
        a = _atom(base)
        if a is None:
            raise KeyError(tok)
        out.append((a[0], a[1], power * direction))


def _parse(u):
    """(scale_to_SI, dimension_tuple, offset) or None."""
    if u is None:
        return None
    u0 = u.strip()
    if not u0:
        return None
    if _ALIAS.get(u0, u0) in _AFFINE:
        sc, off = _AFFINE[_ALIAS.get(u0, u0)]
        return (sc, _d(K=1), off)
    s = _normalize(u0)
    parts = s.split("/")
    factors = []
    try:
        _terms(parts[0], factors, +1)
        for p in parts[1:]:
            _terms(p, factors, -1)
    except KeyError:
        return None
    scale = 1.0
    dim = [0] * len(_BASE)
    for tsc, tdim, power in factors:
        scale *= tsc ** power
        for i, dv in enumerate(tdim):
            dim[i] += dv * power
    return (scale, tuple(dim), 0.0)


# --- public API -------------------------------------------------------------
def known(name):
    return _parse(name) is not None


def dimension(name):
    p = _parse(name)
    return p[1] if p else None


def compatible(a, b):
    da, db = dimension(a), dimension(b)
    return da is not None and da == db


def convert(value, frm, to):
    """Convert `value` from unit `frm` to unit `to`. None if either unit is
    unparseable or the two have different dimensions."""
    a, b = _parse(frm), _parse(to)
    if a is None or b is None or a[1] != b[1]:
        return None
    si = value * a[0] + a[2]
    return (si - b[2]) / b[0]


def canonical_name(name):
    """Resolve whole-string aliases to the preferred spelling (unchanged if
    already canonical or unknown)."""
    if name is None:
        return None
    name = name.strip()
    return _ALIAS.get(name, name)


def names():
    """The atomic + named units (prefixes and compounds are derived, not listed)."""
    return sorted(_UNIT) + sorted(_AFFINE)


if __name__ == "__main__":
    import sys
    tests = [
        (2.33, "GPa", "MPa", 2330.0),
        (1.0, "ohm·cm", "ohm·m", 0.01),
        (1.0, "ohm-cm", "ohm·m", 0.01),
        (100.0, "°C", "K", 373.15),
        (1.0, "°C", "°F", 33.8),
        (1.24, "g/cm^3", "g/cm^3", 1.24),
        (1.24, "g/cm3", "kg/m^3", 1240.0),
        (5.0, "%", "%", 5.0),
        (23.0, "kgf·cm/cm", "J/m", 225.55295),
        (23.0, "kg·cm/cm", "J/m", 225.55295),
        (1.0, "kN/m", "N/mm", 1.0),
        (2500.0, "mm^3", "cm^3", 2.5),
        (9.0, "dg/min", "g/s", 0.015),
        (1.0, "g/10 min", "dg/min", 1.0),          # legacy spelling -> composable
        (5.0, "cm^3/min", "mm^3/s", 83.3333),
        (1.0, "W/m·K", "W/mK", 1.0),
        (1.0, "kV/mm", "V/m", 1e6),
    ]
    ok = True
    for v, f, t, exp in tests:
        got = convert(v, f, t)
        good = got is not None and abs(got - exp) < 1e-4
        ok &= good
        print(f"{v} {f} -> {t} = {got}  (expect {exp})  {'OK' if good else 'FAIL'}")
    # deliberately NOT interconvertible / not supported
    ok &= convert(1.0, "J/m", "kJ/m^2") is None
    ok &= not compatible("ohm·m", "ohm/sq")
    ok &= convert(1.0, "°C", "W/m·K") is None
    ok &= not known("furlong")
    ok &= not known("cm^3/10 min")     # no composable equivalent — migrate to mm^3/min
    ok &= known("dg/min") and known("MΩ·cm") and known("µS/cm") and known("kJ/m^2")
    if not ok:
        sys.exit("SOME TESTS FAILED")
    print("all unit tests OK")
