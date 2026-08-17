/* ---------- mapowania i przygotowanie danych ---------- */
const REASON_MAP = {
  0:"No reason given",1:"Certain infectious/parasitic diseases",2:"Neoplasms",
  3:"Diseases of blood",4:"Endocrine/metabolic diseases",5:"Mental/behavioural disorders",
  6:"Diseases of nervous system",7:"Diseases of eye",8:"Diseases of ear",
  9:"Diseases of circulatory system",10:"Respiratory diseases",11:"Digestive diseases",
  12:"Diseases of skin",13:"Musculoskeletal diseases",14:"Diseases of genitourinary system",
  15:"Pregnancy/childbirth",16:"Perinatal conditions",17:"Congenital malformations",
  18:"Symptoms and abnormal findings",19:"Injury and poisoning",20:"External causes",
  21:"Factors influencing health status",22:"Patient follow-up",23:"Medical consultation",
  24:"Blood donation",25:"Laboratory examination",26:"Unjustified absence",27:"Physiotherapy",
  28:"Dental consultation",
};
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BENCHMARK_HOURS = 480;
const COST_PER_HOUR = 42;
const TOTAL_ABSENCE_PY = 4876;   // ubiegly rok - stala z DAX (brak w zrodlowych danych)
const AVG_BENCHMARK = 5;         // benchmark "<5h" z KPI2

const DATA = EMBEDDED_DATA.map(r => ({ ...r, ReasonLabel: REASON_MAP[r["Reason for absence"]] ?? "No reason given" }));

const round = (n, d=0) => { const f = Math.pow(10,d); return Math.round(n*f)/f; };
const sum = (arr, key) => arr.reduce((a,r)=>a+(Number(r[key])||0),0);

/* format liczb ze spacja jako separatorem tysiecy: "5124" -> "5 124" */
function fmtSpace(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* ---------- definicja poziomow Bradford Factor (uzywana przez computeStats) ---------- */
const TIERS = [
  { key: "Critical", min: 600,  max: Infinity, color: "#E24B4A", labelColor: "#791F1F", range: "\u2265600" },
  { key: "Urgent",   min: 400,  max: 599,      color: "#BA7517", labelColor: "#633806", range: "400\u2013599" },
  { key: "Formal",   min: 200,  max: 399,      color: "#C49A00", labelColor: "#7A5C00", range: "200\u2013399" },
  { key: "Monitor",  min: 100,  max: 199,      color: "#378ADD", labelColor: "#1B3B6F", range: "100\u2013199" },
  { key: "Normal",   min: -Infinity, max: 99,  color: "#639922", labelColor: "#27500A", range: "<100" },
];

/* ---------- stan filtra (wybrany miesiac z wykresu) ---------- */
let activeMonth = null; // null = caly rok, 1-12 = wybrany miesiac

function computeStats(filterMonth) {
  const filtered = filterMonth ? DATA.filter(r => r["Month of absence"] === filterMonth) : DATA;

  const totalHours = sum(filtered, "Absenteeism time in hours");
  const totalPct = round((totalHours - TOTAL_ABSENCE_PY) / TOTAL_ABSENCE_PY * 100, 0);
  const avgHours = filtered.length ? round(totalHours / filtered.length, 1) : 0;

  const perEmpHours = new Map();
  filtered.forEach(r => perEmpHours.set(r.ID, (perEmpHours.get(r.ID)||0) + r["Absenteeism time in hours"]));
  const rankedEmployees = [...perEmpHours.entries()].sort((a,b)=>b[1]-a[1]);
  const top4 = rankedEmployees.slice(0,4);
  const maxTop = top4.length ? top4[0][1] : 1;

  const perEmpEpisodes = new Map();
  filtered.forEach(r => {
    if (r["Absenteeism time in hours"] > 0) perEmpEpisodes.set(r.ID, (perEmpEpisodes.get(r.ID)||0) + 1);
  });
  const perEmpDays = new Map();
  perEmpHours.forEach((h, id) => perEmpDays.set(id, h/8));

  const empTiers = [...perEmpHours.keys()].map(id => {
    const episodes = perEmpEpisodes.get(id) || 0;
    const days = perEmpDays.get(id) || 0;
    const bradford = episodes * episodes * days;
    const tier = TIERS.find(t => bradford >= t.min && bradford <= t.max);
    return { id, bradford, hours: perEmpHours.get(id), tier: tier.key };
  });

  const totalEmp = empTiers.length || 1;
  const tierStats = TIERS.map(t => {
    const members = empTiers.filter(e => e.tier === t.key);
    const count = members.length;
    const hours = sum(members, "hours");
    return { ...t, count, hours, pctOfEmp: round(count/totalEmp*100,1), pctOfHours: totalHours ? round(hours/totalHours*100,0) : 0 };
  });

  const criticalStat = tierStats.find(t => t.key === "Critical");
  const cost = Math.round(totalHours * COST_PER_HOUR);

  const reasonTotals = new Map();
  filtered.forEach(r => reasonTotals.set(r.ReasonLabel, (reasonTotals.get(r.ReasonLabel)||0) + r["Absenteeism time in hours"]));
  const topReasons = [...reasonTotals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,9);
  const maxReason = topReasons.length ? topReasons[0][1] : 1;

  return { totalHours, totalPct, avgHours, top4, maxTop, tierStats, criticalStat, totalEmp, cost, topReasons, maxReason };
}

/* ---------- animacja: zliczanie wartosci KPI od 0 do docelowej (lub od wart. poczatkowej przy zmianie filtra) ---------- */
function animateCount(el, endValue, opts = {}) {
  if (!el) return;
  const duration = opts.duration || 700;
  const delay = opts.delay || 0;
  const format = opts.format || (v => Math.round(v).toString());
  const startValue = opts.from ?? 0;
  const startTime = performance.now() + delay;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const elapsed = now - startTime;
    if (elapsed < 0) { requestAnimationFrame(frame); return; }
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    el.textContent = format(startValue + (endValue - startValue) * eased);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = format(endValue);
  }
  requestAnimationFrame(frame);
}

