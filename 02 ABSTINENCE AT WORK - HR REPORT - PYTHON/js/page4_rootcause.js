/* Wszystkie liczby ponizej pochodza z gotowych "miar" policzonych w Pythonie
   (build/compute_measures.py -> data/measures.js). JS tylko odczytuje wynik
   dla biezacego stanu filtra i renderuje DOM/animacje - nie robi agregacji. */
const round = (n,d=0) => { const f=Math.pow(10,d); return Math.round(n*f)/f; };
function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

const totalHours = MEASURES.rootcause.totalHours;
const M = MEASURES.rootcause;

let activeFilter = null; // null | {type:'age'|'service', value}

function filterKey(filter) {
  return !filter ? "null" : `${filter.type}:${filter.value}`;
}

/* ============ TOP ABSENCE REASON (top7 + Other), z gotowej miary ============ */
function renderReasons(filter) {
  const r = M.byFilter[filterKey(filter)].reason;
  const localTotal = r.localTotal || 1;

  let html = r.entries.map(([label, hours]) => `
    <div class="hrow reason-row">
      <span class="hrow-label reason-label">${label}</span>
      <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${round(hours/localTotal*100)}" style="background:#1B3B6F"></div></div>
      <span class="hrow-val">${fmtSpace(hours)}h</span>
    </div>`).join("");
  html += `
    <div class="hrow reason-row reason-other">
      <span class="hrow-label reason-label">Other</span>
      <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${round(r.otherHours/localTotal*100)}" style="background:#B4B2A9"></div></div>
      <span class="hrow-val">${fmtSpace(r.otherHours)}h</span>
    </div>`;
  document.getElementById("reasonRows").innerHTML = html;
}

/* ============ wykresy slupkowe: wiek <-> staz pracy, wzajemnie filtrujace ============ */
function renderVBars(containerId, groups, pickedValue, filterType, chHeight) {
  const maxH = Math.max(...groups.map(g => g[1]), 1);
  const CH = chHeight || 100;
  document.getElementById(containerId).innerHTML = groups.map(([label, hours], i) => {
    const barPx = round(hours/maxH*CH);
    const pct = totalHours > 0 ? (hours/totalHours*100).toFixed(1) : "0.0";
    const isPicked = pickedValue === label;
    const dimmed = pickedValue && !isPicked;
    return `
      <div class="vbar-col ${dimmed?'dimmed':''}" data-label="${label}" data-ftype="${filterType}">
        <div class="vbar-track"><div class="vbar ${isPicked?'picked':(i===0&&!pickedValue?'top':'')}" data-h="${barPx}"></div></div>
        <div class="vbar-val">${fmtSpace(hours)}h</div>
        <div class="vbar-pct">${pct}% of total</div>
        <div class="vbar-label">${label}</div>
      </div>`;
  }).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(`#${containerId} .vbar`).forEach(el => { el.style.height = el.dataset.h + "px"; });
  });

  document.querySelectorAll(`#${containerId} .vbar-col`).forEach(col => {
    col.addEventListener("click", () => {
      const val = col.dataset.label;
      const type = col.dataset.ftype;
      activeFilter = (activeFilter && activeFilter.type === type && activeFilter.value === val) ? null : { type, value: val };
      renderEverything();
    });
  });
}

function renderAgeBars(filter) {
  const groups = (filter && filter.type === 'service') ? M.ageBarsBySvc[filter.value] : M.ageBarsFull;
  renderVBars("ageBars", groups, (filter && filter.type === 'age') ? filter.value : null, 'age');
}

function renderSvcBars(filter) {
  const groups = (filter && filter.type === 'age') ? M.svcBarsByAge[filter.value] : M.svcBarsFull;
  renderVBars("svcBars", groups, (filter && filter.type === 'service') ? filter.value : null, 'service', 128);
}

/* ============ KPI mini cards, z gotowej miary ============ */
function renderKpiMini(filter) {
  const k = M.byFilter[filterKey(filter)].kpiMini;
  document.getElementById("kpiMini").innerHTML = `
    <div class="kpi-mini"><p class="kpi-mini-label">Unique employees</p><div class="kpi-mini-value">${k.uniqueEmployees}</div></div>
    <div class="kpi-mini"><p class="kpi-mini-label">Avg age</p><div class="kpi-mini-value">${k.avgAge}</div></div>
    <div class="kpi-mini"><p class="kpi-mini-label">Age range</p><div class="kpi-mini-value">${k.ageMin}–${k.ageMax}</div></div>
  `;
}

