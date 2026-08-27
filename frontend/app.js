"use strict";
/* MonkeyTDS frontend — no framework, no build step.
   Views (hash-routed):
     #/?<filters>          faceted search + results table
     #/m/<id>              material detail
     #/compare?ids=a,b,c   comparison matrix
   All filter/sort state lives in the URL so any view is a shareable link. */

var DATA = null;                    // {schema, generatedAt, materials:[...]}
var BY_ID = {};                     // id -> material
var SUBJECTS = [];                  // subjects that carry numbers, by frequency
var UNIT_FOR = {};                  // subject -> most common unit
var TRAY = load_tray();             // Set of ids queued for compare

var DEFAULT_COLS = [
  "Density", "Tensile Strength (In-Plane)", "Young's Modulus (In-Plane)",
  "Heat Deflection Temperature", "Breaking Elongation Rate (In-Plane)"
];
/* core properties used for the per-material "completeness" bar */
var CORE = [
  "Density", "Melt Index", "Glass Transition Temperature", "Heat Deflection Temperature",
  "Tensile Strength (In-Plane)", "Tensile Strength (Interlayer)",
  "Young's Modulus (In-Plane)", "Young's Modulus (Interlayer)",
  "Breaking Elongation Rate (In-Plane)", "Bending Strength (In-Plane)",
  "Bending Modulus (In-Plane)", "Impact Strength (In-Plane)"
];

/* ---------- data loading ----------
   data/materials.js sets window.__MTDS_DATA__ (works from file:// too);
   fall back to fetching the .json if only that was regenerated. */