let prevStats = null; // do animacji "od" poprzedniej wartosci przy zmianie filtra

function renderAll(filterMonth, opts = {}) {
  const isInitial = opts.initial === true;
  const s = computeStats(filterMonth);
  const periodLabel = filterMonth ? MONTH_FULL[filterMonth] : null;

  /* --- filter badge w naglowku karty wykresu --- */
  const badge = document.getElementById("filterBadge");
  if (badge) {
    if (filterMonth) {
      badge.style.display = "inline-flex";
      badge.querySelector(".fb-label").textContent = periodLabel;
    } else {
      badge.style.display = "none";
    }
  }

  /* --- KPI 1 subtitle: rok do roku tylko dla calego roku, inaczej % udzialu w roku --- */
  const kpi1Sub = filterMonth
    ? `${round(s.totalHours/totalHoursYear*100,1)}% udzialu w roku`
    : `&#9650; +${s.totalPct}% vs last year`;
  const kpi1SubColor = filterMonth ? "" : "";

  document.getElementById("kpiRow").innerHTML = `
    <div class="flip-card">
      <div class="flip-inner">
        <div class="flip-front">
          <p class="kpi-title">Total absence hours${filterMonth ? " &middot; " + periodLabel : ""}</p>
          <div class="kpi-value" id="kpiVal1">0</div>
          <div class="kpi-sub">${kpi1Sub}</div>
        </div>
        <div class="flip-back">
          <p class="kpi-title">Previous year</p>
          <div class="kpi-value">${fmtSpace(TOTAL_ABSENCE_PY)}</div>
          <div class="kpi-sub good"></div>
        </div>
      </div>
    </div>

    <div class="flip-card">
      <div class="flip-inner">
        <div class="flip-front">
          <p class="kpi-title">Avg hours / employee</p>
          <div class="kpi-value" id="kpiVal2">0</div>
          <div class="kpi-sub">&#9650; +${round(s.avgHours-AVG_BENCHMARK,1)}h vs benchmark (&lt;${AVG_BENCHMARK} H)</div>
        </div>
        <div class="flip-back">
          ${s.top4.map(([id,h],i) => `
            <div class="rank-row">
              <div class="badge">${i+1}</div>
              <span class="rank-emp">Employee ID #${id}</span>
              <div class="rank-bar-bg"><div class="rank-bar-fill" data-w="${round(h/s.maxTop*100,0)}"></div></div>
              <span class="rank-hrs">${fmtSpace(h)}h</span>
            </div>`).join("")}
        </div>
      </div>
    </div>

    <div class="flip-card">
      <div class="flip-inner">
        <div class="flip-front">
          <p class="kpi-title">High risk employees</p>
          <div class="kpi-value" id="kpiVal3">0</div>
          <div class="kpi-sub">${s.criticalStat.pctOfEmp}% of workforce</div>
        </div>
        <div class="flip-back">
          <div class="back-title">Bradford &middot; ${s.totalEmp} employees</div>
          ${s.tierStats.map(t => `
            <div class="tier-row">
              <span class="tier-label" style="color:${t.labelColor};">${t.key}</span>
              <div class="tier-bar-bg"><div class="tier-bar" data-w="${t.pctOfEmp}" style="background:${t.count>0?t.color:'#E8E8E8'}"></div></div>
              <span class="tier-val">${t.count}</span>
              <span class="tier-range">${t.range}</span>
            </div>`).join("")}
        </div>
      </div>
    </div>

    <div class="flip-card orange">
      <div class="flip-inner">
        <div class="flip-front">
          <p class="kpi-title">${filterMonth ? "Est. cost &middot; " + periodLabel : "Est. annual cost"}</p>
          <div class="kpi-value" id="kpiVal4">$0k</div>
        </div>
        <div class="flip-back">
          <div class="back-title">Cost by Bradford level</div>
          ${s.tierStats.map(t => `
            <div class="tier-row">
              <span class="tier-label" style="color:${t.labelColor};">${t.key}</span>
              <div class="tier-bar-bg"><div class="tier-bar" data-w="${t.pctOfHours}" style="background:${t.hours>0?t.color:'#E8E8E8'}"></div></div>
              <span class="tier-pct">${t.pctOfHours}%</span>
              <span class="tier-cost">$${Math.round(t.hours*COST_PER_HOUR/1000)}k</span>
            </div>`).join("")}
        </div>
      </div>
    </div>
  `;

  const d1 = isInitial ? 80 : 0, d2 = isInitial ? 180 : 0, d3 = isInitial ? 280 : 0, d4 = isInitial ? 380 : 0;
  const dur = isInitial ? 1100 : 550;
  animateCount(document.getElementById("kpiVal1"), s.totalHours, { delay: d1, duration: dur, from: prevStats?.totalHours, format: v => fmtSpace(v) });
  animateCount(document.getElementById("kpiVal2"), s.avgHours, { delay: d2, duration: dur, from: prevStats?.avgHours, format: v => v.toFixed(1) });
  animateCount(document.getElementById("kpiVal3"), s.criticalStat.count, { delay: d3, duration: isInitial ? 700 : dur, from: prevStats?.criticalStat?.count, format: v => Math.round(v).toString() });
  animateCount(document.getElementById("kpiVal4"), Math.round(s.cost/1000), { delay: d4, duration: dur, from: prevStats ? Math.round(prevStats.cost/1000) : undefined, format: v => "$" + Math.round(v) + "k" });

  requestAnimationFrame(() => {
    document.querySelectorAll(".rank-bar-fill, .tier-bar").forEach(el => { el.style.width = el.dataset.w + "%"; });
  });

  /* --- lista powodow --- */
  const listEl = document.getElementById("reasonList");
  listEl.innerHTML = s.topReasons.map(([label, hours]) => `
    <div class="reason-item">
      <div class="reason-label"><span>${label}</span><span class="count">| ${fmtSpace(hours)}</span></div>
      <div class="reason-bar-track"><div class="reason-bar-fill" data-w="${round(hours/s.maxReason*100,1)}"></div></div>
    </div>
  `).join("");
  setTimeout(() => {
    document.querySelectorAll(".reason-bar-fill").forEach(el => { el.style.width = el.dataset.w + "%"; });
  }, isInitial ? 560 : 60);

  prevStats = s;
}