/* ============ SOCIAL / EDUCATION / DISTANCE, z gotowej miary ============ */
function renderSERows(containerId, groups, opts) {
  const sorted = [...groups].sort((a,b) => b[1] - a[1]);
  document.getElementById(containerId).innerHTML = sorted.map((g, i) => {
    const [label, hours, emp] = g;
    const barPct = opts.barTotal > 0 ? round(hours/opts.barTotal*100) : 0;
    let color = "#E0E0E0";
    if (hours > 0) {
      if (opts.scheme === "social4") {
        color = i === 0 ? "#1B3B6F" : (i === sorted.length-1 ? "#BDD0EF" : "#8D9DB7");
      } else {
        color = i === 0 ? "#1B3B6F" : "#8D9DB7";
      }
    }
    const pctVal = opts.pctBy === "emp" ? emp : hours;
    const pct = opts.pctTotal > 0 ? round(pctVal/opts.pctTotal*100) : 0;
    return `
      <div class="hrow">
        <span class="hrow-label">${label}</span>
        <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${barPct}" style="background:${color}"></div></div>
        <span class="hrow-val">${fmtSpace(hours)}h</span>
        <span class="hrow-sub">${pct}% emp</span>
      </div>`;
  }).join("");
}

function renderSocial(filter) {
  const socGroups = M.byFilter[filterKey(filter)].social; // [[label,hours,emp],...]
  const socEmpTotal = socGroups.reduce((a,g) => a+g[2], 0);
  const socHoursTotal = socGroups.reduce((a,g) => a+g[1], 0);
  renderSERows("socialRows", socGroups, { barTotal: socHoursTotal, pctBy: "emp", pctTotal: socEmpTotal, scheme: "social4" });
}

function renderEducation(filter) {
  const eduGroups = M.byFilter[filterKey(filter)].education.map(([label, hours]) => [label, hours, 0]); // brak "emp" dla edukacji
  const eduHoursTotal = eduGroups.reduce((a,g) => a+g[1], 0);
  renderSERows("eduRows", eduGroups, { barTotal: eduHoursTotal, pctBy: "hours", pctTotal: eduHoursTotal, scheme: "plain" });
}

function renderDistance(filter) {
  const distGroups = M.byFilter[filterKey(filter)].distance; // [[label,hours,emp],...]
  const distEmpTotal = distGroups.reduce((a,g) => a+g[2], 0);
  const distHoursTotal = distGroups.reduce((a,g) => a+g[1], 0);
  renderSERows("distRows", distGroups, { barTotal: distHoursTotal, pctBy: "emp", pctTotal: distEmpTotal, scheme: "plain" });
}

/* ============ plakietka filtra ============ */
function renderFilterBadge(filter) {
  const badge = document.getElementById("filterBadge");
  if (filter) {
    badge.style.display = "inline-flex";
    badge.querySelector(".fb-label").textContent = filter.value;
  } else {
    badge.style.display = "none";
  }
}

function renderEverything() {
  renderReasons(activeFilter);
  renderAgeBars(activeFilter);
  renderSvcBars(activeFilter);
  renderKpiMini(activeFilter);
  renderSocial(activeFilter);
  renderEducation(activeFilter);
  renderDistance(activeFilter);
  renderFilterBadge(activeFilter);

  requestAnimationFrame(() => {
    document.querySelectorAll(".hrow-bar").forEach(el => { el.style.width = el.dataset.w + "%"; });
  });

  alignColumnBottoms();
}

/* ============ wyrownanie dolnych krawedzi lewej i prawej kolumny co do piksela ============ */
function alignColumnBottoms() {
  const cols = document.querySelectorAll(".root-grid > .col");
  if (cols.length < 2) return;
  const [leftCol, rightCol] = cols;

  const leftSpacer = leftCol.querySelector(".col-align-spacer");
  const rightSpacer = rightCol.querySelector(".col-align-spacer");
  if (leftSpacer) leftSpacer.remove();
  if (rightSpacer) rightSpacer.remove();

  requestAnimationFrame(() => {
    const leftH = leftCol.getBoundingClientRect().height;
    const rightH = rightCol.getBoundingClientRect().height;
    const diff = Math.round(leftH - rightH);
    if (diff === 0) return;

    const shorter = diff > 0 ? rightCol : leftCol;
    const spacer = document.createElement("div");
    spacer.className = "col-align-spacer";
    spacer.style.height = Math.abs(diff) + "px";
    shorter.lastElementChild.appendChild(spacer);
  });
}

document.getElementById("fbClear").addEventListener("click", () => {
  activeFilter = null;
  renderEverything();
});

renderEverything();

/* ============ nawigacja (placeholder) ============ */
document.querySelectorAll(".pill-nav button[data-page]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "navigate", page: btn.dataset.page }, "*");
    }
  });
});

function reportHeight() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "resize", height: document.documentElement.scrollHeight }, "*");
  }
}
window.addEventListener("load", reportHeight);
window.addEventListener("resize", reportHeight);
setTimeout(reportHeight, 50);
setTimeout(reportHeight, 300);
setTimeout(reportHeight, 1000);
