"use strict";
/* MonkeyTDS frontend — no framework, no build step.
   Views (hash-routed):
     #/?<filters>          faceted search + results table
     #/m/<id>              material detail
     #/compare?ids=a,b,c   comparison matrix
   Filter/sort state lives in the URL; column choice + facet expansion live in
   localStorage (per browser). */

var DEFAULT_COLS = [
  "Density", "Tensile Strength (In-Plane)", "Young's Modulus (In-Plane)",
  "Heat Deflection Temperature", "Breaking Elongation Rate (In-Plane)"
];
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
var COLS = load_cols();             // chosen result columns
var FACET_OPEN = load_obj("mtds_facet_open");
var CMP_ORDER = load_arr("mtds_cmp_order");   // compare-view row order ("cat||subject" keys)
var CMP_PINS = load_arr("mtds_cmp_pins");     // compare-view pinned rows (top-to-bottom)
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
    if (c && c.length) return c;
  } catch (e) {}
  return DEFAULT_COLS.slice();
}
function save_cols() { save_json("mtds_cols", COLS); }
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
    var np = get_params();
    if (sortKey === k && sortDir === "asc") np.set("dir", "desc");
    else if (sortKey === k && sortDir === "desc") { np.delete("sort"); np.delete("dir"); }
    else { np.set("sort", k); np.set("dir", "asc"); }
    set_params(np);
  }
  var wrap = el('<div class="wrap"></div>');
  var t = document.createElement("table");
  t.className = "data";
  var thead = document.createElement("thead");
  var htr = document.createElement("tr");
  htr.appendChild(document.createElement("th"));
  [["Manufacturer", "manufacturer"], ["Product", "productName"], ["Material", "material"]].forEach(function (c) {
    htr.appendChild(head_cell(c[0], c[1], sortKey, sortDir, false, sort_to));
  });
  COLS.forEach(function (c, i) {
    htr.appendChild(head_cell(shortlabel(c), c, sortKey, sortDir, true, sort_to, i));
  });
  htr.appendChild(add_col_cell());
  thead.appendChild(htr);
  t.appendChild(thead);

  var tbody = document.createElement("tbody");
  hits.slice(0, 500).forEach(function (m) {
    var tr = document.createElement("tr");
    tr.innerHTML = "<td><input type='checkbox'" + (TRAY.has(m.id) ? " checked" : "") + "></td>" +
      "<td>" + esc(m.manufacturer) + "</td>" +
      '<td><a href="#/m/' + encodeURIComponent(m.id) + '">' + esc(m.productName) + "</a></td>" +
      "<td>" + esc(m.material) + "</td>" +
      COLS.map(function (c) { return "<td class='num'>" + cell_val(m._raw[c]) + "</td>"; }).join("") +
      "<td></td>";
    tr.querySelector("input").onchange = function (e) {
      e.target.checked ? TRAY.add(m.id) : TRAY.delete(m.id); save_tray();
    };
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  wrap.appendChild(t);
  R.appendChild(wrap);
  if (hits.length > 500) R.appendChild(el('<p class="small muted">showing first 500; narrow the filters to see the rest.</p>'));

  /* restore text-search caret after a re-render triggered by typing */
  if (RESTORE_Q != null) {
    qEl.focus();
    try { qEl.setSelectionRange(RESTORE_Q, RESTORE_Q); } catch (e) {}
    RESTORE_Q = null;
  }

  function add_col_cell() {
    var th = document.createElement("th");
    th.className = "nosort addcol";
    th.title = "add column";
    th.textContent = "+";
    th.onclick = function () {
      var pool = SUBJECTS.filter(function (s) { return COLS.indexOf(s) < 0; });
      var sel = el('<select><option value="">add column…</option>' +
        pool.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + "</select>");
      sel.onchange = function () { if (sel.value) { COLS.push(sel.value); save_cols(); route(); } };
      sel.onblur = function () { route(); };
      th.textContent = ""; th.appendChild(sel); sel.focus();
    };
    return th;
  }
}

function head_cell(label, key, sortKey, sortDir, num, sort_to, colIdx) {
  var th = document.createElement("th");
  if (num) th.className = "num";
  var arrow = sortKey === key ? (sortDir === "desc" ? " ▼" : " ▲") : "";
  var span = el("<span class='hl'>" + esc(label) + "<span class='ind'>" + arrow + "</span></span>");
  span.onclick = function () { sort_to(key); };
  th.appendChild(span);
  if (colIdx != null) {
    var ctl = el("<span class='colctl'>" +
      "<button title='move left'>‹</button><button title='move right'>›</button><button title='remove'>×</button></span>");
    var bs = ctl.querySelectorAll("button");
    bs[0].onclick = function (e) { e.stopPropagation(); if (colIdx > 0) { swap(COLS, colIdx, colIdx - 1); save_cols(); route(); } };
    bs[1].onclick = function (e) { e.stopPropagation(); if (colIdx < COLS.length - 1) { swap(COLS, colIdx, colIdx + 1); save_cols(); route(); } };
    bs[2].onclick = function (e) { e.stopPropagation(); COLS.splice(colIdx, 1); save_cols(); route(); };
    th.appendChild(ctl);
  }
  return th;
}
function swap(a, i, j) { var t = a[i]; a[i] = a[j]; a[j] = t; }

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

  var rowMap = {};
  mats.forEach(function (m) {
    m.fields.forEach(function (f) {
      var k = f.category + "||" + f.subject;
      if (!rowMap[k]) rowMap[k] = { cat: f.category, sub: f.subject, key: k };
    });
  });
  var allKeys = Object.keys(rowMap);

  var pinned = CMP_PINS.filter(function (k) { return rowMap[k]; });
  var pinnedSet = {}; pinned.forEach(function (k) { pinnedSet[k] = 1; });
  var mainKeys = [];
  CMP_ORDER.forEach(function (k) { if (rowMap[k] && !pinnedSet[k] && mainKeys.indexOf(k) < 0) mainKeys.push(k); });
  allKeys.forEach(function (k) { if (!pinnedSet[k] && mainKeys.indexOf(k) < 0) mainKeys.push(k); });

  function row_html(k, isPinned) {
    var o = rowMap[k];
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

    var tools = '<span class="rowtools">' +
      '<button class="drag" title="drag to reorder">↕</button>' +
      '<button class="pin' + (isPinned ? " on" : "") + '" data-key="' + esc(k) + '" title="' +
      (isPinned ? "unpin" : "pin (stays visible while scrolling)") + '">' + (isPinned ? "📌" : "📍") + "</button></span>";

    return '<tr data-key="' + esc(k) + '" draggable="true" class="' + (isPinned ? "pinned " : "") + (methodClash ? "warn" : "") + '">' +
      '<td class="sticky sub" title="' + esc(o.cat) + '">' + tools + esc(o.sub) +
        (methodClash ? ' <span class="annot small">⚠ method differs</span>' : "") + "</td>" +
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
  }

  var html = '<p class="small"><a href="#/">&larr; search</a></p><h1>Compare (' + mats.length + ")</h1>" +
    "<p>" + mats.map(function (m) {
      return '<span class="pill">' + esc(m.manufacturer + " " + m.productName) +
        ' <button data-id="' + esc(m.id) + '" title="remove">×</button></span>';
    }).join(" ") + "</p>" +
    '<div class="wrap"><table class="data compare"><thead><tr><th class="sticky nosort">Property</th>' +
    mats.map(function (m) { return '<th class="nosort"><a href="#/m/' + encodeURIComponent(m.id) + '">' + esc(m.manufacturer + " " + m.productName) + "</a></th>"; }).join("") +
    "</tr></thead><tbody>";

  pinned.forEach(function (k) { html += row_html(k, true); });
  if (pinned.length) html += '<tr class="pinsep"><td colspan="' + (mats.length + 1) + '"></td></tr>';
  var grouped = CMP_ORDER.length === 0;   // show category headers only in the default order
  var curCat = null;
  mainKeys.forEach(function (k) {
    var o = rowMap[k];
    if (grouped && o.cat !== curCat) {
      curCat = o.cat;
      html += '<tr class="catrow"><td class="sticky sub" colspan="' + (mats.length + 1) + '">' + esc(o.cat) + "</td></tr>";
    }
    html += row_html(k, false);
  });
  html += "</tbody></table></div>" +
    '<p class="small"><button class="linkish" id="cmp-csv">export CSV</button>' +
    (CMP_PINS.length || CMP_ORDER.length ? ' &middot; <button class="linkish" id="cmp-reset">reset layout</button>' : "") + "</p>" +
    '<p class="small muted">Drag <b>↕</b> to reorder rows. <b>📍</b> pins a row so it stays visible while you scroll ' +
    "(pinned rows stack under the header). Highlight = best in row; grey = identical; yellow = different test methods.</p>";

  A.innerHTML = html;

  A.querySelectorAll(".pill button").forEach(function (b) {
    b.onclick = function () {
      var keep = mats.map(function (m) { return m.id; }).filter(function (x) { return x !== b.dataset.id; });
      TRAY.delete(b.dataset.id); save_tray();
      var np = new URLSearchParams(); if (keep.length) np.set("ids", keep.map(encodeURIComponent).join(","));
      set_params(np, "/compare");
    };
  });
  A.querySelectorAll("button.pin").forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.key;
      if (pinnedSet[k]) CMP_PINS = CMP_PINS.filter(function (x) { return x !== k; });
      else CMP_PINS.push(k);
      save_json("mtds_cmp_pins", CMP_PINS);
      view_compare();
    };
  });
  var rst = document.getElementById("cmp-reset");
  if (rst) rst.onclick = function () { CMP_PINS = []; CMP_ORDER = []; save_json("mtds_cmp_pins", CMP_PINS); save_json("mtds_cmp_order", CMP_ORDER); view_compare(); };
  document.getElementById("cmp-csv").onclick = function () {
    var rows = [["Category", "Property"].concat(mats.map(function (m) { return m.manufacturer + " " + m.productName; }))];
    pinned.concat(mainKeys).forEach(function (k) {
      var o = rowMap[k];
      rows.push([o.cat, o.sub].concat(mats.map(function (m) {
        var f = m.fields.find(function (x) { return x.category === o.cat && x.subject === o.sub; });
        return f ? (f.value || "") + (f.units ? " " + f.units : "") : "";
      })));
    });
    download("compare.csv", to_csv(rows), "text/csv");
  };

  /* drag-to-reorder */
  var dragKey = null, dragPinned = false;
  A.querySelectorAll("tbody tr[data-key]").forEach(function (tr) {
    tr.addEventListener("dragstart", function (e) {
      dragKey = tr.dataset.key; dragPinned = tr.classList.contains("pinned");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragKey); } catch (x) {}
    });
    tr.addEventListener("dragover", function (e) { e.preventDefault(); tr.classList.add("dragover"); });
    tr.addEventListener("dragleave", function () { tr.classList.remove("dragover"); });
    tr.addEventListener("drop", function (e) {
      e.preventDefault(); tr.classList.remove("dragover");
      var tgt = tr.dataset.key, tgtPinned = tr.classList.contains("pinned");
      if (!dragKey || dragKey === tgt) return;
      var arr = (dragPinned && tgtPinned) ? CMP_PINS.slice() : (!dragPinned && !tgtPinned) ? mainKeys.slice() : null;
      if (!arr) return;
      arr.splice(arr.indexOf(dragKey), 1);
      arr.splice(arr.indexOf(tgt), 0, dragKey);
      if (dragPinned) { CMP_PINS = arr; save_json("mtds_cmp_pins", CMP_PINS); }
      else { CMP_ORDER = arr; save_json("mtds_cmp_order", CMP_ORDER); }
      view_compare();
    });
  });

  /* stack pinned rows under the sticky header */
  var thead = A.querySelector("thead");
  var top = thead ? thead.offsetHeight : 0;
  var prows = A.querySelectorAll("tbody tr.pinned");
  var heights = [];
  prows.forEach(function (tr) { heights.push(tr.getBoundingClientRect().height); });
  prows.forEach(function (tr, i) {
    tr.querySelectorAll("td").forEach(function (td) { td.style.position = "sticky"; td.style.top = top + "px"; });
    top += heights[i];
  });
}

/* ---------- export / util ---------- */
function export_rows(mats, kind) {
  if (kind === "json") {
    download("materials.json", JSON.stringify(mats.map(function (m) {
      return { id: m.id, manufacturer: m.manufacturer, productName: m.productName, material: m.material, fields: m.fields, sources: m.sources };
    }), null, 2), "application/json");
    return;
  }
  var header = ["Manufacturer", "Product", "Material"].concat(COLS.map(function (c) { return c + (UNIT_FOR[c] ? " (" + UNIT_FOR[c] + ")" : ""); }));
  var rows = [header];
  mats.forEach(function (m) {
    rows.push([m.manufacturer, m.productName, m.material].concat(COLS.map(function (c) {
      return m._raw[c] ? (m._raw[c].value || "") : "";
    })));
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
