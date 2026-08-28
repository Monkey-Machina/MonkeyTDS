"use strict";
/* MonkeyTDS frontend — no framework, no build step.
   Views (hash-routed):
     #/?<filters>          faceted search + results table
     #/m/<id>              material detail
     #/compare?ids=a,b,c   comparison matrix
   Filter/sort state lives in the URL; column choice + facet expansion live in
   localStorage (per browser). */

/* column keys: "@check" "@mfr" "@product" "@material" are the fixed columns;
   anything else is a property subject */
var DEFAULT_COLS = [
  "@check", "@mfr", "@product", "@material",
  "Density", "Tensile Strength (In-Plane)", "Young's Modulus (In-Plane)",
  "Heat Deflection Temperature", "Breaking Elongation Rate (In-Plane)"
];
var DEFAULT_PINS = ["@check", "@mfr", "@product", "@material"];
var SPECIAL_COLS = {
  "@check": { label: "", sort: null, num: false },
  "@mfr": { label: "Manufacturer", sort: "manufacturer", num: false },
  "@product": { label: "Product", sort: "productName", num: false },
  "@material": { label: "Material", sort: "material", num: false }
};
var CORE = [
  "Density", "Melt Index", "Glass Transition Temperature", "Heat Deflection Temperature",
  "Tensile Strength (In-Plane)", "Tensile Strength (Interlayer)",
  "Young's Modulus (In-Plane)", "Young's Modulus (Interlayer)",
  "Breaking Elongation Rate (In-Plane)", "Bending Strength (In-Plane)",
  "Bending Modulus (In-Plane)", "Impact Strength (In-Plane)"
];
var FACET_COLLAPSED = 5;

var DATA = null;
var BY_ID = {};
var SUBJECTS = [];                  // property subjects that carry numbers, by frequency
var UNIT_FOR = {};                  // subject -> most common unit
var TRAY = load_set("mtds_tray");   // ids queued for compare
var COLS = load_cols();             // ordered result-table column keys
var COL_PINS = load_pins();         // subset of COLS that stay stuck to the left
var FACET_OPEN = load_obj("mtds_facet_open");
var RESTORE_Q = null;               // caret position to restore after a text-search re-render

