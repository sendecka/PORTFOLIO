"""
generate_dashboard.py
======================
Wczytuje surowe dane z dane_hr.xlsx, liczy w Pythonie (pandas) wszystkie
wskaźniki, trendy, rankingi, wyniki złożone i zakresy heatmapy dla KAŻDEJ
kombinacji filtrów (okres x dział x lokalizacja x poziom), a następnie
zapisuje gotowy, interaktywny panel jako panel-hr-oceny-ankiety.html.

Plik HTML nie liczy żadnych wskaźników biznesowych w przeglądarce –
JavaScript wyłącznie odczytuje gotowe wyniki z tego skryptu i je
renderuje / animuje.

Użycie:
    python generate_dashboard.py
    (opcjonalnie: python generate_dashboard.py inny_plik.xlsx inny_wynik.html)
"""
import sys
import json
import datetime
import pandas as pd

XLSX_PATH = sys.argv[1] if len(sys.argv) > 1 else "dane_hr.xlsx"
TEMPLATE_PATH = "panel_template.html"
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "panel-hr-oceny-ankiety.html"

DRIVER_LABELS = {
    'comp': 'Wynagrodzenie i benefity',
    'growth': 'Rozwój zawodowy',
    'balance': 'Równowaga praca–życie',
    'leader': 'Relacja z przełożonym',
    'team': 'Współpraca w zespole',
}
DRIVER_COLS = {
    'comp': 'wynagrodzenie_benefity', 'growth': 'rozwoj_zawodowy', 'balance': 'balans_praca_zycie',
    'leader': 'relacja_przelozony', 'team': 'wspolpraca_zespol',
}

# ---------------------------------------------------------------- helpers --
def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def kkey(*parts):
    return "::".join(str(p) for p in parts)


# ------------------------------------------------------------- wczytanie --
xls = pd.ExcelFile(XLSX_PATH)
df_dzialy      = pd.read_excel(xls, "Dzialy")
df_kwartalne   = pd.read_excel(xls, "Wyniki_kwartalne").sort_values(["dzial_id", "kwartal_idx"])
df_roczne      = pd.read_excel(xls, "Wskazniki_roczne")
df_czynniki    = pd.read_excel(xls, "Czynniki_satysfakcji")
df_lokalizacje = pd.read_excel(xls, "Lokalizacje")
df_poziomy     = pd.read_excel(xls, "Poziomy")
df_okresy      = pd.read_excel(xls, "Okresy")
df_segmentacja = pd.read_excel(xls, "Segmentacja")

DEPT_IDS = df_dzialy["id"].tolist()
QUARTERS = (df_kwartalne[df_kwartalne["dzial_id"] == DEPT_IDS[0]]
            .sort_values("kwartal_idx")["kwartal_etykieta"].tolist())
N_Q = len(QUARTERS)
TOTAL_HC = int(df_dzialy["liczba_pracownikow"].sum())

# indeksy pomocnicze
dzialy_by_id = df_dzialy.set_index("id").to_dict("index")
roczne_by_id = df_roczne.set_index("dzial_id").to_dict("index")
czynniki_by_id = df_czynniki.set_index("dzial_id").to_dict("index")
loc_factor = dict(zip(df_lokalizacje["id"], df_lokalizacje["wspolczynnik"]))
lvl_factor = dict(zip(df_poziomy["id"], df_poziomy["wspolczynnik"]))
okresy_by_id = df_okresy.set_index("id").to_dict("index")

# trend[dept_id] = (lista 12 wartosci zaangazowania, lista 12 wartosci enps)
trend_eng = {}
trend_enps = {}
for did in DEPT_IDS:
    sub = df_kwartalne[df_kwartalne["dzial_id"] == did].sort_values("kwartal_idx")
    trend_eng[did] = sub["zaangazowanie"].tolist()
    trend_enps[did] = sub["enps"].tolist()

# organizacja = srednia wazona headcountem, punkt po punkcie
org_trend_eng = []
org_trend_enps = []
for i in range(N_Q):
    s_e = sum(trend_eng[d][i] * dzialy_by_id[d]["liczba_pracownikow"] for d in DEPT_IDS)
    s_n = sum(trend_enps[d][i] * dzialy_by_id[d]["liczba_pracownikow"] for d in DEPT_IDS)
    org_trend_eng.append(s_e / TOTAL_HC)
    org_trend_enps.append(s_n / TOTAL_HC)
trend_eng['all'] = org_trend_eng
trend_enps['all'] = org_trend_enps

def scalar_for(dept_id, field):
    """Zwraca skalar (satysfakcja/response/performance/turnover) dla dzialu lub
    sredniej wazonej calej organizacji."""
    if dept_id == 'all':
        s = sum(roczne_by_id[d][field] * dzialy_by_id[d]["liczba_pracownikow"] for d in DEPT_IDS)
        return s / TOTAL_HC
    return roczne_by_id[dept_id][field]

