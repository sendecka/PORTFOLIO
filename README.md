# Absence Analytics — HR Report

Interaktywny raport analizy absencji pracowniczej, zbudowany na podstawie oryginalnego
raportu Power BI ("ANALYSIS OF ABSTINENCE AT WORK") i rzeczywistych danych ze zbioru
**Absenteeism at Work** (UCI, 740 rekordów, 36 pracowników).

Wszystkie liczby na każdej stronie są liczone dynamicznie w przeglądarce na podstawie
danych w `data/Absenteeism_at_work.csv` — nic nie jest zaszyte na sztywno.

## 🚀 Szybki start

Nie wymaga instalacji ani serwera — to czyste HTML/CSS/JS z wbudowanymi danymi i biblioteką Chart.js.

**Najprościej:** otwórz `index.html` bezpośrednio w przeglądarce (podwójne kliknięcie
lub przeciągnięcie do okna przeglądarki).

**Podgląd online (GitHub Pages):** patrz sekcja niżej.

## 📄 Struktura

```
index.html              # Powłoka aplikacji — łączy 6 stron w jedną nawigację (iframe)
pages/                   # HTML każdej strony (struktura, bez stylów/logiki w środku)
  page1_home.html
  page2_summary.html
  page3_trend.html
  page4_rootcause.html
  page5_risk.html
  page6_recommendations.html
css/                     # Arkusze stylów — po jednym na stronę + shell.css (powłoka)
js/                      # Logika JS — po jednym pliku na stronę + shell.js (nawigacja)
data/
  Absenteeism_at_work.csv # Źródłowe dane (do wglądu/edycji)
  data.js                 # Te same dane jako JS (ładowane przez <script src>, nie fetch —
                           # dzięki temu działa też offline, bez serwera)
vendor/
  chart.umd.js            # Biblioteka Chart.js (używana tylko na stronie Summary)
```

`index.html` łączy wszystkie 6 stron jako osadzone ramki (`<iframe src="pages/...">`)
pod wspólnym mechanizmem nawigacji — kliknięcie zakładki przełącza widoczną stronę
bez przeładowania.

## 🖱️ Funkcje interaktywne

- **Summary** — kliknięcie punktu na wykresie miesięcznym filtruje karty KPI i listę powodów do tego miesiąca
- **Time Trend** — kliknięcie słupka sezonu lub wiersza dnia tygodnia filtruje heatmapę i KPI
- **Root Cause** — kliknięcie słupka wieku/stażu pracy wzajemnie filtruje oba wykresy i pozostałe karty
- **Risk** — najechanie na wiersz pracownika pokazuje dane personalne (fikcyjne, demonstracyjne)
- Karty KPI na większości stron są obrotowe (hover), pokazują dodatkowe dane na odwrocie

## ⚠️ Uwaga o danych

- Dane osobowe (imię, dział, przełożony) na stronie Risk są **w pełni zmyślone** — nie
  reprezentują prawdziwych osób.
- Kolumna sezonów przeliczona jest wg kalendarza półkuli północnej (Polska), nie wg
  oryginalnej konwencji zbioru danych (Brazylia, półkula południowa).
- Stawka kosztowa ($42/h) i cel oszczędności (20%) to założenia biznesowe, nie dane źródłowe.

## 📤 Publikacja jako strona GitHub Pages

Po wgraniu repozytorium na GitHub:
1. Wejdź w **Settings → Pages**
2. Source: **Deploy from a branch**, branch: **main**, folder: **/ (root)**
3. Zapisz — po chwili strona będzie dostępna pod adresem
   `https://TWOJA-NAZWA.github.io/NAZWA-REPO/`