(window.__MTDS_DATA__
  ? Promise.resolve(window.__MTDS_DATA__)
  : fetch("data/materials.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
)
  .then(function (d) {
    DATA = d;
    var PROP_CATS = { "Physical Property": 1, "Mechanical Property": 1, "Chemical Property": 1, "Electrical Property": 1, "Magnetic Property": 1 };
    var propSubj = {};                 // subject -> seen in a property category
    d.materials.forEach(function (m) {
      BY_ID[m.id] = m;
      m._nums = {};                 // subject -> representative number
      m._methods = {};              // subject -> method string (first seen)
      m.fields.forEach(function (f) {
        f.subject = f.subject.replace(/[’‘`]/g, "'");   // normalise apostrophes
        if (PROP_CATS[f.category]) propSubj[f.subject] = 1;
        var n = parse_num(f.value);
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
    Object.keys(unit).forEach(function (s) {
      UNIT_FOR[s] = Object.keys(unit[s]).sort(function (a, b) { return unit[s][b] - unit[s][a]; })[0];
    });
    document.getElementById("dataset-info").textContent =
      d.materialCount + " materials · compiled " + (d.generatedAt || "").slice(0, 10);
    route();
  })
  .catch(function (e) {
    document.getElementById("app").innerHTML =
      "<p><b>Could not load material data</b> (" + esc(e.message) + ").<br>" +
      "Make sure <code>data/materials.js</code> exists, or serve this folder over HTTP " +
      "(<code>python -m http.server</code> in <code>frontend/</code>).</p>";
  });

window.addEventListener("hashchange", route);

/* ---------- helpers ---------- */
function parse_num(s) {
  if (s == null) return null;
  s = String(s).trim().replace(/,/g, "");
  if (s === "" || /^n\/?a$/i.test(s) || /no break/i.test(s)) return null;
  s = s.replace(/\s*[x×]\s*10\s*\^?\s*([+-]?\d+)/gi, "e$1");   // 2.2 x 10^4 -> 2.2e4
  var rng = s.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*[-–]\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)/i);
  if (rng && !/±/.test(s)) return (parseFloat(rng[1]) + parseFloat(rng[2])) / 2;
  var m = s.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
  return m ? parseFloat(m[0]) : null;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
function fmt(n) {
  if (n == null) return "";
  var a = Math.abs(n);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return n.toExponential(2);
  return (Math.round(n * 1000) / 1000).toString();
}

/* URL state: everything after "#/" or "#/compare" is a query string */
function get_params() {
  var h = location.hash.replace(/^#/, "");
  var qi = h.indexOf("?");
  return new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
}
function set_params(p, base) {
  var s = p.toString();
  location.hash = (base || "/") + (s ? "?" + s : "");
}

/* compare tray persistence */
function load_tray() {
  try { return new Set(JSON.parse(localStorage.getItem("mtds_tray") || "[]")); }
  catch (e) { return new Set(); }
}
function save_tray() {
  try { localStorage.setItem("mtds_tray", JSON.stringify([].concat.apply([], [Array.from(TRAY)]))); } catch (e) {}
  render_compare_bar();
}
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
  var ranges = [];                            // [{subject,min,max}]
  (p.get("r") || "").split(";").filter(Boolean).forEach(function (t) {
    var a = t.split("~"); ranges.push({ subject: decodeURIComponent(a[0]), min: a[1] === "" ? null : +a[1], max: a[2] === "" ? null : +a[2] });
  });
  var sortKey = p.get("sort") || "";
  var sortDir = p.get("dir") || "asc";

  function pass(m) {
    if (q) {
      var hay = (m.manufacturer + " " + m.productName + " " + m.material).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
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

  // sort
  if (sortKey) {
    hits.sort(function (a, b) {
      var x, y;
      if (sortKey === "manufacturer" || sortKey === "productName" || sortKey === "material") {
        x = a[sortKey].toLowerCase(); y = b[sortKey].toLowerCase();
        return x < y ? -1 : x > y ? 1 : 0;
      }
      x = a._nums[sortKey]; y = b._nums[sortKey];
      if (x == null) return 1; if (y == null) return -1;
      return x - y;
    });
    if (sortDir === "desc") hits.reverse();
  }

  // ---- build page ----
  var root = el('<div id="search"><div id="filters"></div><div id="results"></div></div>');
  document.getElementById("app").innerHTML = "";
  document.getElementById("app").appendChild(root);

  /* filter rail */
  var F = root.querySelector("#filters");
  F.appendChild(el('<fieldset><legend>Text</legend>' +
    '<input type="text" id="q" placeholder="manufacturer / product / material" value="' + esc(p.get("q") || "") + '"></fieldset>'));
  F.querySelector("#q").addEventListener("input", debounce(function (e) {
    var np = get_params(); e.target.value ? np.set("q", e.target.value) : np.delete("q"); np.delete("sort"); set_params(np);
  }, 250));

  F.appendChild(facet_block("Manufacturer", "man", fMan, count_by(hits, function (m) { return m.manufacturer; })));
  F.appendChild(facet_block("Material", "mat", fMat, count_by(hits, function (m) { return m.material; })));

  /* property range filters */
  var rf = el('<fieldset><legend>Property ranges</legend></fieldset>');
  ranges.forEach(function (r, i) {
    var row = el('<div class="rangerow"><span>' + esc(r.subject) +
      ' <span class="unit">' + esc(UNIT_FOR[r.subject] || "") + '</span></span>' +
      '<span class="inputs"><input type="number" step="any" placeholder="min" value="' + (r.min == null ? "" : r.min) + '">' +
      '<input type="number" step="any" placeholder="max" value="' + (r.max == null ? "" : r.max) + '">' +
      '<button title="remove">×</button></span></div>');
    var ins = row.querySelectorAll("input");
    ins[0].onchange = ins[1].onchange = function () {
      ranges[i].min = ins[0].value === "" ? null : +ins[0].value;
      ranges[i].max = ins[1].value === "" ? null : +ins[1].value;
      write_ranges(ranges);
    };
    row.querySelector("button").onclick = function () { ranges.splice(i, 1); write_ranges(ranges); };
    rf.appendChild(row);
  });
  var add = el('<div class="rangerow"><select><option value="">+ add property…</option>' +
    SUBJECTS.filter(function (s) { return !ranges.some(function (r) { return r.subject === s; }); })
      .map(function (s) { return '<option>' + esc(s) + "</option>"; }).join("") + "</select><span></span></div>");
  add.querySelector("select").onchange = function (e) {
    if (e.target.value) { ranges.push({ subject: e.target.value, min: null, max: null }); write_ranges(ranges); }
  };
  rf.appendChild(add);
  F.appendChild(rf);

  var reset = el('<button class="btn">Clear all filters</button>');
  reset.onclick = function () { location.hash = "/"; };
  F.appendChild(reset);

  /* results */
  var R = root.querySelector("#results");
  var cols = DEFAULT_COLS;
  var tb = el('<div class="toolbar"><span class="count">' + hits.length + " material" + (hits.length === 1 ? "" : "s") + "</span>" +
    '<button class="linkish" id="exp-csv">export CSV</button>' +
    '<button class="linkish" id="exp-json">export JSON</button>' +
    '<span class="small muted">(current results)</span></div>');
  R.appendChild(tb);
  tb.querySelector("#exp-csv").onclick = function () { export_rows(hits, cols, "csv"); };
  tb.querySelector("#exp-json").onclick = function () { export_rows(hits, cols, "json"); };

  var wrap = el('<div class="wrap"></div>');
  var t = el('<table class="data"><thead></thead><tbody></tbody></table>');
  var head = "<tr><th class='nosort'></th>" +
    th("Manufacturer", "manufacturer", sortKey, sortDir) +
    th("Product", "productName", sortKey, sortDir) +
    th("Material", "material", sortKey, sortDir) +
    cols.map(function (c) { return th(shortlabel(c) + unit_sup(c), c, sortKey, sortDir, true); }).join("") + "</tr>";
  t.querySelector("thead").innerHTML = head;
  t.querySelectorAll("thead th").forEach(function (thEl) {
    if (thEl.classList.contains("nosort")) return;
    thEl.onclick = function () {
      var np = get_params(), k = thEl.dataset.k;
      if (sortKey === k && sortDir === "asc") np.set("dir", "desc");
      else { np.set("sort", k); np.set("dir", "asc"); }
      if (sortKey === k && sortDir === "desc") { np.delete("sort"); np.delete("dir"); }
      set_params(np);
    };
  });
  var body = t.querySelector("tbody");
  hits.slice(0, 500).forEach(function (m) {
    var tr = document.createElement("tr");
    var chk = TRAY.has(m.id) ? " checked" : "";
    tr.innerHTML = "<td><input type='checkbox' data-id='" + esc(m.id) + "'" + chk + "></td>" +
      "<td>" + esc(m.manufacturer) + "</td>" +
      '<td><a href="#/m/' + encodeURIComponent(m.id) + '">' + esc(m.productName) + "</a></td>" +
      "<td>" + esc(m.material) + "</td>" +
      cols.map(function (c) { return "<td class='num'>" + esc(fmt(m._nums[c] == null ? null : m._nums[c])) + "</td>"; }).join("");
    tr.querySelector("input").onchange = function (e) {
      e.target.checked ? TRAY.add(m.id) : TRAY.delete(m.id); save_tray();
    };
    body.appendChild(tr);
  });
  wrap.appendChild(t);
  R.appendChild(wrap);
  if (hits.length > 500) R.appendChild(el('<p class="small muted">showing first 500; narrow the filters to see the rest.</p>'));

  function write_ranges(rs) {
    var np = get_params();
    var s = rs.map(function (r) { return encodeURIComponent(r.subject) + "~" + (r.min == null ? "" : r.min) + "~" + (r.max == null ? "" : r.max); }).join(";");
    s ? np.set("r", s) : np.delete("r");
    np.delete("sort"); set_params(np);
  }
}

function th(label, key, sortKey, sortDir, num) {
  var cls = (num ? "num " : "") + (sortKey === key ? (sortDir === "desc" ? "sort-desc" : "sort-asc") : "");
  return "<th class='" + cls.trim() + "' data-k='" + esc(key) + "'>" + label + "</th>";
}
function shortlabel(s) { return s.replace(" (In-Plane)", "").replace(" (Interlayer)", " (Z)"); }
function unit_sup(s) { return UNIT_FOR[s] ? " <span class='small muted'>" + esc(UNIT_FOR[s]) + "</span>" : ""; }

function facet_block(title, param, selected, counts) {
  var keys = Object.keys(counts).sort();
  var fs = el('<fieldset><legend>' + esc(title) + "</legend></fieldset>");
  keys.forEach(function (k) {
    var id = param + "_" + k.replace(/\W/g, "");
    var row = el('<label class="facet"><span><input type="checkbox" ' + (selected.has(k) ? "checked" : "") +
      '> ' + esc(k) + '</span><span class="n">' + counts[k] + "</span></label>");
    row.querySelector("input").onchange = function (e) {
      var np = get_params();
      var cur = new Set((np.get(param) || "").split(",").filter(Boolean));
      e.target.checked ? cur.add(k) : cur.delete(k);
      cur.size ? np.set(param, Array.from(cur).join(",")) : np.delete(param);
      np.delete("sort"); set_params(np);
    };
    fs.appendChild(row);
  });
  return fs;
}
/* count materials per key within the current result set */
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

  // completeness against a fixed core set of properties
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
    html += "<h2>" + esc(cat) + "</h2>";
    html += '<table class="data"><thead><tr>' +
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
    html += "</tbody></table>";
  });

  if (m.sources && m.sources.length) {
    html += "<h2>Sources</h2><ul class='srclist small'>";
    m.sources.forEach(function (s) {
      html += "<li>" + esc(s.type || "doc") + " &mdash; " +
        (s.url && /^https?:/.test(s.url) ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + "</a>" : esc(s.url || "")) +
        "</li>";
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

  // union of (category, subject) in dataset order, per material take first field of that subject
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
      html += '<tr><td class="sub" colspan="' + (mats.length + 1) + '" style="background:#e8e8e8">' + esc(o.cat) + "</td></tr>";
    }
    var cells = mats.map(function (m) {
      var f = m.fields.find(function (x) { return x.category === o.cat && x.subject === o.sub; });
      return { f: f, n: f ? parse_num(f.value) : null, method: f ? f.method : null };
    });
    var nums = cells.map(function (c) { return c.n; }).filter(function (n) { return n != null; });
    var best = null;
    if (nums.length >= 2) {
      var strengthy = /Strength|Modulus|Impact|Elongation|Adhesion|Temperature|Resistivity/.test(o.sub);
      best = strengthy ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
    }
    var vals = cells.map(function (c) { return c.f ? (c.f.value || "") + (c.f.units ? " " + c.f.units : "") : ""; });
    var allSame = vals.every(function (v) { return v === vals[0]; }) && vals[0] !== "";
    var methods = cells.map(function (c) { return c.method || ""; }).filter(Boolean);
    var methodClash = methods.length > 1 && !methods.every(function (x) { return x === methods[0]; });

    html += '<tr' + (methodClash ? ' class="warn" title="different test methods"' : "") + '>' +
      '<td class="sticky sub">' + esc(o.sub) + (methodClash ? ' <span class="annot small">⚠ method differs</span>' : "") + "</td>" +
      cells.map(function (c, i) {
        var cls = [];
        if (best != null && c.n === best) cls.push("hit");
        else if (allSame) cls.push("same");
        var txt = c.f ? esc((c.f.value || "") + (c.f.units ? " " + c.f.units : "")) : "<span class='muted'>&mdash;</span>";
        if (c.f && c.f.methodNote) txt += " <span class='annot small'>(" + esc(c.f.methodNote) + ")</span>";
        return "<td class='" + cls.join(" ") + "'>" + txt + "</td>";
      }).join("") + "</tr>";
  });
  html += "</tbody></table></div>" +
    '<p class="small"><button class="linkish" id="cmp-csv">export CSV</button></p>' +
    '<p class="small muted">Highlight = best in row (max for strength/stiffness/temperature, min otherwise). ' +
    "Grey = identical. Yellow row = the materials cite different test methods, so the numbers are not directly comparable.</p>";

  A.innerHTML = html;
  A.querySelectorAll(".pill button").forEach(function (b) {
    b.onclick = function () {
      var keep = mats.map(function (m) { return m.id; }).filter(function (x) { return x !== b.dataset.id; });
      TRAY.delete(b.dataset.id); save_tray();
      var np = new URLSearchParams(); np.set("ids", keep.map(encodeURIComponent).join(","));
      set_params(np, "/compare");
    };
  });
  document.getElementById("cmp-csv").onclick = function () {
    var rows = [["Property"].concat(mats.map(function (m) { return m.manufacturer + " " + m.productName; }))];
    order.forEach(function (o) {
      rows.push([o.cat + " / " + o.sub].concat(mats.map(function (m) {
        var f = m.fields.find(function (x) { return x.category === o.cat && x.subject === o.sub; });
        return f ? (f.value || "") + (f.units ? " " + f.units : "") : "";
      })));
    });
    download("compare.csv", to_csv(rows), "text/csv");
  };
}

/* ---------- export / util ---------- */
function export_rows(mats, cols, kind) {
  if (kind === "json") {
    download("materials.json", JSON.stringify(mats.map(function (m) {
      return { id: m.id, manufacturer: m.manufacturer, productName: m.productName, material: m.material, fields: m.fields, sources: m.sources };
    }), null, 2), "application/json");
    return;
  }
  var header = ["Manufacturer", "Product", "Material"].concat(cols.map(function (c) { return c + (UNIT_FOR[c] ? " (" + UNIT_FOR[c] + ")" : ""); }));
  var rows = [header];
  mats.forEach(function (m) {
    rows.push([m.manufacturer, m.productName, m.material].concat(cols.map(function (c) { return m._nums[c] == null ? "" : m._nums[c]; })));
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
