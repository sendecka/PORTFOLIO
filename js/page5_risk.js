const DATA = EMBEDDED_DATA;
const H = "Absenteeism time in hours";
const round = (n,d=0) => { const f=Math.pow(10,d); return Math.round(n*f)/f; };
const sum = (arr,key) => arr.reduce((a,r)=>a+(Number(r[key])||0),0);
function fmtSpace(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

const TIERS = [
  { key:"Critical", min:600, max:Infinity,     color:"#E24B4A", backBorder:"#FCEAEA", emoji:"\u{1F534}", range:"Bradford \u2265600", action:"require immediate action" },
  { key:"Urgent",   min:400, max:599.999,      color:"#BA7517", backBorder:"#FAEEDA", emoji:"\u{1F7E0}", range:"Bradford \u2265400", action:"formal meeting required" },
  { key:"Formal",   min:200, max:399.999,      color:"#C49A00", backBorder:"#FFF8E6", emoji:"\u{1F7E1}", range:"Bradford \u2265200", action:"scheduled interview needed" },
  { key:"Monitor",  min:100, max:199.999,      color:"#378ADD", backBorder:"#F0F4FF", emoji:"\u{1F535}", range:"Bradford \u2265100", action:"keep under observation" },
  { key:"Normal",   min:-Infinity, max:99.999, color:"#639922", backBorder:"#EAF3DE", emoji:"\u{1F7E2}", range:"Bradford <100",  action:"no action required" },
];

const PILL_COLORS = {
  Critical: { bg:"#FBEAEA", text:"#C0392B" },
  Urgent:   { bg:"#FBF1E4", text:"#B26A17" },
  Formal:   { bg:"#FAF6DE", text:"#9E8300" },
  Monitor:  { bg:"#E7F0FC", text:"#1F6FD6" },
  Normal:   { bg:"#EEF6E6", text:"#4F8A1F" },
};

/* ============ fikcyjne dane personalne (do celow demonstracyjnych) ============ */
const NAME_POOL = [
  "Adam Nowicki","Beata Wisniewska","Cezary Zawadzki","Dorota Krawczyk","Emil Szymanski",
  "Franciszka Dabrowska","Grzegorz Lewandowski","Halina Wojcik","Ignacy Kaminski","Julia Mazur",
  "Kacper Piotrowski","Laura Grabowska","Marcin Zielinski","Natalia Krol","Oskar Jankowski",
  "Paulina Wozniak","Rafal Kozlowski","Sylwia Jablonska","Tomasz Michalski","Urszula Nowak",
  "Wiktor Adamczyk","Zofia Dudek","Bartosz Pawlak","Celina Gorska","Damian Witkowski",
  "Ewelina Sikora","Filip Baran","Gabriela Rutkowska","Hubert Wrobel","Iwona Malinowska",
  "Jakub Stepien","Klaudia Czarnecki","Leon Sadowski","Monika Wysocka","Norbert Kwiatkowski",
  "Olga Zajac",
];
const DEPARTMENTS = ["Delivery Operations", "Warehouse & Logistics", "Customer Service", "Administration & HR"];
const SUPERVISORS = {
  "Delivery Operations": "Robert Kaczmarek",
  "Warehouse & Logistics": "Anna Duda",
  "Customer Service": "Piotr Sobczak",
  "Administration & HR": "Magdalena Wilk",
};
function getProfile(id) {
  const name = NAME_POOL[(id - 1) % NAME_POOL.length];
  const dept = DEPARTMENTS[id % DEPARTMENTS.length];
  return { name, department: dept, supervisor: SUPERVISORS[dept] };
}

/* ============ per-employee Bradford Factor ============ */
const empIds = [...new Set(DATA.map(r=>r.ID))];
const employees = empIds.map(id => {
  const rows = DATA.filter(r => r.ID === id);
  const episodes = rows.filter(r => r[H] > 0).length;
  const totalHours = sum(rows, H);
  const days = totalHours / 8;
  const bradford = episodes * episodes * days;
  const age = round(sum(rows, "Age") / rows.length, 0);
  const tenure = round(sum(rows, "Service time") / rows.length, 0);
  const disciplinary = sum(rows, "Disciplinary failure");
  const tier = TIERS.find(t => bradford >= t.min && bradford <= t.max);
  return { id, episodes, totalHours, bradford, age, tenure, disciplinary, tier: tier.key, ...getProfile(id) };
}).sort((a,b) => b.bradford - a.bradford);
const totalEmp = employees.length;

/* ============ tier KPI flip cards ============ */
document.getElementById("tierRow").innerHTML = TIERS.map(t => {
  const count = employees.filter(e => e.tier === t.key).length;
  const pct = (count / totalEmp * 100).toFixed(1) + "%";
  return `
    <div class="flip-card"><div class="flip-inner">
      <div class="flip-front" style="border-left:3px solid ${t.color};">
        <div class="kpi-title">${t.emoji} ${t.key}</div>
        <div class="kpi-value" style="color:${t.color};">${count}</div>
        <div class="kpi-sub" style="color:${t.color};">employees &middot; ${t.range}</div>
      </div>
      <div class="flip-back" style="border-left:3px solid ${t.backBorder};">
        <div class="kpi-title">% of workforce</div>
        <div class="kpi-value" style="color:${t.color};">${pct}</div>
        <div class="kpi-sub" style="color:#aaaaaa;">${t.action}</div>
      </div>
    </div></div>`;
}).join("");

/* ============ tabela pracownikow ============ */
function tierStyle(key) {
  return PILL_COLORS[key];
}
document.getElementById("riskTableBody").innerHTML = employees.map(e => {
  const ts = tierStyle(e.tier);
  const idLabel = "EMP-" + String(e.id).padStart(3, "0");
  return `
    <tr data-emp-id="${e.id}">
      <td class="emp-id">${idLabel}</td>
      <td class="num">${e.age}</td>
      <td class="num">${e.episodes}</td>
      <td class="num">${fmtSpace(e.totalHours)}h</td>
      <td class="num">${fmtSpace(e.bradford)}</td>
      <td class="num">${e.disciplinary}</td>
      <td><span class="segment-pill" style="background:${ts.bg}; color:${ts.text};">${e.tier}</span></td>
    </tr>`;
}).join("");

/* ============ tooltip z danymi personalnymi (fikcyjne dane demonstracyjne) ============ */
const empTooltip = document.getElementById("empTooltip");
const empById = new Map(employees.map(e => [e.id, e]));

function renderTooltip(e) {
  empTooltip.innerHTML = `
    <p class="emp-tooltip-name">${e.name}</p>
    <table>
      <tr><td class="et-label">Department</td><td class="et-val">${e.department}</td></tr>
      <tr><td class="et-label">Supervisor</td><td class="et-val">${e.supervisor}</td></tr>
      <tr><td class="et-label">Age</td><td class="et-val">${e.age}</td></tr>
      <tr><td class="et-label">Tenure</td><td class="et-val">${e.tenure} yrs</td></tr>
    </table>
  `;
}

function positionTooltip(clientX, clientY) {
  const margin = 14;
  const rect = empTooltip.getBoundingClientRect();
  let x = clientX + margin;
  let y = clientY + margin;
  if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - margin;
  if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - margin;
  empTooltip.style.left = Math.max(8, x) + "px";
  empTooltip.style.top = Math.max(8, y) + "px";
}

document.querySelectorAll("#riskTableBody tr").forEach(row => {
  const emp = empById.get(Number(row.dataset.empId));
  if (!emp) return;

  row.addEventListener("mouseenter", (evt) => {
    renderTooltip(emp);
    positionTooltip(evt.clientX, evt.clientY);
    empTooltip.classList.add("is-visible");
  });
  row.addEventListener("mousemove", (evt) => {
    positionTooltip(evt.clientX, evt.clientY);
  });
  row.addEventListener("mouseleave", () => {
    empTooltip.classList.remove("is-visible");
  });
});

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
