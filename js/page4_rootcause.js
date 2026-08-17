const DATA = EMBEDDED_DATA;
const H = "Absenteeism time in hours";
const round = (n,d=0) => { const f=Math.pow(10,d); return Math.round(n*f)/f; };
const sum = (arr,key) => arr.reduce((a,r)=>a+(Number(r[key])||0),0);
function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

const totalHours = sum(DATA, H);

const REASON_CODES = [
  { code:13, label:"Musculoskeletal" },
  { code:19, label:"Injury" },
  { code:23, label:"Consultations" },
  { code:28, label:"Dental" },
  { code:11, label:"Digestive" },
  { code:22, label:"Patient follow-up" },
  { code:10, label:"Respiratory" },
];

function ageBin(a) {
  if (a < 30) return "Under 30";
  if (a < 40) return "30 – 39";
  if (a < 50) return "40 – 49";
  return "50+";
}
function svcBin(s) {
  if (s<=5) return "0-5 years";
  if (s<=10) return "6-10 years";
  if (s<=15) return "11-15 years";
  if (s<=20) return "16-20 years";
  return "21+ years";
}
function socGroup(r) {
  const d = r["Social drinker"], s = r["Social smoker"];
  if (d===1 && s===0) return "Drinkers";
  if (s===1 && d===0) return "Smokers";
  if (d===1 && s===1) return "Both";
  return "Neither";
}
function distBin(d) {
  if (d<=10) return "0–10 km";
  if (d<=20) return "11–20 km";
  if (d<=30) return "21–30 km";
  return "30+ km";
}

const AGE_LABELS = ["Under 30","30 – 39","40 – 49","50+"];
const SVC_LABELS = ["0-5 years","6-10 years","11-15 years","16-20 years","21+ years"];
const EDU_LABELS = { 1:"High school", 2:"Graduate", 3:"Postgrad+" };
const SOC_LABELS = ["Drinkers","Smokers","Both","Neither"];
const DIST_LABELS = ["0–10 km","11–20 km","21–30 km","30+ km"];

let activeFilter = null; // null | {type:'age'|'service', value}

function getFilteredData(filter) {
  if (!filter) return DATA;
  if (filter.type === 'age') return DATA.filter(r => ageBin(r.Age) === filter.value);
  if (filter.type === 'service') return DATA.filter(r => svcBin(r["Service time"]) === filter.value);
  return DATA;
}

/* ============ TOP ABSENCE REASON (top7 + Other), przeliczane w obrebie filtra ============ */
function renderReasons(filter) {
  const data = getFilteredData(filter);
  const localTotal = sum(data, H) || 1;
  const reasonEntries = REASON_CODES.map(r => ({
    label: r.label, hours: sum(data.filter(row => row["Reason for absence"] === r.code), H),
  })).sort((a,b) => b.hours - a.hours);
  const top7Sum = sum(reasonEntries, "hours");
  const otherHours = Math.max(0, sum(data, H) - top7Sum);

  let html = reasonEntries.map(r => `
    <div class="hrow reason-row">
      <span class="hrow-label reason-label">${r.label}</span>
      <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${round(r.hours/localTotal*100)}" style="background:#1B3B6F"></div></div>
      <span class="hrow-val">${fmtSpace(r.hours)}h</span>
    </div>`).join("");
  html += `
    <div class="hrow reason-row reason-other">
      <span class="hrow-label reason-label">Other</span>
      <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${round(otherHours/localTotal*100)}" style="background:#B4B2A9"></div></div>
      <span class="hrow-val">${fmtSpace(otherHours)}h</span>
    </div>`;
  document.getElementById("reasonRows").innerHTML = html;
}