/* ---------- Wykres miesieczny ---------- */
const MONTH_FULL = { 1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December" };
function sumArr(arr){ return arr.reduce((a,b)=>a+b,0); }
const monthTotals = Array.from({length:12}, (_,i) => {
  const m = i+1;
  return round(sum(DATA.filter(r => r["Month of absence"] === m), "Absenteeism time in hours"), 0);
});
const totalHoursYear = sumArr(monthTotals);

document.getElementById("chartTitle").textContent =
  `TOTAL ABSENCE AND BENCHMARK ALERT (${BENCHMARK_HOURS}) BY MONTH NAME SHORT`;

const peakLabelPlugin = {
  id: 'peakLabels',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    const data = monthTotals;
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '600 12px Segoe UI';
    ctx.fillStyle = '#16305C';
    ctx.textAlign = 'center';
    data.forEach((v, i) => {
      const prev = data[i-1] ?? -Infinity;
      const next = data[i+1] ?? -Infinity;
      if (v > prev && v > next && v > BENCHMARK_HOURS) {
        const pt = meta.data[i];
        ctx.fillText(fmtSpace(v) + ' h', pt.x, pt.y - 14);
      }
    });
    ctx.restore();

    // podswietlenie wybranego miesiaca
    if (activeMonth) {
      const pt = meta.data[activeMonth - 1];
      if (pt) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#16305C';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([3,3]);
        ctx.moveTo(pt.x, chart.chartArea.top);
        ctx.lineTo(pt.x, chart.chartArea.bottom);
        ctx.strokeStyle = 'rgba(22,48,92,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
};

let chartInstance = null;

setTimeout(() => {
chartInstance = new Chart(document.getElementById("mainChart"), {
  type: 'line',
  data: {
    labels: MONTH_SHORT,
    datasets: [
      {
        label: 'Total absence',
        data: monthTotals,
        borderColor: '#16305C',
        backgroundColor: 'rgba(22,48,92,0.10)',
        fill: true,
        tension: 0.42,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 12,
        borderWidth: 2.5,
      },
      {
        label: 'Benchmark alert',
        data: Array(12).fill(BENCHMARK_HOURS),
        borderColor: '#E58C9B',
        borderDash: [6,5],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
        pointHitRadius: 0,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutCubic' },
    onHover: (evt, elements) => {
      evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    onClick: (evt, elements, chart) => {
      const pts = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
      if (!pts.length) return;
      const idx = pts[0].index;
      const clickedMonth = idx + 1;
      activeMonth = (activeMonth === clickedMonth) ? null : clickedMonth;
      chart.draw();
      renderAll(activeMonth);
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${fmtSpace(ctx.parsed.y)} h`,
          afterBody: () => ['', 'Kliknij, aby przefiltrowac karty KPI'],
        },
      },
    },
    scales: {
      y: { grid: { color: '#EEF0F2', drawTicks: false }, border: { display: false }, ticks: { stepSize: 100, callback: v => fmtSpace(v) } },
      x: { grid: { display: false }, border: { display: false } },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  },
  plugins: [peakLabelPlugin],
});
}, 400);

/* ---------- pierwsze renderowanie (caly rok) ---------- */
renderAll(null, { initial: true });

document.getElementById("fbClear").addEventListener("click", () => {
  activeMonth = null;
  if (chartInstance) chartInstance.draw();
  renderAll(null);
});

/* ---------- Nawigacja (placeholder na potrzeby podgladu) ---------- */
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
