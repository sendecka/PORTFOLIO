/* ---------- etykiety (formatowanie, nie liczenie - liczby pochodza z MEASURES) ---------- */
const DAY_ORDER = ["Mon","Tue","Wed","Thu","Fri"];
const MONTH_ORDER = MEASURES.trend.heatmap.months;
const MONTH_FULL = { Jan:"January", Feb:"February", Mar:"March", Apr:"April", May:"May", Jun:"June",
  Jul:"July", Aug:"August", Sep:"September", Oct:"October", Nov:"November", Dec:"December" };
const DAY_FULL = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday" };

const round = (n,d=0) => { const f=Math.pow(10,d); return Math.round(n*f)/f; };
function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

const totalHours = MEASURES.trend.totalHours;

/* Sezony: kalendarz polnocnej polkuli (Polska) - przeliczone juz w Pythonie
   (build/compute_measures.py), nie wg oryginalnej kolumny "Seasons" ze
   zrodlowych danych (ktora odzwierciedla polkule poludniowa - Brazylia). */
const SEASON_MONTHS = {
  Spring: ["Mar","Apr","May"],
  Summer: ["Jun","Jul","Aug"],
  Autumn: ["Sep","Oct","Nov"],
  Winter: ["Dec","Jan","Feb"],
};
const monthsBySeason = {};
Object.entries(SEASON_MONTHS).forEach(([season, months]) => {
  monthsBySeason[season] = new Set(months);
});

/* ---------- heatmapa: dane gotowe z MEASURES (zawsze pelny rok), filtr tylko przygasza komorki ---------- */
const heatData = MEASURES.trend.heatmap.rows;
const heatMax = MEASURES.trend.heatmap.max;

function heatColor(v) {
  const t = heatMax === 0 ? 0 : v / heatMax;
  const from = [237, 241, 247];
  const to = [17, 45, 89];
  const rgb = from.map((c,i) => Math.round(c + (to[i]-c)*t));
  return { bg: `rgb(${rgb.join(",")})`, text: t > 0.45 ? "#fff" : "#3A4150", bold: t > 0.45 };
}

function renderHeatmap(filter) {
  let heatHtml = '<table class="heatmap-table"><thead><tr><th class="row-head-col"></th>';
  DAY_ORDER.forEach(d => {
    const dim = filter && filter.type === 'day' && filter.value !== d;
    heatHtml += `<th class="${dim?'dimmed-cell':''}">${d}</th>`;
  });
  heatHtml += '<th class="total-col">Total</th></tr></thead><tbody>';
  heatData.forEach(row => {
    const rowDim = filter && filter.type === 'season' && !(monthsBySeason[filter.value] && monthsBySeason[filter.value].has(row.month));
    heatHtml += `<tr class="${rowDim?'dimmed-row':''}"><td class="month-label">${row.month}</td>`;
    DAY_ORDER.forEach(d => {
      const v = row.values[d];
      const c = heatColor(v);
      const colDim = filter && filter.type === 'day' && filter.value !== d;
      heatHtml += `<td class="${colDim?'dimmed-cell':''}" style="background:${c.bg}; color:${c.text}; font-weight:${c.bold?700:400};">${fmtSpace(v)}</td>`;
    });
    heatHtml += `<td class="total-cell">${fmtSpace(row.total)}</td></tr>`;
  });
  heatHtml += '</tbody></table>';
  document.getElementById("heatmapWrap").innerHTML = heatHtml;
}

/* ---------- KPI dla biezacego filtra: odczyt gotowej miary z MEASURES ---------- */
function computeStats(filter) {
  const key = !filter ? "null" : `${filter.type}:${filter.value}`;
  const k = MEASURES.trend.kpiByFilter[key];
  return {
    peakMonthRow: { month: k.peakMonth, hours: k.peakMonthHours },
    peakDow: { day: k.peakDay, hours: k.peakDayHours },
    peakSeason: [k.peakSeason, k.peakSeasonHours],
    dayEffect: k.dayEffect,
    otherEffect: k.otherEffect,
  };
}

