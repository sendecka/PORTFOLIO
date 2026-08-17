# Dokumentacja projektu — Absence Analytics (HR Report)

Interaktywny raport analizy absencji pracowniczej, odtworzony na podstawie oryginalnego
raportu Power BI i rozbudowany o dodatkowe analizy, interakcje i wizualizacje. Wszystkie
liczby na każdej stronie liczone są **dynamicznie w przeglądarce** na podstawie
rzeczywistych danych źródłowych — żadna wartość nie jest zaszyta na sztywno.

---

## 1. Spis treści

1. [Przegląd projektu](#1-spis-treści)
2. [Źródło danych](#2-źródło-danych)
3. [Architektura techniczna](#3-architektura-techniczna)
4. [Struktura plików](#4-struktura-plików)
5. [Opis stron](#5-opis-stron)
   - [5.1 Home](#51-strona-1--home-okładka)
   - [5.2 Summary](#52-strona-2--executive-summary)
   - [5.3 Time Trend](#53-strona-3--time-trend-analysis)
   - [5.4 Root Cause](#54-strona-4--root-cause-analysis)
   - [5.5 Risk](#55-strona-5--risk-scoring)
   - [5.6 Recommendations](#56-strona-6--recommendations--action)
6. [Kluczowe wzory i metodologia](#6-kluczowe-wzory-i-metodologia)
7. [Założenia i zastrzeżenia](#7-założenia-i-zastrzeżenia)
8. [Uruchomienie i wdrożenie](#8-uruchomienie-i-wdrożenie)
9. [Znane ograniczenia](#9-znane-ograniczenia)

---

## 2. Źródło danych

Projekt bazuje na publicznym zbiorze danych **Absenteeism at Work** (UCI Machine
Learning Repository) — 740 rekordów absencji dla 36 pracowników firmy kurierskiej.

Plik: `data/Absenteeism_at_work.csv`

Kluczowe kolumny wykorzystywane w raporcie:

| Kolumna | Opis |
|---|---|
| `ID` | Identyfikator pracownika (1–36) |
| `Reason for absence` | Kod powodu nieobecności (0–28, wg klasyfikacji ICD) |
| `Month of absence` | Miesiąc (1–12, 0 = brak danych) |
| `Day of the week` | Dzień tygodnia (2=Pon … 6=Pt) |
| `Seasons` | Kod sezonu (1–4) — **uwaga: konwencja z Brazylii, patrz sekcja 6.3** |
| `Age` | Wiek pracownika |
| `Education` | Poziom wykształcenia (1–4) |
| `Social drinker` / `Social smoker` | Flaga 0/1 |
| `Distance from Residence to Work` | Odległość od domu do pracy (km) |
| `Service time` | Staż pracy (lata) |
| `Disciplinary failure` | Flaga nieobecności dyscyplinarnej (0/1) |
| `Absenteeism time in hours` | Liczba godzin nieobecności (kluczowa metryka) |

Oryginalny raport Power BI (`ANALYSIS_OF_ABSTINENCE_AT_WORK.pbix`) korzystał z
połączenia na żywo (live connection) do Power BI Service — sam plik `.pbix` nie
zawierał danych, tylko definicję wizualizacji. Dane rzeczywiste dostarczono osobno
jako plik CSV.

---

## 3. Architektura techniczna

### 3.1 Stos technologiczny

- **Czysty HTML/CSS/JavaScript** — brak frameworków, brak build stepu
- **Chart.js 4.4.4** — wbudowany bezpośrednio w plik (nie z CDN!) dla wykresu
  liniowego na stronie Summary
- Dane osadzone jako JSON bezpośrednio w każdym pliku HTML (`EMBEDDED_DATA`)

### 3.2 Struktura wielu plików (CSS / JS / dane oddzielone)

Każda strona ma trzy powiązane pliki:
- `pages/pageN_x.html` — sama struktura HTML (bez stylów i logiki w środku)
- `css/pageN_x.css` — arkusz stylów tej strony
- `js/pageN_x.js` — logika renderowania i interakcji tej strony

Dodatkowo dwa pliki współdzielone przez wszystkie strony:
- `data/data.js` — pełny zbiór danych (740 rekordów) jako zmienna JS
  (`const EMBEDDED_DATA = [...]`)
- `vendor/chart.umd.js` — biblioteka Chart.js (używana tylko przez stronę Summary)

### 3.3 Dlaczego dane są plikiem `.js`, a nie `.json` wczytywanym przez `fetch()`?

To świadoma decyzja, zweryfikowana empirycznie: gdy plik HTML otwierany jest
bezpośrednio z dysku (`file://`, czyli podwójne kliknięcie), przeglądarki
**blokują** `fetch()`/`XMLHttpRequest` lokalnych plików ze względów
bezpieczeństwa (CORS) — próba wczytania `data.json` przez `fetch()` kończy się
błędem `Failed to fetch`.

Natomiast wczytywanie pliku przez `<script src="data.js">` (tak jak zwykły
plik JS) **działa poprawnie nawet z dysku** — to inny mechanizm przeglądarki,
nieobjęty tym ograniczeniem. Dlatego dane są plikiem `.js` definiującym zmienną
globalną, a nie plikiem `.json` wczytywanym asynchronicznie.

Dzięki temu projekt zachowuje **pełną strukturę wieloplikową** (łatwą do
przeglądania i edycji), a jednocześnie **działa offline** po zwykłym
dwukrotnym kliknięciu `index.html` — bez serwera.

### 3.4 Dlaczego Chart.js jest plikiem lokalnym, a nie ładowany z CDN?

**Podczas testów wykryto realny problem:** w niektórych środowiskach
(sandboxy podglądu plików, ograniczone środowiska firmowe) ładowanie
biblioteki z zewnętrznego CDN (`cdnjs.cloudflare.com`) nie powiodło się, co
powodowało błąd `Chart is not defined` i — w efekcie kaskadowym — psuło
renderowanie innych elementów strony w tym samym bloku skryptu. Trzymanie
biblioteki lokalnie (`vendor/chart.umd.js`) eliminuje to ryzyko całkowicie.

### 3.5 Jak działa `index.html` (scalona aplikacja)

`index.html` łączy wszystkich 6 stron w jedną aplikację przy użyciu
**elementów `<iframe src="pages/...">`** wskazujących na rzeczywiste pliki —
każda strona renderuje się w swojej własnej, odizolowanej ramce, z własnym
kontekstem CSS/JS i własną, poprawnie rozwiązywaną ścieżką do plików
(`../css/...`, `../js/...`, `../data/data.js`).

**Dlaczego iframe, a nie jeden wspólny dokument?**
Każda strona ma osobny arkusz stylów z tymi samymi nazwami klas (`.card`,
`.kpi-value`, `.hrow-label` itd.), ale różnymi regułami CSS dopasowanymi do
kontekstu danej strony (np. ciemny motyw na stronie Home vs. jasny na
pozostałych). Scalenie wszystkiego do jednego DOM spowodowałoby konflikty
nazw klas i nadpisywanie się stylów. Iframe daje każdej stronie w pełni
izolowany kontekst, bez żadnych konfliktów.

**Mechanizm nawigacji (`window.postMessage`):**

```
┌─────────────────────────────────────────┐
│  index.html (powłoka / "shell")          │
│                                           │
│  ┌───────────┐  ┌───────────┐            │
│  │ iframe     │  │ iframe     │  ...      │
│  │ src=       │  │ src=       │           │
│  │ pages/     │  │ pages/     │           │
│  │ page1_...  │  │ page2_...  │           │
│  │ [Nawigacja]│  │ [Nawigacja]│           │
│  └─────┬──────┘  └─────┬──────┘           │
│        │  postMessage   │                 │
│        │  {type:        │                 │
│        │   'navigate',  │                 │
│        │   page:'risk'} │                 │
│        ▼                ▼                 │
│   window.addEventListener('message', …)   │
│   → przełącza display: block/none         │
└─────────────────────────────────────────┘
```

1. Kliknięcie przycisku w pasku nawigacji na dowolnej stronie wysyła komunikat
   `window.parent.postMessage({type: 'navigate', page: 'risk'}, '*')`
2. Powłoka (`index.html`, logika w `js/shell.js`) nasłuchuje na te komunikaty
   i przełącza, która ramka ma `display: block`, a które `display: none`
3. Każda ramka dodatkowo wysyła `{type: 'resize', height: ...}` po załadowaniu
   i zmianie rozmiaru zawartości, aby powłoka mogła dynamicznie dopasować
   wysokość iframe (unikając podwójnego paska przewijania)

### 3.6 Wzorzec interaktywnego filtrowania (cross-filtering)

Strony Summary, Time Trend i Root Cause implementują ten sam wzorzec:

1. Stan filtra trzymany w zmiennej JS (`activeFilter` / `activeMonth`)
2. Kliknięcie elementu wykresu/listy ustawia lub czyści filtr (toggle)
3. Funkcja `renderEverything()` przelicza **wszystkie** zależne elementy strony
   na nowo z przefiltrowanego podzbioru danych i ponownie renderuje DOM
4. Wybrany element jest wizualnie wyróżniony, pozostałe przygaszone
   (`opacity: .35`)
5. Plakietka z nazwą aktywnego filtra + przycisk „×” do czyszczenia,
   umieszczona spójnie na wszystkich trzech stronach w prawym rogu
   `header-row` (obok nawigacji), niezależnie od tego, który wykres/lista
   ustawiła filtr

### 3.7 Animacja wejścia (fade-in-up)

Wszystkie 6 stron używa tej samej animacji wejścia kart — płynne pojawienie
się z lekkim przesunięciem od dołu, z narastającym opóźnieniem między
kolejnymi elementami (`@keyframes fadeInUp`, `.55s cubic-bezier(.2,.8,.2,1)`).
Każda strona ma własną kolejność opóźnień (`animation-delay`) dopasowaną do
układu jej kart. Każdy plik CSS zawiera też regułę
`@media (prefers-reduced-motion: reduce)`, która wyłącza animację dla osób
z ograniczonym ruchem w ustawieniach systemowych.

---

## 4. Struktura plików

```
index.html                     # Powłoka — łączy 6 stron w jedną nawigację (iframe)
pages/
  page1_home.html               # Strona 1 — okładka (struktura HTML)
  page2_summary.html            # Strona 2 — Executive Summary
  page3_trend.html              # Strona 3 — Time Trend Analysis
  page4_rootcause.html          # Strona 4 — Root Cause Analysis
  page5_risk.html                # Strona 5 — Risk Scoring
  page6_recommendations.html    # Strona 6 — Recommendations & Action
css/
  shell.css                     # Style powłoki (index.html)
  pageN_x.css                   # Style każdej strony (jeden plik na strone)
js/
  shell.js                      # Logika nawigacji powłoki
  pageN_x.js                    # Logika renderowania i interakcji każdej strony
data/
  Absenteeism_at_work.csv       # Źródłowe dane (740 rekordów) — do wglądu/edycji
  data.js                       # Te same dane jako JS (ładowane przez <script src>)
vendor/
  chart.umd.js                  # Biblioteka Chart.js (tylko strona Summary)
README.md                       # Instrukcja szybkiego startu
DOCUMENTATION.md                # Ten dokument
```

Każda strona w `pages/` linkuje do swojego pliku CSS (`css/pageN_x.css`) i JS
(`js/pageN_x.js`) oraz do wspólnych `data/data.js` i (dla Summary)
`vendor/chart.umd.js`. Można otworzyć dowolny plik z `pages/` bezpośrednio w
przeglądarce, niezależnie od `index.html`.

---

## 5. Opis stron

### 5.1 Strona 1 — Home (okładka)

Kinowa strona tytułowa z animowanym, ciemnym tłem (canvas 2D, cząsteczki
światła) i gradientowym napisem tytułu. Przycisk „Wejdź do raportu" przenosi
do strony Summary.

**Dane:** brak dynamicznych obliczeń — statystyki (740 rekordów, 36
pracowników, 5124 godzin) wyświetlane jako stałe podsumowanie.

**Uwaga techniczna:** animacja tła jest opakowana w blok `try/catch` — jeśli
canvas 2D nie jest dostępny (np. w niektórych trybach prywatności
przeglądarki), reszta strony (w tym przycisk) nadal działa poprawnie.

---

### 5.2 Strona 2 — Executive Summary

**Karty KPI (obrotowe, hover):**
| Karta | Przód | Tył |
|---|---|---|
| Total absence hours | Suma godzin | Rok poprzedni (4876h — stała, brak w danych źródłowych) |
| Avg hours / employee | Godziny ÷ liczba rekordów | Ranking top-4 pracowników wg godzin |
| High risk employees | Liczba pracowników Critical (Bradford ≥600) | Pełny rozkład wg poziomów Bradford Factor |
| Est. annual cost | Godziny × $42/h | Koszt rozbity wg poziomu ryzyka |

**Wykres liniowy:** suma godzin nieobecności miesiąc po miesiącu + linia
benchmarku (480h/mies.).

**Interakcja:** kliknięcie punktu na wykresie filtruje **wszystkie 4 karty
KPI i listę powodów** do wybranego miesiąca. Wybrany punkt jest podświetlony
(ciemne kółko + przerywana pionowa linia). Ponowne kliknięcie lub przycisk
„×" przy plakietce czyści filtr.

**Animacja ładowania:** karty pojawiają się sekwencyjnie (fade-in), liczby
zliczają się od 0 do wartości docelowej, wykres rysuje się z opóźnieniem.

---

### 5.3 Strona 3 — Time Trend Analysis

**Karty KPI (obrotowe):** Peak Month, Peak Day, Peak Season, oraz dynamiczna
karta „{Dzień} Effect" (domyślnie Monday, ale pokazuje efekt aktualnie
szczytowego dnia w bieżącym zakresie filtra).

**Heatmapa miesiąc × dzień tygodnia** — kolor komórki skalowany względem
maksymalnej wartości w całej tabeli.

**Wykres słupkowy sezonowości** oraz **lista dnia tygodnia** (szerokość paska
= udział w sumie wszystkich wartości, nie w maksimum).

**Interakcja:** kliknięcie słupka sezonu **lub** wiersza dnia tygodnia:
- przygasza niepasujące komórki heatmapy (wiersze dla sezonu, kolumnę dla dnia)
- przelicza wszystkie 4 karty KPI w obrębie wybranego zakresu
- przy filtrze sezonu — przelicza także listę dnia tygodnia (tytuł zmienia się
  dynamicznie, np. „Day-of-week pattern · Autumn")

---

### 5.4 Strona 4 — Root Cause Analysis

Siedem kart w układzie dwukolumnowym:

**Lewa kolumna:**
1. **Top absence reason** — 7 najczęstszych kodów ICD + zbiorcza kategoria „Other"
2. **Absence by employee age** — 4 przedziały wiekowe
3. **Distance from home** — 4 przedziały odległości

**Prawa kolumna:**
4. **KPI mini** — liczba pracowników, średni wiek, zakres wieku
5. **Social habits** — osobna karta, 4 grupy (Drinkers/Smokers/Both/Neither)
6. **Education level** — osobna karta, 3 poziomy wykształcenia
7. **Total absence by service years** — 5 przedziałów stażu pracy

Kolumny nie są matematycznie równej wysokości (lewa jest nieco dłuższa) —
świadomy kompromis między układem treści a estetyką; dolne krawędzie obu
kolumn są jednak wyrównywane dynamicznie w JS (patrz `alignColumnBottoms()`
w `js/page4_rootcause.js`), które mierzy rzeczywistą wysokość obu kolumn po
wyrenderowaniu i dokleja niewidoczny odstęp na dole krótszej z nich — dzięki
temu wygląda spójnie niezależnie od przeglądarki/czcionek.

**Interakcja:** kliknięcie słupka na wykresie wieku **lub** stażu pracy
wzajemnie filtruje: kliknięty wykres podświetla wybrany słupek, **drugi
wykres przelicza się w obrębie tej grupy**, a wraz z nim wszystkie pozostałe
karty (powody, KPI, nawyki społeczne, wykształcenie, odległość).

---

### 5.5 Strona 5 — Risk Scoring

Pięć kart poziomów ryzyka wg **Bradford Factor** (Critical / Urgent / Formal
/ Monitor / Normal — patrz sekcja 6.2) oraz przewijalna tabela wszystkich 36
pracowników posortowana malejąco wg wartości Bradford.

**Interakcja — dane personalne:** najechanie myszką na wiersz pracownika
pokazuje tabelę z dodatkowymi danymi:
- Imię i nazwisko
- Dział (jeden z 4: Delivery Operations, Warehouse & Logistics, Customer
  Service, Administration & HR)
- Przełożony
- Wiek
- Staż pracy

**⚠️ Wszystkie dane personalne są w pełni fikcyjne**, wygenerowane
deterministycznie na podstawie ID pracownika (ten sam pracownik zawsze
pokazuje te same dane). Nie pochodzą z żadnego rzeczywistego źródła i nie
reprezentują prawdziwych osób — patrz sekcja 7.

---

### 5.6 Strona 6 — Recommendations & Action

Strona narracyjna (tekst analityka), nie sterowana formułami DAX jak
pozostałe. Zawiera:
- Baner ostrzegawczy o efekcie poniedziałkowym (liczony dynamicznie)
- 3 karty KPI (koszt roczny, potencjalne oszczędności 20%, liczba
  pracowników Critical)
- 6 kart rekomendacji z tagami (Critical / Observation / Preventive / All
  departments) — treść pisana ręcznie, ale konkretne liczby w opisach
  (np. „1571h — 30% of total absence") liczone dynamicznie z danych
- Sekcja „KPIs to monitor going forward" z celami liczbowymi

---

## 6. Kluczowe wzory i metodologia

### 6.1 Formatowanie liczb

Wszystkie liczby > 999 wyświetlane są ze spacją jako separatorem tysięcy
(konwencja europejska/polska), np. `5124` → `5 124`.

```js
function fmtSpace(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
```

### 6.2 Bradford Factor

Wskaźnik stosowany w HR do identyfikacji wzorców częstych, krótkich
nieobecności (które zwykle bardziej zaburzają pracę zespołu niż rzadkie,
długie absencje):

```
Bradford = Episodes² × Days

gdzie:
  Episodes = liczba odrębnych zdarzeń nieobecności (wiersze z godzinami > 0)
  Days     = suma godzin nieobecności ÷ 8 (przyjęty 8-godzinny dzień pracy)
```

Progi klasyfikacji (zgodne z oryginalnym raportem):

| Poziom | Próg Bradford | Kolor |
|---|---|---|
| Critical | ≥ 600 | czerwony |
| Urgent | 400–599 | pomarańczowy |
| Formal | 200–399 | żółty |
| Monitor | 100–199 | niebieski |
| Normal | < 100 | zielony |

### 6.3 Sezony — kalendarz północnej półkuli

**Ważna decyzja projektowa:** oryginalny zbiór danych pochodzi z brazylijskiej
firmy kurierskiej (półkula południowa), gdzie kolumna `Seasons` w CSV
odzwierciedla lokalny kalendarz (np. ich „jesień" to marzec–maj). Ponieważ
odbiorcą raportu jest osoba w Polsce, na stronie **Time Trend** sezony
przeliczane są bezpośrednio z miesiąca, wg kalendarza północnej półkuli:

```js
function calendarSeason(month) {
  if (["Mar","Apr","May"].includes(month)) return "Spring";
  if (["Jun","Jul","Aug"].includes(month)) return "Summer";
  if (["Sep","Oct","Nov"].includes(month)) return "Autumn";
  return "Winter"; // Dec, Jan, Feb
}
```

Oryginalna kolumna `Seasons` z pliku CSV **nie jest już używana** na stronie
Time Trend — zastąpiona powyższą funkcją.

### 6.4 Wzorzec „mianownik = suma", nie „mianownik = maksimum"

Wszystkie paski poziome na stronach Summary, Root Cause pokazują długość
proporcjonalną do **udziału w sumie wszystkich kategorii w danej karcie**
(np. 7 powodów + „Other" sumuje się dokładnie do 100% całkowitych godzin),
**nie** względem największej pojedynczej kategorii. Zapewnia to, że żaden
pasek nigdy nie przekracza szerokości kontenera — nawet jeśli pojedyncza
kategoria (np. „Other") ma większą wartość niż jakikolwiek widoczny wiersz.

### 6.5 Koszt roczny

```
Est. annual cost = Suma godzin nieobecności × $42/h
```

Stawka $42/h jest **założeniem biznesowym**, nieobecnym w danych źródłowych
— dobranym tak, aby odtworzyć wynik $215k widoczny w oryginalnym raporcie
(5124h × $42 = $215 208).

---

## 7. Założenia i zastrzeżenia

| Element | Status | Uwaga |
|---|---|---|
| Dane godzinowe, wiek, staż, dział ICD itd. | **Rzeczywiste** | Ze zbioru UCI Absenteeism at Work |
| Stawka kosztowa $42/h | **Założenie** | Nieobecna w danych źródłowych |
| Cel oszczędności 20% | **Założenie** | Wartość biznesowa, nie wynik analizy |
| Dane z roku poprzedniego (4876h) | **Stała** | Zaszyta na sztywno, brak w danych źródłowych |
| Sezony na stronie Time Trend | **Przeliczone** | Kalendarz PL/północna półkula, nie oryginalna kolumna CSV |
| Imię, dział, przełożony (strona Risk) | **W pełni fikcyjne** | Wygenerowane demonstracyjnie, nie reprezentują rzeczywistych osób |
| Treść kart na stronie Recommendations | **Tekst analityka** | Nie generowana formułą — liczby w opisach są jednak liczone dynamicznie |

**Rekomendacja:** przed udostępnieniem raportu odbiorcom spoza tego
projektu, jasno oznacz sekcję z danymi personalnymi na stronie Risk jako
przykładowe/demonstracyjne, aby uniknąć nieporozumień.

---

## 8. Uruchomienie i wdrożenie

### 8.1 Lokalnie (bez instalacji)

Otwórz `index.html` bezpośrednio w przeglądarce — podwójne kliknięcie lub
przeciągnięcie pliku do okna przeglądarki. Nie wymaga serwera, Node.js ani
połączenia z internetem (dane i biblioteka Chart.js są plikami lokalnymi
wczytywanymi jako zwykłe skrypty, nie przez `fetch()` — patrz sekcja 3.3 —
dzięki temu działają poprawnie nawet z dysku).

### 8.2 GitHub Pages (darmowy hosting)

Po wgraniu repozytorium na GitHub:
1. **Settings → Pages**
2. Source: **Deploy from a branch** → branch **main** → folder **/ (root)**
3. Po chwili raport dostępny pod `https://TWOJA-NAZWA.github.io/NAZWA-REPO/`

### 8.3 Aktualizacja danych

Aby podmienić dane źródłowe:
1. Zamień `data/Absenteeism_at_work.csv` (zachowując te same nazwy kolumn)
2. Wygeneruj na nowo `data/data.js` skryptem Python/pandas, np.:
   ```python
   import pandas as pd, json
   df = pd.read_csv("data/Absenteeism_at_work.csv")
   records = df.to_dict(orient="records")
   with open("data/data.js", "w", encoding="utf-8") as f:
       f.write("const EMBEDDED_DATA = " + json.dumps(records) + ";\n")
   ```
3. To wszystko — **wszystkie 6 stron korzysta z tego samego pliku**
   `data/data.js`, więc nie trzeba nic podmieniać osobno w każdej stronie.

---

## 9. Znane ograniczenia

- **Brak zapisu stanu filtrów** — odświeżenie strony lub przejście między
  zakładkami resetuje aktywne filtry do stanu początkowego (cały rok/brak
  filtra).
- **Statyczne dane** — wszelkie zmiany w danych źródłowych wymagają ręcznej
  regeneracji `data/data.js` (patrz sekcja 8.3); brak połączenia z bazą
  danych ani API.
- **Dane osadzone przy pierwszym wczytaniu** — mimo podziału na pliki,
  `data/data.js` (~320 KB) wciąż wczytuje się w całości do pamięci
  przeglądarki przy starcie każdej strony — to nadal szybkie przy tej
  wielkości zbioru (740 rekordów), ale przy znacznie większych danych
  warto rozważyć podział na fragmenty lub prawdziwe API.