/* ============ wykresy slupkowe: wiek <-> staz pracy, wzajemnie filtrujace ============ */
function renderVBars(containerId, groups, pickedValue, filterType, chHeight) {
  const maxH = Math.max(...groups.map(g => g.hours), 1);
  const CH = chHeight || 100;
  document.getElementById(containerId).innerHTML = groups.map((g,i) => {
    const barPx = round(g.hours/maxH*CH);
    const pct = totalHours > 0 ? (g.hours/totalHours*100).toFixed(1) : "0.0";
    const isPicked = pickedValue === g.label;
    const dimmed = pickedValue && !isPicked;
    return `
      <div class="vbar-col ${dimmed?'dimmed':''}" data-label="${g.label}" data-ftype="${filterType}">
        <div class="vbar-track"><div class="vbar ${isPicked?'picked':(i===0&&!pickedValue?'top':'')}" data-h="${barPx}"></div></div>
        <div class="vbar-val">${fmtSpace(g.hours)}h</div>
        <div class="vbar-pct">${pct}% of total</div>
        <div class="vbar-label">${g.label}</div>
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
  const scopeData = (filter && filter.type === 'service') ? getFilteredData(filter) : DATA;
  const groups = AGE_LABELS.map(label => ({ label, hours: sum(scopeData.filter(r => ageBin(r.Age) === label), H) })).sort((a,b) => b.hours - a.hours);
  renderVBars("ageBars", groups, (filter && filter.type === 'age') ? filter.value : null, 'age');
}

function renderSvcBars(filter) {
  const scopeData = (filter && filter.type === 'age') ? getFilteredData(filter) : DATA;
  const groups = SVC_LABELS.map(label => ({ label, hours: sum(scopeData.filter(r => svcBin(r["Service time"]) === label), H) })).sort((a,b) => b.hours - a.hours);
  renderVBars("svcBars", groups, (filter && filter.type === 'service') ? filter.value : null, 'service', 128);
}

/* ============ KPI mini cards, przeliczane w obrebie filtra ============ */
function renderKpiMini(filter) {
  const data = getFilteredData(filter);
  const uniqueEmployees = new Set(data.map(r=>r.ID)).size;
  const ageByEmp = new Map();
  data.forEach(r => { if(!ageByEmp.has(r.ID)) ageByEmp.set(r.ID, []); ageByEmp.get(r.ID).push(r.Age); });
  const perEmpMeanAge = [...ageByEmp.values()].map(ages => ages.reduce((a,b)=>a+b,0)/ages.length);
  const avgAge = perEmpMeanAge.length ? round(perEmpMeanAge.reduce((a,b)=>a+b,0) / perEmpMeanAge.length, 1) : 0;
  const ageMin = data.length ? Math.min(...data.map(r=>r.Age)) : 0;
  const ageMax = data.length ? Math.max(...data.map(r=>r.Age)) : 0;

  document.getElementById("kpiMini").innerHTML = `
    <div class="kpi-mini"><p class="kpi-mini-label">Unique employees</p><div class="kpi-mini-value">${uniqueEmployees}</div></div>
    <div class="kpi-mini"><p class="kpi-mini-label">Avg age</p><div class="kpi-mini-value">${avgAge}</div></div>
    <div class="kpi-mini"><p class="kpi-mini-label">Age range</p><div class="kpi-mini-value">${ageMin}–${ageMax}</div></div>
  `;
}

/* ============ SOCIAL / EDUCATION / DISTANCE, przeliczane w obrebie filtra ============ */
function renderSERows(containerId, groups, opts) {
  const sorted = [...groups].sort((a,b) => b.hours - a.hours);
  document.getElementById(containerId).innerHTML = sorted.map((g,i) => {
    const barPct = opts.barTotal > 0 ? round(g.hours/opts.barTotal*100) : 0;
    let color = "#E0E0E0";
    if (g.hours > 0) {
      if (opts.scheme === "social4") {
        color = i === 0 ? "#1B3B6F" : (i === sorted.length-1 ? "#BDD0EF" : "#8D9DB7");
      } else {
        color = i === 0 ? "#1B3B6F" : "#8D9DB7";
      }
    }
    const pctVal = opts.pctBy === "emp" ? g.emp : g.hours;
    const pct = opts.pctTotal > 0 ? round(pctVal/opts.pctTotal*100) : 0;
    return `
      <div class="hrow">
        <span class="hrow-label">${g.label}</span>
        <div class="hrow-bar-bg"><div class="hrow-bar" data-w="${barPct}" style="background:${color}"></div></div>
        <span class="hrow-val">${fmtSpace(g.hours)}h</span>
        <span class="hrow-sub">${pct}% emp</span>
      </div>`;
  }).join("");
}

function renderSocial(filter) {
  const data = getFilteredData(filter);
  const socGroups = SOC_LABELS.map(label => {
    const rows = data.filter(r => socGroup(r) === label);
    return { label, hours: sum(rows, H), emp: new Set(rows.map(r=>r.ID)).size };
  });
  const socEmpTotal = sum(socGroups, "emp");
  const socHoursTotal = sum(socGroups, "hours");
  renderSERows("socialRows", socGroups, { barTotal: socHoursTotal, pctBy: "emp", pctTotal: socEmpTotal, scheme: "social4" });
}

function renderEducation(filter) {
  const data = getFilteredData(filter);
  const eduGroups = [1,2,3].map(code => ({
    label: EDU_LABELS[code], hours: sum(data.filter(r => r.Education === code), H),
  }));
  const eduHoursTotal = sum(eduGroups, "hours");
  renderSERows("eduRows", eduGroups, { barTotal: eduHoursTotal, pctBy: "hours", pctTotal: eduHoursTotal, scheme: "plain" });
}

function renderDistance(filter) {
  const data = getFilteredData(filter);
  const distGroups = DIST_LABELS.map(label => {
    const rows = data.filter(r => distBin(r["Distance from Residence to Work"]) === label);
    return { label, hours: sum(rows, H), emp: new Set(rows.map(r=>r.ID)).size };
  });
  const distEmpTotal = sum(distGroups, "emp");
  const distHoursTotal = sum(distGroups, "hours");
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
