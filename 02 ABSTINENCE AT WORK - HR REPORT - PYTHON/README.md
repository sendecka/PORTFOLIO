# Absence Analytics — HR Report

Interaktywny raport analizy absencji pracowniczej, zbudowany na podstawie oryginalnego
raportu Power BI ("ANALYSIS OF ABSTINENCE AT WORK") i rzeczywistych danych ze zbioru
**Absenteeism at Work** (UCI, 740 rekordów, 36 pracowników).

Wszystkie liczby na każdej stronie są liczone dynamicznie w przeglądarce na podstawie
danych w `data/Absenteeism_at_work.csv` - nic nie jest zaszyte na sztywno.

## 🚀 Szybki start

Przeglądanie raportu nie wymaga instalacji ani serwera - to czyste HTML/CSS/JS/PYTHON.

**Najprościej:** otwórz link w przeglądarce: `https://sendecka.github.io/PORTFOLIO/02%20ABSTINENCE%20AT%20WORK%20-%20HR%20REPORT%20-%20PYTHON/`

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
js/                      # Logika JS — po jednym pliku na stronę + shell.js (nawigacja).
                         # JS TYLKO renderuje DOM i obsługuje kliknięcia filtrów — żadnych
                         # obliczeń/agregacji danych. Wszystkie "miary" są już gotowe.
build/
  compute_measures.py     # Skrypt Python (pandas) liczący WSZYSTKIE wskaźniki/miary
                           # wyświetlane na każdej stronie — patrz DOCUMENTATION.md
  requirements.txt        # pandas
data/
  Absenteeism_at_work.csv # Źródłowe dane (do wglądu/edycji)
  measures.js              # Gotowe, policzone w Pythonie wyniki jako zmienna JS
                           # (ładowane przez <script src>, nie fetch — działa offline)
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

## 🐍 Obliczenia wskaźników (Python)

Wszystkie wskaźniki widoczne na stronach — sumy godzin, KPI, Bradford Factor,
podziały wg wieku/stażu/powodu itd. — są liczone **w Pythonie** (pandas), nie
w przeglądarce. Strony HTML/JS tylko odczytują gotowy wynik z `data/measures.js`.