let activeFilter = null; // null | {type:'season'|'day', value}

function renderKPIs(filter) {
  const s = computeStats(filter);

  document.getElementById("kpiRow").innerHTML = `
    <div class="flip-card"><div class="flip-inner">
      <div class="flip-front">
        <p class="kpi-title">Peak Month</p>
        <div class="kpi-value">${s.peakMonthRow.month === "-" ? "-" : MONTH_FULL[s.peakMonthRow.month]}</div>
      </div>
      <div class="flip-back">
        <p class="kpi-title">Peak Month In Hours</p>
        <div class="kpi-value">${Math.round(s.peakMonthRow.hours)}</div>
      </div>
    </div></div>

    <div class="flip-card"><div class="flip-inner">
      <div class="flip-front">
        <p class="kpi-title">Peak Day</p>
        <div class="kpi-value">${DAY_FULL[s.peakDow.day]}</div>
      </div>
      <div class="flip-back">
        <p class="kpi-title">Peak Day In Hours</p>
        <div class="kpi-value">${fmtSpace(s.peakDow.hours)}</div>
      </div>
    </div></div>

    <div class="flip-card"><div class="flip-inner">
      <div class="flip-front">
        <p class="kpi-title">Peak Season</p>
        <div class="kpi-value">${s.peakSeason[0]}</div>
      </div>
      <div class="flip-back">
        <p class="kpi-title">Peak Season In Hours</p>
        <div class="kpi-value">${fmtSpace(s.peakSeason[1])}</div>
      </div>
    </div></div>

    <div class="flip-card"><div class="flip-inner">
      <div class="flip-front">
        <p class="kpi-title">${DAY_FULL[s.peakDow.day]} Effect</p>
        <div class="kpi-value">${s.dayEffect}%</div>
      </div>
      <div class="flip-back">
        <p class="kpi-title">${s.peakDow.day} vs rest of scope</p>
        <div class="tier-row">
          <span class="tier-label" style="color:#E24B4A;">${s.peakDow.day}</span>
          <div class="tier-bar-bg"><div class="tier-bar" data-w="${s.dayEffect}" style="background:#E24B4A;"></div></div>
          <span class="tier-pct">${s.dayEffect}%</span>
        </div>
        <div class="tier-row">
          <span class="tier-label" style="color:#378ADD;">Rest</span>
          <div class="tier-bar-bg"><div class="tier-bar" data-w="${s.otherEffect}" style="background:#378ADD;"></div></div>
          <span class="tier-pct">${s.otherEffect}%</span>
        </div>
      </div>
    </div></div>
  `;

  requestAnimationFrame(() => {
    document.querySelectorAll(".flip-card .tier-bar").forEach(el => { el.style.width = el.dataset.w + "%"; });
  });
}

/* ---------- sezonowosc: dane gotowe z MEASURES, wysokosc slupka w px (nie %, zeby ominac blad flex-column) ---------- */
const seasonTotalsFull = MEASURES.trend.seasonTotalsFull;
const BAR_MAX_PX = 92;

function renderSeasonBars(filter) {
  document.getElementById("seasonSub").textContent = `Total ${fmtSpace(totalHours)}h across 4 seasons`;
  const maxSeason = seasonTotalsFull[0][1];
  document.getElementById("seasonBars").innerHTML = seasonTotalsFull.map(([name, hours], i) => {
    const pctOfTotal = round(hours/totalHours*100, 1);
    const heightPx = round(hours/maxSeason*BAR_MAX_PX);
    const cls = i === 0 ? "highlight" : (i === 1 ? "second" : "");
    const isPicked = filter && filter.type === 'season' && filter.value === name;
    const dimmed = filter && filter.type === 'season' && filter.value !== name;
    return `
      <div class="season-bar-col ${dimmed?'dimmed':''}" data-season="${name}">
        <div class="season-bar-value">${fmtSpace(hours)}h</div>
        <div class="season-bar ${isPicked?'picked':cls}" data-h="${heightPx}"></div>
        <div class="season-bar-pct ${cls}">${pctOfTotal}%</div>
        <div class="season-bar-name">${name}</div>
      </div>`;
  }).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".season-bar").forEach(el => { el.style.height = el.dataset.h + "px"; });
  });

  document.querySelectorAll(".season-bar-col").forEach(col => {
    col.addEventListener("click", () => {
      const val = col.dataset.season;
      activeFilter = (activeFilter && activeFilter.type === 'season' && activeFilter.value === val) ? null : { type: 'season', value: val };
      renderEverything();
    });
  });
}