/* ---------- data ---------- */
(window.__MTDS_DATA__
  ? Promise.resolve(window.__MTDS_DATA__)
  : fetch("data/materials.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
).then(function (d) {
  DATA = d;
  var PROP_CATS = { "Physical Property": 1, "Mechanical Property": 1, "Chemical Property": 1, "Electrical Property": 1, "Magnetic Property": 1 };
  var propSubj = {};
  d.materials.forEach(function (m) {
    BY_ID[m.id] = m;
    m._nums = {}; m._methods = {}; m._raw = {};
    m.fields.forEach(function (f) {
      f.subject = f.subject.replace(/[’‘`]/g, "'");
      if (PROP_CATS[f.category]) propSubj[f.subject] = 1;
      if (!(f.subject in m._raw)) m._raw[f.subject] = { value: f.value, units: f.units };
      var n = (f.valueCanonical != null) ? f.valueCanonical
            : (f.valueNumber != null) ? f.valueNumber
            : parse_num(f.value);
      if (n !== null && !(f.subject in m._nums)) m._nums[f.subject] = n;
      if (f.method && !(f.subject in m._methods)) m._methods[f.subject] = f.method;
    });
  });
  var freq = {}, unit = {};
  d.materials.forEach(function (m) {
    Object.keys(m._nums).forEach(function (s) { freq[s] = (freq[s] || 0) + 1; });
    m.fields.forEach(function (f) {
      if (f.units) { unit[f.subject] = unit[f.subject] || {}; unit[f.subject][f.units] = (unit[f.subject][f.units] || 0) + 1; }
    });
  });
  SUBJECTS = Object.keys(freq).filter(function (s) { return freq[s] >= 3 && propSubj[s]; })
    .sort(function (a, b) { return freq[b] - freq[a]; });
  var canon = d.canonicalUnits || {};
  Object.keys(unit).forEach(function (s) {
    UNIT_FOR[s] = canon[s] || Object.keys(unit[s]).sort(function (a, b) { return unit[s][b] - unit[s][a]; })[0];
  });
  document.getElementById("dataset-info").textContent =
    d.materialCount + " materials · compiled " + (d.generatedAt || "").slice(0, 10);
  route();
}).catch(function (e) {
  document.getElementById("app").innerHTML =
    "<p><b>Could not load material data</b> (" + esc(e.message) + ").<br>" +
    "Make sure <code>data/materials.js</code> exists, or serve this folder over HTTP.</p>";
});

window.addEventListener("hashchange", route);

/* ---------- helpers ---------- */
var FLOAT_RE = /-?\d*\.?\d+(?:e[+-]?\d+)?/i;
function parse_num(s) {
  if (s == null) return null;
  s = String(s).trim().replace(/,/g, "");
  if (s === "" || /^n\s*\/?\s*a$/i.test(s) || /no break/i.test(s)) return null;
  var m = s.match(/([\d.]+)\s*(?:±\s*[\d.]+\s*)?[x×·*]\s*10\s*\^?\s*([+-]?\d+)/);
  if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
  m = s.match(/(?:^|[^\d.])10\s*\^\s*([+-]?\d+)/);
  if (m) return Math.pow(10, parseInt(m[1], 10));
  var rng = s.match(new RegExp("(" + FLOAT_RE.source + ")\\s*[-–]\\s*(" + FLOAT_RE.source + ")", "i"));
  if (rng && !/±/.test(s)) return (parseFloat(rng[1]) + parseFloat(rng[2])) / 2;
  m = s.match(FLOAT_RE);
  return m ? parseFloat(m[0]) : null;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
function shortlabel(s) { return s.replace(" (In-Plane)", "").replace(" (Interlayer)", " (Z)"); }
function cell_val(raw) {
  if (!raw || raw.value == null || raw.value === "") return "";
  return esc(raw.value) + (raw.units ? " <span class='uval'>" + esc(raw.units) + "</span>" : "");
}

function get_params() {
  var h = location.hash.replace(/^#/, "");
  var qi = h.indexOf("?");
  return new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
}
function set_params(p, base) {
  var s = p.toString();
  location.hash = (base || "/") + (s ? "?" + s : "");
}

/* localStorage-backed state */
function load_set(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch (e) { return new Set(); } }
function load_arr(k) { try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function load_obj(k) { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } }
function save_json(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function load_cols() {
  try {
    var c = JSON.parse(localStorage.getItem("mtds_cols") || "null");
    if (c && c.length) {
      if (c[0].charAt(0) !== "@")                       // migrate legacy (property-only) column lists
        c = ["@check", "@mfr", "@product", "@material"].concat(c);
      return c;
    }
  } catch (e) {}
  return DEFAULT_COLS.slice();
}
function load_pins() {
  try {
    var p = JSON.parse(localStorage.getItem("mtds_col_pins") || "null");
    if (Array.isArray(p)) return p;
  } catch (e) {}
  return DEFAULT_PINS.slice();
}
function save_cols() { save_json("mtds_cols", COLS); save_json("mtds_col_pins", COL_PINS); }
function col_label(key) { return SPECIAL_COLS[key] ? SPECIAL_COLS[key].label : shortlabel(key); }
function col_sortkey(key) { return SPECIAL_COLS[key] ? SPECIAL_COLS[key].sort : key; }
function col_num(key) { return SPECIAL_COLS[key] ? SPECIAL_COLS[key].num : true; }
function save_tray() { save_json("mtds_tray", Array.from(TRAY)); render_compare_bar(); }

function render_compare_bar() {
  var b = document.getElementById("compare-bar");
  if (!TRAY.size) { b.innerHTML = ""; return; }
  b.innerHTML = '<a href="#/compare?ids=' + Array.from(TRAY).map(encodeURIComponent).join(",") +
    '">Compare <span class="count">' + TRAY.size + "</span></a> " +
    '<button class="linkish" style="color:#cfe0ff" id="clr-tray">clear</button>';
  document.getElementById("clr-tray").onclick = function () { TRAY.clear(); save_tray(); route(); };
}

/* ---------- router ---------- */
function route() {
  if (!DATA) return;
  render_compare_bar();
  var h = location.hash.replace(/^#/, "") || "/";
  var m = h.match(/^\/m\/(.+?)(\?|$)/);
  if (m) return view_detail(decodeURIComponent(m[1]));
  if (h.indexOf("/compare") === 0) return view_compare();
  return view_search();
}

/* ================= SEARCH ================= */
function view_search() {
  var p = get_params();
  var q = (p.get("q") || "").toLowerCase().trim();
  var fMan = new Set((p.get("man") || "").split(",").filter(Boolean));
  var fMat = new Set((p.get("mat") || "").split(",").filter(Boolean));
  var ranges = [];
  (p.get("r") || "").split(";").filter(Boolean).forEach(function (t) {
    var a = t.split("~");
    ranges.push({ subject: decodeURIComponent(a[0]), min: a[1] === "" || a[1] == null ? null : +a[1], max: a[2] === "" || a[2] == null ? null : +a[2] });
  });
  var sortKey = p.get("sort") || "";
  var sortDir = p.get("dir") || "asc";

  function pass(m) {
    if (q && (m.manufacturer + " " + m.productName + " " + m.material).toLowerCase().indexOf(q) < 0) return false;
    if (fMan.size && !fMan.has(m.manufacturer)) return false;
    if (fMat.size && !fMat.has(m.material)) return false;
    for (var i = 0; i < ranges.length; i++) {
      var v = m._nums[ranges[i].subject];
      if (v == null) return false;
      if (ranges[i].min != null && v < ranges[i].min) return false;
      if (ranges[i].max != null && v > ranges[i].max) return false;
    }
    return true;
  }
  var hits = DATA.materials.filter(pass);

  if (sortKey) {
    var meta = { manufacturer: 1, productName: 1, material: 1 };
    hits.sort(function (a, b) {
      if (meta[sortKey]) {
        var x = a[sortKey].toLowerCase(), y = b[sortKey].toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
      }
      var u = a._nums[sortKey], w = b._nums[sortKey];
      if (u == null) return 1; if (w == null) return -1;
      return u - w;
    });
    if (sortDir === "desc") hits.reverse();
  }

  var root = el('<div id="search"><div id="filters"></div><div id="results"></div></div>');
  var app = document.getElementById("app");
  app.innerHTML = ""; app.appendChild(root);
  var F = root.querySelector("#filters");
  var R = root.querySelector("#results");

  /* ---- text ---- */
  F.appendChild(el('<fieldset><legend>Text</legend>' +
    '<input type="text" id="q" placeholder="manufacturer / product / material" value="' + esc(p.get("q") || "") + '"></fieldset>'));
  var qEl = F.querySelector("#q");
  qEl.addEventListener("input", debounce(function () {
    RESTORE_Q = qEl.selectionStart;
    var np = get_params();
    qEl.value ? np.set("q", qEl.value) : np.delete("q");
    np.delete("sort"); np.delete("dir");
    set_params(np);
  }, 200));

  /* ---- facets ---- */
  F.appendChild(facet_block("Manufacturer", "man", fMan, count_by(hits, function (m) { return m.manufacturer; })));
  F.appendChild(facet_block("Material", "mat", fMat, count_by(hits, function (m) { return m.material; })));

  /* ---- property ranges ---- */
  var rf = el('<fieldset><legend>Property ranges</legend></fieldset>');
  function write_ranges() {
    var np = get_params();
    var s = ranges.map(function (r) { return encodeURIComponent(r.subject) + "~" + (r.min == null ? "" : r.min) + "~" + (r.max == null ? "" : r.max); }).join(";");
    s ? np.set("r", s) : np.delete("r");
    np.delete("sort"); np.delete("dir"); set_params(np);
  }
  ranges.forEach(function (r, i) {
    var row = el('<div class="rangerow"><span class="rl">' + esc(r.subject) +
      (UNIT_FOR[r.subject] ? ' <span class="uval">' + esc(UNIT_FOR[r.subject]) + "</span>" : "") + "</span>" +
      '<span class="inputs"><input type="number" step="any" placeholder="min" value="' + (r.min == null ? "" : r.min) + '">' +
      '<input type="number" step="any" placeholder="max" value="' + (r.max == null ? "" : r.max) + '">' +
      '<button title="remove">×</button></span></div>');
    var ins = row.querySelectorAll("input");
    ins[0].onchange = ins[1].onchange = function () {
      r.min = ins[0].value === "" ? null : +ins[0].value;
      r.max = ins[1].value === "" ? null : +ins[1].value;
      write_ranges();
    };
    row.querySelector("button").onclick = function () { ranges.splice(i, 1); write_ranges(); };
    rf.appendChild(row);
  });
  var avail = SUBJECTS.filter(function (s) { return !ranges.some(function (r) { return r.subject === s; }); });
  var add = el('<select><option value="">+ add property…</option>' +
    avail.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + "</select>");
  add.onchange = function () { if (add.value) { ranges.push({ subject: add.value, min: null, max: null }); write_ranges(); } };
  rf.appendChild(add);
  F.appendChild(rf);

  var reset = el('<button class="btn">Clear all filters</button>');
  reset.onclick = function () { location.hash = "/"; };
  F.appendChild(reset);

  /* ---- results toolbar ---- */
  var tb = el('<div class="toolbar"><span class="count">' + hits.length + " material" + (hits.length === 1 ? "" : "s") + "</span>" +
    '<button class="linkish" id="exp-csv">export CSV</button>' +
    '<button class="linkish" id="exp-json">export JSON</button>' +
    '<span class="small muted">(current results)</span></div>');
  R.appendChild(tb);
  tb.querySelector("#exp-csv").onclick = function () { export_rows(hits, "csv"); };
  tb.querySelector("#exp-json").onclick = function () { export_rows(hits, "json"); };

  /* ---- results table ---- */
  function sort_to(k) {
    if (!k) return;
    var np = get_params();
    if (sortKey === k && sortDir === "asc") np.set("dir", "desc");
    else if (sortKey === k && sortDir === "desc") { np.delete("sort"); np.delete("dir"); }
    else { np.set("sort", k); np.set("dir", "asc"); }
    set_params(np);
  }

  // pinned columns render first (contiguous left block); rest follow
  var pinnedCols = COLS.filter(function (k) { return COL_PINS.indexOf(k) >= 0; });
  var restCols = COLS.filter(function (k) { return COL_PINS.indexOf(k) < 0; });
  var view = pinnedCols.concat(restCols);
  var pinnedSet = {}; pinnedCols.forEach(function (k) { pinnedSet[k] = 1; });

  var wrap = el('<div class="wrap"></div>');
  var t = document.createElement("table");
  t.className = "data cfg";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  view.forEach(function (key) { htr.appendChild(col_header(key, pinnedSet[key])); });
  htr.appendChild(add_col_cell());
  thead.appendChild(htr);
  t.appendChild(thead);

  var tbody = document.createElement("tbody");
  hits.slice(0, 500).forEach(function (m) {
    var tr = document.createElement("tr");
    tr.innerHTML = view.map(function (key) { return body_cell(key, m); }).join("") + "<td></td>";
    var cb = tr.querySelector("input[type=checkbox]");
    if (cb) cb.onchange = function (e) { e.target.checked ? TRAY.add(m.id) : TRAY.delete(m.id); save_tray(); };
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  wrap.appendChild(t);
  R.appendChild(wrap);
  if (hits.length > 500) R.appendChild(el('<p class="small muted">showing first 500; narrow the filters to see the rest.</p>'));
  R.appendChild(el('<p class="small muted">Drag a column header to reorder. <b>📍</b> pins it to the left (pinned columns stack and stay visible while scrolling sideways). <b>×</b> removes it; <b>+</b> adds one. Saved in this browser.</p>'));

  /* stack pinned columns at the left edge */
  var left = 0;
  var ths = thead.querySelectorAll("th");
  for (var pi = 0; pi < pinnedCols.length; pi++) {
    var w = ths[pi].getBoundingClientRect().width;
    apply_sticky_col(t, pi, left);
    left += w;
  }

  /* restore text-search caret after a re-render triggered by typing */
  if (RESTORE_Q != null) {
    qEl.focus();
    try { qEl.setSelectionRange(RESTORE_Q, RESTORE_Q); } catch (e) {}
    RESTORE_Q = null;
  }

  function col_header(key, pinned) {
    var th = document.createElement("th");
    th.dataset.key = key;
    th.draggable = true;
    if (col_num(key)) th.className = "num";
    if (pinned) th.classList.add("pincol");
    var sk = col_sortkey(key);
    var arrow = sk && sortKey === sk ? (sortDir === "desc" ? " ▼" : " ▲") : "";
    var span = el("<span class='hl'>" + esc(col_label(key) || " ") + "<span class='ind'>" + arrow + "</span></span>");
    if (sk) span.onclick = function () { sort_to(sk); }; else span.style.cursor = "default";
    th.appendChild(span);
    var ctl = el("<span class='colctl'>" +
      "<button class='pin" + (pinned ? " on" : "") + "' title='" + (pinned ? "unpin" : "pin to left") + "'>" + (pinned ? "📌" : "📍") + "</button>" +
      "<button class='rm' title='remove column'>×</button></span>");
    ctl.querySelector(".pin").onclick = function (e) {
      e.stopPropagation();
      if (pinned) COL_PINS = COL_PINS.filter(function (x) { return x !== key; });
      else COL_PINS.push(key);
      save_cols(); route();
    };
    ctl.querySelector(".rm").onclick = function (e) {
      e.stopPropagation();
      COLS = COLS.filter(function (x) { return x !== key; });
      COL_PINS = COL_PINS.filter(function (x) { return x !== key; });
      save_cols(); route();
    };
    th.appendChild(ctl);

    th.addEventListener("dragstart", function (e) {
      DRAG_COL = { key: key, pinned: pinned };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", key); } catch (x) {}
    });
    th.addEventListener("dragover", function (e) { e.preventDefault(); th.classList.add("dropcol"); });
    th.addEventListener("dragleave", function () { th.classList.remove("dropcol"); });
    th.addEventListener("drop", function (e) {
      e.preventDefault(); th.classList.remove("dropcol");
      if (!DRAG_COL || DRAG_COL.key === key || DRAG_COL.pinned !== pinned) return;
      var arr = view.slice();
      arr.splice(arr.indexOf(DRAG_COL.key), 1);
      arr.splice(arr.indexOf(key), 0, DRAG_COL.key);
      COLS = arr; save_cols(); route();
    });
    return th;
  }

  function body_cell(key, m) {
    if (key === "@check") return "<td class='chk'><input type='checkbox'" + (TRAY.has(m.id) ? " checked" : "") + "></td>";
    if (key === "@mfr") return "<td>" + esc(m.manufacturer) + "</td>";
    if (key === "@product") return '<td><a href="#/m/' + encodeURIComponent(m.id) + '">' + esc(m.productName) + "</a></td>";
    if (key === "@material") return "<td>" + esc(m.material) + "</td>";
    return "<td class='num'>" + cell_val(m._raw[key]) + "</td>";
  }

  function add_col_cell() {
    var th = document.createElement("th");
    th.className = "nosort addcol";
    th.title = "add column";
    th.textContent = "+";
    th.onclick = function () {
      var pool = ["@check", "@mfr", "@product", "@material"].filter(function (k) { return COLS.indexOf(k) < 0; })
        .concat(SUBJECTS.filter(function (s) { return COLS.indexOf(s) < 0; }));
      var sel = el('<select><option value="">add column…</option>' +
        pool.map(function (s) { return '<option value="' + esc(s) + '">' + esc(col_label(s) || s) + "</option>"; }).join("") + "</select>");
      sel.onchange = function () { if (sel.value) { COLS.push(sel.value); save_cols(); route(); } };
      sel.onblur = function () { route(); };
      th.textContent = ""; th.appendChild(sel); sel.focus();
    };
    return th;
  }
}
var DRAG_COL = null;

/* mark column `ci` (0-based, in render order) as sticky-left at `leftPx` */
function apply_sticky_col(table, ci, leftPx) {
  table.querySelectorAll("tr").forEach(function (tr) {
    var cell = tr.children[ci];
    if (!cell) return;
    cell.classList.add("pincol");
    cell.style.position = "sticky";
    cell.style.left = leftPx + "px";
  });
}

/* facet block: collapsed = top N by count (+ any selected), expanded = all alphabetical */
function facet_block(title, param, selected, counts) {
  var fs = el('<fieldset><legend>' + esc(title) + "</legend></fieldset>");
  var all = Object.keys(counts);
  var byCount = all.slice().sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
  var open = !!FACET_OPEN[param];
  var shown;
  if (open) {
    shown = all.slice().sort();
  } else {
    var top = byCount.slice(0, FACET_COLLAPSED);
    selected.forEach(function (s) { if (top.indexOf(s) < 0 && all.indexOf(s) >= 0) top.push(s); });
    shown = top.sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
  }
  shown.forEach(function (k) {
    var row = el('<label class="facet"><span><input type="checkbox" ' + (selected.has(k) ? "checked" : "") +
      "> " + esc(k) + '</span><span class="n">' + counts[k] + "</span></label>");
    row.querySelector("input").onchange = function (e) {
      var np = get_params();
      var cur = new Set((np.get(param) || "").split(",").filter(Boolean));
      e.target.checked ? cur.add(k) : cur.delete(k);
      cur.size ? np.set(param, Array.from(cur).join(",")) : np.delete(param);
      np.delete("sort"); np.delete("dir"); set_params(np);
    };
    fs.appendChild(row);
  });
  if (all.length > FACET_COLLAPSED) {
    var tgl = el('<button class="linkish facet-toggle">' +
      (open ? "▾ show fewer" : "▸ show all " + all.length) + "</button>");
    tgl.onclick = function () { FACET_OPEN[param] = !open; save_json("mtds_facet_open", FACET_OPEN); route(); };
    fs.appendChild(tgl);
  }
  return fs;
}
function count_by(hits, keyfn) {
  var c = {};
  hits.forEach(function (m) { var k = keyfn(m); if (k) c[k] = (c[k] || 0) + 1; });
  return c;
}

/* ================= DETAIL ================= */
function view_detail(id) {
  var m = BY_ID[id];
  var A = document.getElementById("app");
  if (!m) { A.innerHTML = '<p>Unknown material. <a href="#/">back to search</a></p>'; return; }

  var cats = [];
  m.fields.forEach(function (f) { if (cats.indexOf(f.category) < 0) cats.push(f.category); });
  var have = CORE.filter(function (s) { return m._nums[s] != null; }).length;
  var pct = Math.round(100 * have / CORE.length);
  var inTray = TRAY.has(m.id);

  var html = '<p class="small"><a href="#/">&larr; search</a></p>' +
    "<h1>" + esc(m.manufacturer) + " " + esc(m.productName) + "</h1>" +
    '<p class="kv"><b>Material</b> ' + esc(m.material) + "</p>" +
    '<p class="kv"><b>Core data</b> <span class="completeness"><i style="width:' + pct + '%"></i></span> ' +
    have + " of " + CORE.length + " core properties</p>" +
    '<p><button class="btn" id="tray-toggle">' + (inTray ? "Remove from compare" : "Add to compare") + "</button> " +
    '<button class="linkish" id="dl-json">download this material as JSON</button></p>';

  cats.forEach(function (cat) {
    html += "<h2>" + esc(cat) + "</h2>" +
      '<div class="wrap"><table class="data"><thead><tr>' +
      "<th class='nosort'>Subject</th><th class='nosort'>Method</th><th class='nosort num'>Value</th>" +
      "<th class='nosort'>Units</th><th class='nosort'>Note / source</th></tr></thead><tbody>";
    m.fields.filter(function (f) { return f.category === cat; }).forEach(function (f) {
      var note = [];
      if (f.methodNote) note.push("method: " + esc(f.methodNote));
      if (f.valueNote) note.push(esc(f.valueNote));
      if (f.unitsNote) note.push("units: " + esc(f.unitsNote));
      html += "<tr><td class='sub'>" + esc(f.subject) + "</td>" +
        "<td>" + esc(f.method || "") + "</td>" +
        "<td class='num'>" + esc(f.value || "") + "</td>" +
        "<td>" + esc(f.units || "") + "</td>" +
        "<td class='annot small'>" + note.join(" &middot; ") + "</td></tr>";
    });
    html += "</tbody></table></div>";
  });

  if (m.sources && m.sources.length) {
    html += "<h2>Sources</h2><ul class='srclist small'>";
    m.sources.forEach(function (s) {
      html += "<li>" + esc(s.type || "doc") + " &mdash; " +
        (s.url && /^https?:/.test(s.url) ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + "</a>" : esc(s.url || "")) + "</li>";
    });
    html += "</ul>";
  }
  html += '<p class="small muted">Source file: <code>MTDS Materials/' + esc(m.file) + "</code></p>";

  A.innerHTML = html;
  document.getElementById("tray-toggle").onclick = function () {
    inTray ? TRAY.delete(m.id) : TRAY.add(m.id); save_tray(); view_detail(id);
  };
  document.getElementById("dl-json").onclick = function () {
    download(m.manufacturer + " " + m.productName + ".json", JSON.stringify(m, null, 2), "application/json");
  };
}

/* ================= COMPARE ================= */
function view_compare() {
  var p = get_params();
  var ids = (p.get("ids") || Array.from(TRAY).join(",")).split(",").filter(Boolean);
  var mats = ids.map(function (i) { return BY_ID[decodeURIComponent(i)]; }).filter(Boolean);
  var A = document.getElementById("app");
  if (mats.length < 2) {
    A.innerHTML = "<h1>Compare</h1><p>Add at least two materials (checkboxes in search results, or " +
      '"Add to compare" on a detail page). <a href="#/">search</a></p>';
    return;
  }

  var order = [], seen = {};
  mats.forEach(function (m) {
    m.fields.forEach(function (f) {
      var k = f.category + "||" + f.subject;
      if (!seen[k]) { seen[k] = 1; order.push({ cat: f.category, sub: f.subject }); }
    });
  });

  var html = '<p class="small"><a href="#/">&larr; search</a></p><h1>Compare (' + mats.length + ")</h1>" +
    "<p>" + mats.map(function (m) {
      return '<span class="pill">' + esc(m.manufacturer + " " + m.productName) +
        ' <button data-id="' + esc(m.id) + '" title="remove">×</button></span>';
    }).join(" ") + "</p>" +
    '<div class="wrap"><table class="data compare"><thead><tr><th class="sticky nosort">Property</th>' +
    mats.map(function (m) { return '<th class="nosort"><a href="#/m/' + encodeURIComponent(m.id) + '">' + esc(m.manufacturer + " " + m.productName) + "</a></th>"; }).join("") +
    "</tr></thead><tbody>";

  var curCat = null;
  order.forEach(function (o) {
    if (o.cat !== curCat) {
      curCat = o.cat;
      html += '<tr class="catrow"><td class="sticky sub" colspan="' + (mats.length + 1) + '">' + esc(o.cat) + "</td></tr>";
    }
    var cells = mats.map(function (m) {
      var f = m.fields.find(function (x) { return x.category === o.cat && x.subject === o.sub; });
      var n = f ? (f.valueCanonical != null ? f.valueCanonical : parse_num(f.value)) : null;
      return { f: f, n: n, method: f ? f.method : null };
    });
    var nums = cells.map(function (c) { return c.n; }).filter(function (n) { return n != null; });
    var best = null;
    if (nums.length >= 2) {
      var strengthy = /Strength|Modulus|Impact|Elongation|Adhesion|Temperature|Resistivity|Hardness/.test(o.sub);
      best = strengthy ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    }
    var vals = cells.map(function (c) { return c.f ? (c.f.value || "") + "|" + (c.f.units || "") : ""; });
    var allSame = vals[0] !== "" && vals.every(function (v) { return v === vals[0]; });
    var methods = cells.map(function (c) { return c.method || ""; }).filter(Boolean);
    var methodClash = methods.length > 1 && !methods.every(function (x) { return x === methods[0]; });

    html += "<tr" + (methodClash ? ' class="warn"' : "") + ">" +
      '<td class="sticky sub">' + esc(o.sub) + (methodClash ? ' <span class="annot small">⚠ method differs</span>' : "") + "</td>" +
      cells.map(function (c) {
        var cls = [];
        if (best != null && c.n === best) cls.push("hit");
        else if (allSame) cls.push("same");
        var txt = c.f
          ? esc(c.f.value || "") + (c.f.units ? " <span class='uval'>" + esc(c.f.units) + "</span>" : "") +
            (c.f.methodNote ? " <span class='annot small'>(" + esc(c.f.methodNote) + ")</span>" : "")
          : "<span class='muted'>&mdash;</span>";
        return "<td class='" + cls.join(" ") + "'>" + txt + "</td>";
      }).join("") + "</tr>";
  });
  html += "</tbody></table></div>" +
    '<p class="small"><button class="linkish" id="cmp-csv">export CSV</button></p>' +
    '<p class="small muted">Highlight = best in row (max for strength / stiffness / temperature, min otherwise). ' +
    "Grey = identical. Yellow row = the materials cite different test methods.</p>";

  A.innerHTML = html;
  A.querySelectorAll(".pill button").forEach(function (b) {
    b.onclick = function () {
      var keep = mats.map(function (m) { return m.id; }).filter(function (x) { return x !== b.dataset.id; });
      TRAY.delete(b.dataset.id); save_tray();
      var np = new URLSearchParams(); if (keep.length) np.set("ids", keep.map(encodeURIComponent).join(","));
      set_params(np, "/compare");
    };
  });
  document.getElementById("cmp-csv").onclick = function () {
    var rows = [["Category", "Property"].concat(mats.map(function (m) { return m.manufacturer + " " + m.productName; }))];
    order.forEach(function (o) {
      rows.push([o.cat, o.sub].concat(mats.map(function (m) {
        var f = m.fields.find(function (x) { return x.category === o.cat && x.subject === o.sub; });
        return f ? (f.value || "") + (f.units ? " " + f.units : "") : "";
      })));
    });
    download("compare.csv", to_csv(rows), "text/csv");
  };
}

/* ---------- export / util ---------- */
function export_rows(mats, kind) {
  if (kind === "json") {
    download("materials.json", JSON.stringify(mats.map(function (m) {
      return { id: m.id, manufacturer: m.manufacturer, productName: m.productName, material: m.material, fields: m.fields, sources: m.sources };
    }), null, 2), "application/json");
    return;
  }
  var cols = COLS.filter(function (k) { return k !== "@check"; });
  var header = cols.map(function (k) {
    if (SPECIAL_COLS[k]) return SPECIAL_COLS[k].label;
    return k + (UNIT_FOR[k] ? " (" + UNIT_FOR[k] + ")" : "");
  });
  var rows = [header];
  mats.forEach(function (m) {
    rows.push(cols.map(function (k) {
      if (k === "@mfr") return m.manufacturer;
      if (k === "@product") return m.productName;
      if (k === "@material") return m.material;
      return m._raw[k] ? (m._raw[k].value || "") : "";
    }));
  });
  download("materials.csv", to_csv(rows), "text/csv");
}
function to_csv(rows) {
  return rows.map(function (r) {
    return r.map(function (c) {
      c = String(c == null ? "" : c);
      return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }).join(",");
  }).join("\n");
}
function download(name, text, mime) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