def engagement_now(dept_id, period_id):
    p = okresy_by_id[period_id]
    tr = trend_eng[dept_id]
    if p["tryb"] == "year":
        return sum(tr[8:12]) / 4
    return tr[int(p["kwartal_idx"])]

def enps_now(dept_id, period_id):
    p = okresy_by_id[period_id]
    tr = trend_enps[dept_id]
    if p["tryb"] == "year":
        return sum(tr[8:12]) / 4
    return tr[int(p["kwartal_idx"])]

def engagement_prev(dept_id, period_id):
    p = okresy_by_id[period_id]
    tr = trend_eng[dept_id]
    if p["tryb"] == "year":
        return sum(tr[4:8]) / 4
    idx = max(0, int(p["kwartal_idx"]) - 1)
    return tr[idx]

# ------------------------------------------------------ kombinacje filtrow --
PERIOD_IDS = df_okresy["id"].tolist()
LOC_IDS = df_lokalizacje["id"].tolist()
LVL_IDS = df_poziomy["id"].tolist()
ALL_DEPT_OPTIONS = ["all"] + DEPT_IDS

kpi_table = {}
for period_id in PERIOD_IDS:
    for dept_id in ALL_DEPT_OPTIONS:
        for loc_id in LOC_IDS:
            for lvl_id in LVL_IDS:
                f = loc_factor[loc_id] * lvl_factor[lvl_id]

                engagement = clamp(engagement_now(dept_id, period_id) * f, 0, 100)
                enps = clamp(enps_now(dept_id, period_id) * f, -100, 100)
                satisfaction = clamp(scalar_for(dept_id, "satysfakcja_1_5") * f, 1, 5)
                response = clamp(scalar_for(dept_id, "response_rate_pct") * f, 0, 100)
                performance = clamp(scalar_for(dept_id, "ocena_okresowa_1_5") * f, 1, 5)
                turnover = clamp(scalar_for(dept_id, "ryzyko_rotacji_pct") * (2 - f), 0, 100)

                prev_engagement = clamp(engagement_prev(dept_id, period_id) * f, 0, 100)
                engagement_delta = engagement - prev_engagement
                score = engagement * 0.5 + (enps + 100) / 2 * 0.3 + (satisfaction / 5 * 100) * 0.2

                kpi_table[kkey(period_id, dept_id, loc_id, lvl_id)] = {
                    "engagement": round(engagement, 2),
                    "enps": round(enps, 2),
                    "satisfaction": round(satisfaction, 3),
                    "response": round(response, 2),
                    "performance": round(performance, 3),
                    "turnover": round(turnover, 2),
                    "engagement_delta": round(engagement_delta, 2),
                    "score": round(score, 2),
                    # ilustracyjne, stałe delty dla wskaźników bez własnej serii czasowej w danych źródłowych
                    "static_deltas": {"response": 4.6, "enps": 5.2, "performance": 0.12, "turnover": -2.1},
                }

# trend_table: dept(w tym 'all') x loc x lvl -> {engagement:[12], enps:[12]}
trend_table = {}
for dept_id in ALL_DEPT_OPTIONS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            f = loc_factor[loc_id] * lvl_factor[lvl_id]
            eng_series = [clamp(v * f, 0, 100) for v in trend_eng[dept_id]]
            enps_series = [clamp(v * f, -100, 100) for v in trend_enps[dept_id]]
            trend_table[kkey(dept_id, loc_id, lvl_id)] = {
                "engagement": [round(v, 2) for v in eng_series],
                "enps": [round(v, 2) for v in enps_series],
            }

# spark_table: dept (tylko rzeczywiste) x loc x lvl -> ostatnie 6 kwartalow zaangazowania
spark_table = {}
for dept_id in DEPT_IDS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            f = loc_factor[loc_id] * lvl_factor[lvl_id]
            last6 = [clamp(v * f, 0, 100) for v in trend_eng[dept_id][6:12]]
            spark_table[kkey(dept_id, loc_id, lvl_id)] = [round(v, 2) for v in last6]

# driver_table: dept x loc x lvl -> 5 czynnikow + best/worst
driver_table = {}
for dept_id in DEPT_IDS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            f = loc_factor[loc_id] * lvl_factor[lvl_id]
            vals = {k: clamp(czynniki_by_id[dept_id][DRIVER_COLS[k]] * f, 0, 100) for k in DRIVER_COLS}
            best_key = max(vals, key=vals.get)
            worst_key = min(vals, key=vals.get)
            entry = {k: round(v, 1) for k, v in vals.items()}
            entry["best_key"] = best_key
            entry["worst_key"] = worst_key
            driver_table[kkey(dept_id, loc_id, lvl_id)] = entry

