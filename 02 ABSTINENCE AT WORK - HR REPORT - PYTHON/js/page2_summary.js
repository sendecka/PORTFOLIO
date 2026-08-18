/* ---------- mapowania (etykiety, nie liczenie) ---------- */
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
const AVG_BENCHMARK = 5;         // benchmark "<5h" z KPI2

const round = (n, d=0) => { const f = Math.pow(10,d); return Math.round(n*f)/f; };

/* format liczb ze spacja jako separatorem tysiecy: "5124" -> "5 124" */
function fmtSpace(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* ---------- style poziomow Bradford Factor (kolory - dane liczbowe pochodza z MEASURES) ---------- */
const TIER_STYLE = {
  Critical: { color: "#E24B4A", labelColor: "#791F1F", range: "\u2265600" },
  Urgent:   { color: "#BA7517", labelColor: "#633806", range: "400\u2013599" },
  Formal:   { color: "#C49A00", labelColor: "#7A5C00", range: "200\u2013399" },
  Monitor:  { color: "#378ADD", labelColor: "#1B3B6F", range: "100\u2013199" },
  Normal:   { color: "#639922", labelColor: "#27500A", range: "<100" },
};

const COST_PER_HOUR = MEASURES.recommendations.costPerHour;
const TOTAL_ABSENCE_PY = MEASURES.summary.totalAbsencePY;
const totalHoursYear = MEASURES.summary.totalHoursYear;
const monthTotals = MEASURES.summary.monthTotals;

/* ---------- stan filtra (wybrany miesiac z wykresu) ---------- */
let activeMonth = null; // null = caly rok, 1-12 = wybrany miesiac

/* Zamiast liczyc w przegladarce, po prostu odczytujemy gotowa "miare"
   wyliczona w Pythonie (build/compute_measures.py -> data/measures.js)
   dla danego stanu filtra i doklejamy do niej etykiety kolorow/tekstu. */
function computeStats(filterMonth) {
  const key = filterMonth ? String(filterMonth) : "null";
  const m = MEASURES.summary.byFilter[key];

  const tierStats = m.tierStats.map(t => ({ ...t, ...TIER_STYLE[t.key] }));
  const criticalStat = tierStats.find(t => t.key === "Critical");
  const topReasons = m.topReasons.map(([code, hours]) => [REASON_MAP[code] ?? "No reason given", hours]);

  return {
    totalHours: m.totalHours, totalPct: m.totalPct, avgHours: m.avgHours,
    top4: m.top4, maxTop: m.maxTop, tierStats, criticalStat,
    totalEmp: m.totalEmp, cost: m.cost, topReasons, maxReason: m.maxReason,
  };
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

/* ---------- Wykres miesieczny (dane z MEASURES, MONTH_FULL do etykiet) ---------- */
const MONTH_FULL = { 1:"January",2:"February",3:"March",4:"April",5:"May",6:"June",7:"July",8:"August",9:"September",10:"October",11:"November",12:"December" };

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
