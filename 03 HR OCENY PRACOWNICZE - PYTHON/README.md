# Puls Zespołu — Panel HR (oceny i ankiety pracownicze)

Interaktywny panel analityczny HR: wskaźnik zaangażowania, eNPS, response rate ankiet,
oceny okresowe i ryzyko rotacji — w podziale na działy, lokalizacje, poziomy stanowisk
i okresy. Dane wejściowe są w pliku Excel, wszystkie wyliczenia robi Python, a wynikiem
jest jeden, samodzielny plik HTML działający offline w przeglądarce.

> **Dane w tym repozytorium są w 100% syntetyczne / demonstracyjne** i służą wyłącznie
> do zaprezentowania panelu. Nie przedstawiają żadnej rzeczywistej organizacji.

## Jak to działa

```
dane_hr.xlsx  →  generate_dashboard.py  →  panel-hr-oceny-ankiety.html
 (surowe dane)      (Python / pandas)       (gotowy panel, statyczny plik)
```

- **`dane_hr.xlsx`** — jedyne źródło danych. Zawiera wyłącznie surowe liczby (działy,
  wyniki kwartalne, wskaźniki roczne, czynniki satysfakcji, lokalizacje, poziomy,
  okresy, segmentacja). Zero formuł, zero wyliczeń.
- **`generate_dashboard.py`** — wczytuje Excel, liczy w Pythonie (pandas) wszystkie
  wskaźniki, trendy, rankingi, wynik złożony i zakresy heatmapy dla **każdej**
  kombinacji filtrów (okres × dział × lokalizacja × poziom), po czym zapisuje gotowy
  wynik jako dane wbudowane w plik HTML.
- **`panel_template.html`** — szkielet wizualny panelu (HTML/CSS/JS renderujący). JS w
  przeglądarce **nie liczy żadnych wskaźników biznesowych** — tylko odczytuje gotowe
  wartości policzone wcześniej przez Python i je wyświetla/animuje.
- **`panel-hr-oceny-ankiety.html`** / **`index.html`** — gotowy wynik. Dwa identyczne
  pliki: drugi nazywa się `index.html`, żeby GitHub Pages od razu go serwował jako
  stronę główną.

## Użycie

### Podejrzenie gotowego panelu
Wystarczy otworzyć `index.html` (albo `panel-hr-oceny-ankiety.html`) bezpośrednio
w przeglądarce — działa w pełni offline, bez serwera.

### Aktualizacja danych
1. Edytuj liczby w `dane_hr.xlsx` (nie zmieniaj nazw arkuszy ani kolumn).
2. Zainstaluj zależności:
   ```bash
   pip install -r requirements.txt
   ```
3. Wygeneruj panel na nowo:
   ```bash
   python generate_dashboard.py
   ```
4. Podmień/skopiuj wynikowy `panel-hr-oceny-ankiety.html` na `index.html`, jeśli
   publikujesz przez GitHub Pages:
   ```bash
   cp panel-hr-oceny-ankiety.html index.html
   ```

## Publikacja na GitHub Pages

1. Wypchnij repozytorium na GitHub.
2. W ustawieniach repo: **Settings → Pages → Branch: main → folder: / (root)**.
3. Strona pojawi się pod `https://<użytkownik>.github.io/<repo>/` (serwowany będzie
   `index.html`).

## Struktura repozytorium

```
.
├── dane_hr.xlsx                   # surowe dane źródłowe (edytowalne)
├── generate_dashboard.py          # silnik obliczeniowy (Python / pandas)
├── panel_template.html            # szkielet wizualny panelu
├── panel-hr-oceny-ankiety.html    # gotowy wygenerowany panel
├── index.html                     # kopia panelu pod GitHub Pages
├── requirements.txt
└── .gitignore
```

## Zawartość panelu

- animowane karty KPI (zaangażowanie, response rate, eNPS, ocena okresowa, ryzyko rotacji)
- pasek filtrów: okres / dział / lokalizacja / poziom stanowiska
- interaktywne porównanie działów z podświetleniem lidera i działu wymagającego uwagi
- panel szczegółów działu: radar 5 czynników satysfakcji, najmocniejsza strona / obszar do poprawy
- trend zaangażowania i eNPS w czasie (z tooltipem po najechaniu)
- segmentacja zaangażowania zespołu (wykres pierścieniowy)
- ranking response rate ankiet
- sortowalna tabela porównawcza z heatmapą
- ranking działów z minitrendem (sparkline)
- kontekst prawny i metodologiczny (Kodeks pracy, RODO) w stopce

## Wymagania

- Python 3.9+
- `pandas`, `openpyxl` (patrz `requirements.txt`)
