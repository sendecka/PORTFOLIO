function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

/* ============ dane - gotowa miara z MEASURES (build/compute_measures.py) ============ */
const R = MEASURES.recommendations;
const annualCost = R.annualCost;
const potentialSavings = R.potentialSavings;
const targetCost = R.targetCost;
const criticalCount = R.criticalCount;
const mondayPct = R.mondayPct;
const avgMonthlyHours = R.avgMonthlyHours;
const benchmarkMonthly = R.benchmarkMonthly;
const combined1 = R.combined1Hours;
const combined1Pct = R.combined1Pct;
const SAVINGS_PCT = R.savingsPct;

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
