const DATA = EMBEDDED_DATA;
const H = "Absenteeism time in hours";
const round = (n,d=0) => { const f=Math.pow(10,d); return Math.round(n*f)/f; };
const sum = (arr,key) => arr.reduce((a,r)=>a+(Number(r[key])||0),0);
function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

const COST_PER_HOUR = 42;
const SAVINGS_PCT = 20;

/* ============ dane bazowe (spojne z pozostalymi stronami) ============ */
const totalHours = sum(DATA, H);
const annualCost = Math.round(totalHours * COST_PER_HOUR);
const potentialSavings = Math.round(annualCost * SAVINGS_PCT / 100);
const targetCost = Math.round((annualCost - potentialSavings) / 1000);

const empIds = [...new Set(DATA.map(r=>r.ID))];
const employees = empIds.map(id => {
  const rows = DATA.filter(r => r.ID === id);
  const episodes = rows.filter(r => r[H] > 0).length;
  const empHours = sum(rows, H);
  const days = empHours / 8;
  return { id, bradford: episodes*episodes*days };
});
const criticalCount = employees.filter(e => e.bradford >= 600).length;

const monHours = sum(DATA.filter(r => r["Day of the week"]===2), H);
const mondayPct = round(monHours/totalHours*100, 1);

const avgMonthlyHours = Math.round(totalHours/12);
const benchmarkMonthly = 350;

const REASON_MAP = { 13:"Musculoskeletal diseases", 19:"Injury and poisoning" };
const musculoHours = sum(DATA.filter(r=>r["Reason for absence"]===13), H);
const injuryHours = sum(DATA.filter(r=>r["Reason for absence"]===19), H);
const combined1 = musculoHours + injuryHours;
const combined1Pct = Math.floor(combined1/totalHours*100);

/* ============ render ============ */
document.getElementById("alertBanner").innerHTML =
  `<span class="warn-icon">&#9888;</span> Monday absences account for ${mondayPct}% of weekly total. Recommend immediate culture and flexible-work review across all departments.`;

document.getElementById("kpiRow").innerHTML = `
  <div class="kpi-card"><p class="kpi-label">Estimated annual cost</p><div class="kpi-value">$${Math.round(annualCost/1000)}k</div></div>
  <div class="kpi-card"><p class="kpi-label">Potential savings (${SAVINGS_PCT}%)</p><div class="kpi-value" style="color:#4F8A1F;">$${Math.round(potentialSavings/1000)}k</div></div>
  <div class="kpi-card"><p class="kpi-label">Critical Bradford employees</p><div class="kpi-value" style="color:#C0392B;">${criticalCount}</div></div>
`;

document.getElementById("rec1desc").textContent =
  `Employees with Bradford 600+ and musculoskeletal or injury-related absences should be referred to occupational health for assessment and review. These two categories account for ${fmtSpace(combined1)}h — ${combined1Pct}% of total absence.`;

document.getElementById("rec4desc").textContent =
  `Monday/Friday clustering (${mondayPct}% on Mondays alone) is a strong indicator of disengagement. Recommend pulse survey and review of remote work policy for teams with highest Monday absence rates.`;

document.getElementById("kpiMonitor1").textContent =
  `Target: reduce Critical segment from ${criticalCount} to below ${criticalCount-6} employees within 12 months`;
document.getElementById("kpiMonitor2").textContent =
  `Target: reduce avg monthly hours from ${avgMonthlyHours}h to below ${benchmarkMonthly}h (benchmark)`;
document.getElementById("kpiMonitor3").textContent =
  `Target: reduce from $${Math.round(annualCost/1000)}k to below $${targetCost}k through preventive interventions`;

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
