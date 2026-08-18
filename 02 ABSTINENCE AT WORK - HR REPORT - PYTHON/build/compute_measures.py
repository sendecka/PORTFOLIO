"""
compute_measures.py
====================
Buduje plik `data/measures.js` na podstawie `data/Absenteeism_at_work.csv`.

Wszystkie wskazniki ("miary") wyswietlane na kazdej z 6 stron raportu sa
liczone TUTAJ, w Pythonie (pandas), a nie w przegladarce. Strony HTML/JS
tylko odczytuja gotowe, juz policzone wartosci z `data/measures.js` -
JS nie robi zadnej agregacji danych, wylacznie renderuje DOM i obsluguje
interakcje (klikniecia filtrow), przelaczajac sie miedzy gotowymi wynikami
dla poszczegolnych stanow filtra.


Wygenerowany plik: data/measures.js  (const MEASURES = {...};)
"""
import json
import math
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "Absenteeism_at_work.csv"
OUT_PATH = ROOT / "data" / "measures.js"

H = "Absenteeism time in hours"

# ---------------------------------------------------------------------------
# Wczytanie danych
# ---------------------------------------------------------------------------
df = pd.read_csv(CSV_PATH)
df.columns = [c.strip() if c != "Work load Average/day " else c for c in df.columns]

TOTAL_RECORDS = len(df)
UNIQUE_EMPLOYEES = df["ID"].nunique()
TOTAL_HOURS = float(df[H].sum())


def fmt_round(n, d=0):
    f = 10 ** d
    return round(n * f) / f if d else int(round(n))


# ---------------------------------------------------------------------------
# Wspolne: Bradford Factor (uzywane na Summary i Risk)
# ---------------------------------------------------------------------------
TIERS = [
    {"key": "Critical", "min": 600, "max": math.inf},
    {"key": "Urgent", "min": 400, "max": 599.999},
    {"key": "Formal", "min": 200, "max": 399.999},
    {"key": "Monitor", "min": 100, "max": 199.999},
    {"key": "Normal", "min": -math.inf, "max": 99.999},
]


def bradford_tier(bradford):
    for t in TIERS:
        if t["min"] <= bradford <= t["max"]:
            return t["key"]
    return "Normal"


def compute_employee_bradford(data):
    """Zwraca liste dictow: id, episodes, totalHours, bradford, age, tenure,
    disciplinary, tier - jedna pozycja na kazdego unikalnego pracownika
    w przekazanym podzbiorze danych."""
    out = []
    for emp_id, rows in data.groupby("ID"):
        episodes = int((rows[H] > 0).sum())
        emp_hours = float(rows[H].sum())
        days = emp_hours / 8
        bradford = episodes ** 2 * days
        out.append({
            "id": int(emp_id),
            "episodes": episodes,
            "totalHours": emp_hours,
            "bradford": bradford,
            "age": fmt_round(rows["Age"].mean()),
            "tenure": fmt_round(rows["Service time"].mean()),
            "disciplinary": int(rows["Disciplinary failure"].sum()),
            "tier": bradford_tier(bradford),
        })
    return out


# ===========================================================================
# STRONA 1 - HOME (statyczne liczby na okladce)
# ===========================================================================
home_measures = {
    "totalRecords": TOTAL_RECORDS,
    "uniqueEmployees": UNIQUE_EMPLOYEES,
    "totalHours": TOTAL_HOURS,
}

# ===========================================================================
# STRONA 2 - EXECUTIVE SUMMARY
# ===========================================================================
TOTAL_ABSENCE_PY = 4876  # stala z oryginalnego raportu
AVG_BENCHMARK = 5
COST_PER_HOUR = 42

