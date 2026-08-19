# Rejestr Rekrutacyjny - Panel Analityczny HR

Interaktywny, jednoplikowy panel analityczny prezentujący wyniki procesu rekrutacji pracowniczej: czas i koszt zatrudnienia, lejek rekrutacyjny, źródła pozyskania kandydatów, retencję nowozatrudnionych i porównania między działami oraz lokalizacjami.

> **Uwaga:** wszystkie dane w panelu są **syntetyczne / demonstracyjne**, wygenerowane algorytmicznie na potrzeby prezentacji. Nie reprezentują żadnej rzeczywistej organizacji ani osoby.

---

## Podgląd funkcji

- **Strona powitalna (hero)** na górze - pełnoekranowa sekcja z animowanymi falami w tle (canvas), tytułem, opisem i przyciskiem/strzałką przewijającą płynnie do właściwego panelu
- **Animacje wjazdu przy przewijaniu** - karty KPI i wszystkie sekcje płynnie pojawiają się (fade + przesunięcie), gdy wjeżdżają w pole widzenia (`IntersectionObserver`)
- **Karty KPI** z animowanym odliczaniem przy ładowaniu i efektem 3D „flip” - najechanie odkrywa najlepszą/najgorszą placówkę dla danej metryki
- **Pasek filtrów** (okres: miesiąc/rok, dział, lokalizacja) przyklejony do góry strony przy przewijaniu, z tagami aktywnych filtrów
- **Ranking działów** z minitrendem (sparkline) i rozwijanym **lejkiem rekrutacyjnym** (6 etapów: aplikacja → screening → rozmowa HR → rozmowa merytoryczna → oferta → zatrudnienie)
- **Porównanie Time-to-Hire** między działami z podświetleniem najlepszego/najgorszego wyniku
- **Trend zatrudnień w czasie** - wygładzony wykres liniowy (Catmull-Rom) z tooltipem po najechaniu
- **Struktura źródeł kandydatów** - wykres kołowy z wysuniętym największym segmentem i wartościami wewnątrz
- **Ranking lokalizacji wg retencji 90 dni** - wykres słupkowy, dynamicznie sortowany
- **Tabela porównawcza działów** - sortowalna, z podświetleniem najlepszych/najgorszych wartości w każdej kolumnie
- Spójna identyfikacja wizualna (paleta, typografia, niestandardowe ikony SVG) oraz płynne animacje wejścia i przejść

## Warstwy technologiczne

| Warstwa | Technologia |
|---|---|
| Struktura / styl | HTML5, czysty CSS (zmienne CSS, brak frameworków) |
| Interaktywność, wykresy | Czysty JavaScript (ES6+), ręcznie generowane SVG (bez bibliotek typu Chart.js) |
| Obliczenia / agregacje | **Python** uruchamiany w przeglądarce przez [Pyodide](https://pyodide.org/) (WebAssembly) |
| Tryb zapasowy | Równoważna logika w JavaScript — uruchamiana automatycznie, gdy silnik Python jest niedostępny (np. brak internetu), dzięki czemu plik zawsze działa w pełni offline |

Silnik Python i silnik JavaScript dają **identyczne wyniki** (zweryfikowane testami) - Python jest używany, gdy to możliwe, a JavaScript gwarantuje, że panel nigdy nie przestaje działać.

## Uruchomienie

Uruchom w przeglądarce: https://sendecka.github.io/PORTFOLIO/04%20HR%20REKRUTACJE%20-%20PYTHON/

## Struktura projektu

```
hr-recruitment-dashboard/
├── index.html      # cały panel (HTML + CSS + JS + kod Python) w jednym pliku
├── README.md        # ten plik
└── LICENSE           # licencja MIT
```

## Dane

Zbiór danych jest generowany proceduralnie przy każdym uruchomieniu (z ustalonym ziarnem losowości, więc wyniki są powtarzalne) i obejmuje:

- **8 działów**: IT, Sprzedaż, Marketing, Finanse, Obsługa Klienta, Produkcja, HR, R&D
- **6 lokalizacji**: Warszawa, Kraków, Wrocław, Poznań, Gdańsk, praca zdalna
- **6 źródeł kandydatów**: LinkedIn, polecenia pracownicze, strona kariery, agencje rekrutacyjne, portale ogłoszeniowe, targi pracy
- **12 miesięcy** (sierpień 2025 – lipiec 2026), z sezonowością (spadki w grudniu/lipcu, wzrosty w styczniu)

## Zgodność / prywatność

Ponieważ dane są syntetyczne, panel nie przetwarza żadnych rzeczywistych danych osobowych.