# table_ranges: period x loc x lvl -> min/max per kolumna (do heatmapy tabeli porownawczej)
table_ranges = {}
METRIC_KEYS = ["engagement", "satisfaction", "enps", "response", "turnover"]
for period_id in PERIOD_IDS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            rows = [kpi_table[kkey(period_id, d, loc_id, lvl_id)] for d in DEPT_IDS]
            ranges = {}
            for mkey in METRIC_KEYS:
                vals = [r[mkey] for r in rows]
                ranges[mkey] = {"min": min(vals), "max": max(vals)}
            table_ranges[kkey(period_id, loc_id, lvl_id)] = ranges

# compare_order: period x loc x lvl -> [{dept_id, value}] posortowane malejaco wg engagement
compare_order = {}
for period_id in PERIOD_IDS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            rows = [{"dept_id": d, "value": kpi_table[kkey(period_id, d, loc_id, lvl_id)]["engagement"]}
                    for d in DEPT_IDS]
            rows.sort(key=lambda r: r["value"], reverse=True)
            compare_order[kkey(period_id, loc_id, lvl_id)] = rows

# response_order: loc x lvl -> [{dept_id, value}] malejaco wg response rate (niezalezne od okresu)
response_order = {}
for loc_id in LOC_IDS:
    for lvl_id in LVL_IDS:
        rows = [{"dept_id": d, "value": scalar_for(d, "response_rate_pct") * loc_factor[loc_id] * lvl_factor[lvl_id]}
                for d in DEPT_IDS]
        for r in rows:
            r["value"] = round(clamp(r["value"], 0, 100), 2)
        rows.sort(key=lambda r: r["value"], reverse=True)
        response_order[kkey(loc_id, lvl_id)] = rows

# rank_order: period x loc x lvl -> [{dept_id, score, delta}] malejaco wg score (wynik zlozony)
rank_order = {}
for period_id in PERIOD_IDS:
    for loc_id in LOC_IDS:
        for lvl_id in LVL_IDS:
            rows = []
            for d in DEPT_IDS:
                kpi = kpi_table[kkey(period_id, d, loc_id, lvl_id)]
                spark = spark_table[kkey(d, loc_id, lvl_id)]
                delta = round(spark[-1] - spark[0], 2)
                rows.append({"dept_id": d, "score": kpi["score"], "delta": delta})
            rows.sort(key=lambda r: r["score"], reverse=True)
            rank_order[kkey(period_id, loc_id, lvl_id)] = rows

# ------------------------------------------------------------ payload JSON --
data = {
    "meta": {
        "generated_at": datetime.datetime.now().strftime("%-d %B %Y").replace(
            # proste, zaleznosciowo-wolne tlumaczenie nazw miesiecy na PL
            "January", "stycznia").replace("February", "lutego").replace("March", "marca")
            .replace("April", "kwietnia").replace("May", "maja").replace("June", "czerwca")
            .replace("July", "lipca").replace("August", "sierpnia").replace("September", "września")
            .replace("October", "października").replace("November", "listopada").replace("December", "grudnia"),
        "total_headcount": TOTAL_HC,
        "n_departments": len(DEPT_IDS),
        "n_quarters": N_Q,
    },
    "quarters": QUARTERS,
    "departments": [
        {"id": d, "name": dzialy_by_id[d]["nazwa"], "icon": dzialy_by_id[d]["ikona"],
         "headcount": int(dzialy_by_id[d]["liczba_pracownikow"])}
        for d in DEPT_IDS
    ],
    "periods": [{"id": r["id"], "label": r["etykieta"]} for r in df_okresy.to_dict("records")],
    "locations": [{"id": r["id"], "label": r["nazwa"]} for r in df_lokalizacje.to_dict("records")],
    "levels": [{"id": r["id"], "label": r["nazwa"]} for r in df_poziomy.to_dict("records")],
    "donut": [{"label": r["segment"], "pct": r["procent"], "color": r["kolor"]} for r in df_segmentacja.to_dict("records")],
    "driver_labels": DRIVER_LABELS,
    "kpi": kpi_table,
    "trend": trend_table,
    "spark": spark_table,
    "drivers": driver_table,
    "table_ranges": table_ranges,
    "compare_order": compare_order,
    "response_order": response_order,
    "rank_order": rank_order,
}

data_json = json.dumps(data, ensure_ascii=False)
data_json_safe = data_json.replace("</", "<\\/")  # bezpieczne osadzenie w <script>

with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
    template = f.read()

out_html = template.replace("__DATA_JSON__", data_json_safe)

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(out_html)

n_combos = len(kpi_table)
print(f"OK: wczytano {len(DEPT_IDS)} działów, {N_Q} kwartałów z {XLSX_PATH}")
print(f"Policzono {n_combos} kombinacji filtrów (okres x dział x lokalizacja x poziom)")
print(f"Zapisano gotowy panel: {OUT_PATH}  ({len(out_html)/1024:.0f} KB)")