MONTH_FULL = {1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
              7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December"}

month_totals = [fmt_round(df[df["Month of absence"] == m][H].sum()) for m in range(1, 13)]
total_hours_year = sum(month_totals)


def summary_stats(filter_month):
    filtered = df if filter_month is None else df[df["Month of absence"] == filter_month]

    total_hours = float(filtered[H].sum())
    total_pct = fmt_round((total_hours - TOTAL_ABSENCE_PY) / TOTAL_ABSENCE_PY * 100)
    avg_hours = fmt_round(total_hours / len(filtered), 1) if len(filtered) else 0

    per_emp_hours = filtered.groupby("ID")[H].sum().sort_values(ascending=False)
    top4 = [[int(i), float(h)] for i, h in per_emp_hours.head(4).items()]
    max_top = top4[0][1] if top4 else 1

    employees = compute_employee_bradford(filtered)
    total_emp = len(employees) or 1
    tier_stats = []
    for t in TIERS:
        members = [e for e in employees if e["tier"] == t["key"]]
        count = len(members)
        hours = sum(e["totalHours"] for e in members)
        tier_stats.append({
            "key": t["key"],
            "count": count,
            "hours": hours,
            "pctOfEmp": fmt_round(count / total_emp * 100, 1),
            "pctOfHours": fmt_round(hours / total_hours * 100) if total_hours else 0,
        })
    critical_stat = next(t for t in tier_stats if t["key"] == "Critical")
    cost = fmt_round(total_hours * COST_PER_HOUR)

    reason_totals = filtered.groupby("Reason for absence")[H].sum().sort_values(ascending=False)
    top_reasons = [[int(code), float(h)] for code, h in reason_totals.head(9).items()]
    max_reason = top_reasons[0][1] if top_reasons else 1

    return {
        "totalHours": total_hours, "totalPct": total_pct, "avgHours": avg_hours,
        "top4": top4, "maxTop": max_top, "tierStats": tier_stats,
        "criticalCount": critical_stat["count"], "criticalPctOfEmp": critical_stat["pctOfEmp"],
        "totalEmp": total_emp, "cost": cost,
        "topReasons": top_reasons, "maxReason": max_reason,
    }


summary_by_filter = {"null": summary_stats(None)}
for m in range(1, 13):
    summary_by_filter[str(m)] = summary_stats(m)

summary_measures = {
    "byFilter": summary_by_filter,
    "monthTotals": month_totals,
    "totalHoursYear": total_hours_year,
    "totalAbsencePY": TOTAL_ABSENCE_PY,
}

# ===========================================================================
# STRONA 3 - TIME TREND ANALYSIS
# ===========================================================================
DAY_MAP = {2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri"}
DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"]
MONTH_MAP = {i: m for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}
MONTH_ORDER = list(MONTH_MAP.values())
DAY_FULL = {"Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday"}


def calendar_season(month_abbr):
    if month_abbr in ("Mar", "Apr", "May"):
        return "Spring"
    if month_abbr in ("Jun", "Jul", "Aug"):
        return "Summer"
    if month_abbr in ("Sep", "Oct", "Nov"):
        return "Autumn"
    return "Winter"


trend_df = df.copy()
trend_df["DayLbl"] = trend_df["Day of the week"].map(DAY_MAP)
trend_df["MonthLbl"] = trend_df["Month of absence"].map(MONTH_MAP)
trend_df["SeasonLbl"] = trend_df["MonthLbl"].map(lambda m: calendar_season(m) if pd.notna(m) else None)

# Heatmapa: zawsze pelny rok, niezalezna od filtra (filtr tylko przygasza wizualnie)
heat_rows = []
for month in MONTH_ORDER:
    row = {"month": month, "values": {}, "total": 0}
    for day in DAY_ORDER:
        v = float(trend_df[(trend_df["MonthLbl"] == month) & (trend_df["DayLbl"] == day) &
                            (trend_df["Month of absence"] != 0)][H].sum())
        row["values"][day] = v
        row["total"] += v
    heat_rows.append(row)
heat_max = max(v for r in heat_rows for v in r["values"].values())

# Sezonowosc: zawsze pelny rok
season_totals_full = (trend_df[trend_df["SeasonLbl"].notna()]
                       .groupby("SeasonLbl")[H].sum().sort_values(ascending=False))
season_totals_full = [[s, float(h)] for s, h in season_totals_full.items()]

# Dzien tygodnia (pelny rok) - do ustalenia "highest" w skali calego roku
dow_totals_full = {d: float(trend_df[trend_df["DayLbl"] == d][H].sum()) for d in DAY_ORDER}
overall_highest_day = max(dow_totals_full, key=dow_totals_full.get)


def trend_kpis(filtered):
    scope_total = float(filtered[H].sum())

    month_hours = [(m, float(filtered[(filtered["MonthLbl"] == m) & (filtered["Month of absence"] != 0)][H].sum()))
                   for m in MONTH_ORDER]
    month_hours = [(m, h) for m, h in month_hours if h > 0]
    peak_month = max(month_hours, key=lambda x: x[1]) if month_hours else ("-", 0)

    dow_hours = [(d, float(filtered[filtered["DayLbl"] == d][H].sum())) for d in DAY_ORDER]
    peak_dow = max(dow_hours, key=lambda x: x[1])

    season_hours = (filtered[filtered["SeasonLbl"].notna()]
                    .groupby("SeasonLbl")[H].sum().sort_values(ascending=False))
    peak_season = list(season_hours.items())[0] if len(season_hours) else ("-", 0)

    day_effect = fmt_round(peak_dow[1] / scope_total * 100, 1) if scope_total else 0
    other_effect = fmt_round(100 - day_effect, 1)

    return {
        "peakMonth": peak_month[0], "peakMonthHours": peak_month[1],
        "peakDay": peak_dow[0], "peakDayHours": peak_dow[1],
        "peakSeason": peak_season[0], "peakSeasonHours": peak_season[1],
        "dayEffect": day_effect, "otherEffect": other_effect,
    }


kpi_by_filter = {"null": trend_kpis(trend_df)}
dow_by_filter = {}
for season in ["Spring", "Summer", "Autumn", "Winter"]:
    scoped = trend_df[trend_df["SeasonLbl"] == season]
    kpi_by_filter[f"season:{season}"] = trend_kpis(scoped)
    dow_sorted = [(d, float(scoped[scoped["DayLbl"] == d][H].sum())) for d in DAY_ORDER]
    dow_sorted.sort(key=lambda x: x[1], reverse=True)
    dow_by_filter[f"season:{season}"] = [[d, h] for d, h in dow_sorted]
for day in DAY_ORDER:
    scoped = trend_df[trend_df["DayLbl"] == day]
    kpi_by_filter[f"day:{day}"] = trend_kpis(scoped)

# Dzien tygodnia bez filtra (pelny rok), posortowany malejaco
dow_full_sorted = sorted(dow_totals_full.items(), key=lambda x: x[1], reverse=True)

trend_measures = {
    "heatmap": {
        "months": MONTH_ORDER, "days": DAY_ORDER,
        "rows": heat_rows, "max": heat_max,
    },
    "seasonTotalsFull": season_totals_full,
    "dowFullSorted": [[d, h] for d, h in dow_full_sorted],
    "overallHighestDay": overall_highest_day,
    "totalHours": TOTAL_HOURS,
    "kpiByFilter": kpi_by_filter,
    "dowByFilter": dow_by_filter,
}

# ===========================================================================
# STRONA 4 - ROOT CAUSE ANALYSIS
# ===========================================================================
REASON_CODES = [
    (13, "Musculoskeletal"), (19, "Injury"), (23, "Consultations"), (28, "Dental"),
    (11, "Digestive"), (22, "Patient follow-up"), (10, "Respiratory"),
]
AGE_LABELS = ["Under 30", "30 – 39", "40 – 49", "50+"]
SVC_LABELS = ["0-5 years", "6-10 years", "11-15 years", "16-20 years", "21+ years"]
EDU_LABELS = {1: "High school", 2: "Graduate", 3: "Postgrad+"}
SOC_LABELS = ["Drinkers", "Smokers", "Both", "Neither"]
DIST_LABELS = ["0–10 km", "11–20 km", "21–30 km", "30+ km"]


def age_bin(a):
    if a < 30:
        return "Under 30"
    if a < 40:
        return "30 – 39"
    if a < 50:
        return "40 – 49"
    return "50+"


def svc_bin(s):
    if s <= 5:
        return "0-5 years"
    if s <= 10:
        return "6-10 years"
    if s <= 15:
        return "11-15 years"
    if s <= 20:
        return "16-20 years"
    return "21+ years"


def soc_group(row):
    d, s = row["Social drinker"], row["Social smoker"]
    if d == 1 and s == 0:
        return "Drinkers"
    if s == 1 and d == 0:
        return "Smokers"
    if d == 1 and s == 1:
        return "Both"
    return "Neither"


def dist_bin(d):
    if d <= 10:
        return "0–10 km"
    if d <= 20:
        return "11–20 km"
    if d <= 30:
        return "21–30 km"
    return "30+ km"


root_df = df.copy()
root_df["AgeBin"] = root_df["Age"].map(age_bin)
root_df["SvcBin"] = root_df["Service time"].map(svc_bin)
root_df["SocGroup"] = root_df.apply(soc_group, axis=1)
root_df["DistBin"] = root_df["Distance from Residence to Work"].map(dist_bin)


def reason_rows(data):
    local_total = float(data[H].sum()) or 1
    entries = []
    for code, label in REASON_CODES:
        hours = float(data[data["Reason for absence"] == code][H].sum())
        entries.append([label, hours])
    entries.sort(key=lambda x: x[1], reverse=True)
    top7_sum = sum(h for _, h in entries)
    other_hours = max(0.0, float(data[H].sum()) - top7_sum)
    return {"entries": entries, "otherHours": other_hours, "localTotal": local_total}


def kpi_mini(data):
    unique_employees = data["ID"].nunique()
    per_emp_mean_age = data.groupby("ID")["Age"].mean()
    avg_age = fmt_round(per_emp_mean_age.mean(), 1) if len(per_emp_mean_age) else 0
    age_min = int(data["Age"].min()) if len(data) else 0
    age_max = int(data["Age"].max()) if len(data) else 0
    return {"uniqueEmployees": int(unique_employees), "avgAge": avg_age, "ageMin": age_min, "ageMax": age_max}


def bar_groups(data, bin_col, labels):
    groups = []
    for label in labels:
        rows = data[data[bin_col] == label]
        groups.append([label, float(rows[H].sum())])
    return groups


def social_rows(data):
    out = []
    for label in SOC_LABELS:
        rows = data[data["SocGroup"] == label]
        out.append([label, float(rows[H].sum()), int(rows["ID"].nunique())])
    return out


def education_rows(data):
    out = []
    for code in (1, 2, 3):
        rows = data[data["Education"] == code]
        out.append([EDU_LABELS[code], float(rows[H].sum())])
    return out


def distance_rows(data):
    out = []
    for label in DIST_LABELS:
        rows = data[data["DistBin"] == label]
        out.append([label, float(rows[H].sum()), int(rows["ID"].nunique())])
    return out


def root_state(data):
    return {
        "reason": reason_rows(data),
        "kpiMini": kpi_mini(data),
        "social": social_rows(data),
        "education": education_rows(data),
        "distance": distance_rows(data),
    }


root_by_filter = {"null": root_state(root_df)}
age_bars_full = bar_groups(root_df, "AgeBin", AGE_LABELS)
age_bars_full.sort(key=lambda x: x[1], reverse=True)
svc_bars_full = bar_groups(root_df, "SvcBin", SVC_LABELS)
svc_bars_full.sort(key=lambda x: x[1], reverse=True)

svc_bars_by_age = {}
for label in AGE_LABELS:
    scoped = root_df[root_df["AgeBin"] == label]
    root_by_filter[f"age:{label}"] = root_state(scoped)
    groups = bar_groups(scoped, "SvcBin", SVC_LABELS)
    groups.sort(key=lambda x: x[1], reverse=True)
    svc_bars_by_age[label] = groups

age_bars_by_svc = {}
for label in SVC_LABELS:
    scoped = root_df[root_df["SvcBin"] == label]
    root_by_filter[f"service:{label}"] = root_state(scoped)
    groups = bar_groups(scoped, "AgeBin", AGE_LABELS)
    groups.sort(key=lambda x: x[1], reverse=True)
    age_bars_by_svc[label] = groups

root_measures = {
    "byFilter": root_by_filter,
    "ageBarsFull": age_bars_full,
    "svcBarsFull": svc_bars_full,
    "svcBarsByAge": svc_bars_by_age,
    "ageBarsBySvc": age_bars_by_svc,
    "totalHours": TOTAL_HOURS,
}

# ===========================================================================
# STRONA 5 - RISK SCORING (Bradford Factor per employee)
# ===========================================================================
risk_employees = compute_employee_bradford(df)
risk_employees.sort(key=lambda e: e["bradford"], reverse=True)
total_emp_risk = len(risk_employees)
tier_counts = []
for t in TIERS:
    count = sum(1 for e in risk_employees if e["tier"] == t["key"])
    tier_counts.append({"key": t["key"], "count": count,
                         "pct": fmt_round(count / total_emp_risk * 100, 1) if total_emp_risk else 0})

risk_measures = {
    "employees": risk_employees,
    "tierCounts": tier_counts,
    "totalEmp": total_emp_risk,
}

# ===========================================================================
# STRONA 6 - RECOMMENDATIONS & ACTION
# ===========================================================================
SAVINGS_PCT = 20
annual_cost = fmt_round(TOTAL_HOURS * COST_PER_HOUR)
potential_savings = fmt_round(annual_cost * SAVINGS_PCT / 100)
target_cost = fmt_round((annual_cost - potential_savings) / 1000)

rec_employees = compute_employee_bradford(df)
critical_count = sum(1 for e in rec_employees if e["bradford"] >= 600)

monday_hours = float(df[df["Day of the week"] == 2][H].sum())
monday_pct = fmt_round(monday_hours / TOTAL_HOURS * 100, 1)

avg_monthly_hours = fmt_round(TOTAL_HOURS / 12)
benchmark_monthly = 350

musculo_hours = float(df[df["Reason for absence"] == 13][H].sum())
injury_hours = float(df[df["Reason for absence"] == 19][H].sum())
combined1 = musculo_hours + injury_hours
combined1_pct = math.floor(combined1 / TOTAL_HOURS * 100)

recommendations_measures = {
    "annualCost": annual_cost,
    "potentialSavings": potential_savings,
    "targetCost": target_cost,
    "criticalCount": critical_count,
    "mondayPct": monday_pct,
    "avgMonthlyHours": avg_monthly_hours,
    "benchmarkMonthly": benchmark_monthly,
    "combined1Hours": combined1,
    "combined1Pct": combined1_pct,
    "savingsPct": SAVINGS_PCT,
    "costPerHour": COST_PER_HOUR,
}

# ===========================================================================
# ZAPIS
# ===========================================================================
MEASURES = {
    "home": home_measures,
    "summary": summary_measures,
    "trend": trend_measures,
    "rootcause": root_measures,
    "risk": risk_measures,
    "recommendations": recommendations_measures,
}

OUT_PATH.write_text("const MEASURES = " + json.dumps(MEASURES, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"OK: napisano {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.1f} KB)")