/* ---------- dzien tygodnia: dane gotowe z MEASURES (pelny rok lub scoped wg sezonu) ---------- */
const dowSortedFull = MEASURES.trend.dowFullSorted.map(([day, hours]) => ({ day, hours }));
const overallHighestDay = MEASURES.trend.overallHighestDay;

function renderDowList(filter) {
  /* filtr typu 'season' zawęza dzien-tygodnia do tego sezonu; filtr 'day' nie zawęza
     wlasnej listy (bo redukowalby ja do jednej pozycji) - pokazuje wtedy pelny rok */
  const dowSorted = (filter && filter.type === 'season')
    ? MEASURES.trend.dowByFilter[`season:${filter.value}`].map(([day, hours]) => ({ day, hours }))
    : dowSortedFull;
  const dowSum = dowSorted.reduce((a, d) => a + d.hours, 0);
  const scopeHighestDay = dowSorted.length ? dowSorted[0].day : null;

  const title = document.getElementById("dowTitle");
  if (title) title.textContent = filter && filter.type === 'season'
    ? `Day-of-week pattern · ${filter.value}`
    : `Day-of-week pattern (total hours)`;

  document.getElementById("dowList").innerHTML = dowSorted.map((d, i) => {
    const isHighestInScope = d.day === scopeHighestDay;
    const widthPct = dowSum ? round(d.hours/dowSum*100, 1) : 0;
    const isPicked = filter && filter.type === 'day' && filter.value === d.day;
    const dimmed = filter && filter.type === 'day' && filter.value !== d.day;
    return `
      <div class="dow-row ${dimmed?'dimmed':''}" data-day="${d.day}">
        <div class="dow-label">${d.day}</div>
        <div class="dow-track ${isHighestInScope||isPicked?'highlight':''}"><div class="dow-fill ${isHighestInScope||isPicked?'highlight':''}" data-w="${widthPct}"></div></div>
        <div class="dow-value ${isHighestInScope?'highlight':''}">${fmtSpace(d.hours)}h${isHighestInScope?' — highest':''}</div>
      </div>`;
  }).join("");

  requestAnimationFrame(() => {
    document.querySelectorAll(".dow-fill").forEach(el => { el.style.width = el.dataset.w + "%"; });
  });

  document.querySelectorAll(".dow-row").forEach(row => {
    row.addEventListener("click", () => {
      const val = row.dataset.day;
      activeFilter = (activeFilter && activeFilter.type === 'day' && activeFilter.value === val) ? null : { type: 'day', value: val };
      renderEverything();
    });
  });
}

/* ---------- plakietka filtra ---------- */
function renderFilterBadge(filter) {
  const badge = document.getElementById("filterBadge");
  if (filter) {
    badge.style.display = "inline-flex";
    const label = filter.type === 'season' ? filter.value : DAY_FULL[filter.value];
    badge.querySelector(".fb-label").textContent = label;
  } else {
    badge.style.display = "none";
  }
}

function renderEverything() {
  renderHeatmap(activeFilter);
  renderKPIs(activeFilter);
  renderSeasonBars(activeFilter);
  renderDowList(activeFilter);
  renderFilterBadge(activeFilter);
}

document.getElementById("fbClear").addEventListener("click", () => {
  activeFilter = null;
  renderEverything();
});

renderEverything();

/* ---------- nawigacja (placeholder) ---------- */
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
