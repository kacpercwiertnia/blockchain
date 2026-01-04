# BTC/ETH Flow Tracker (ES Modules)

## Uruchomienie (zalecane)
Ze względu na ES Modules (`type="module"`), otwieranie przez `file://` często nie działa.
Najprościej uruchomić lokalny serwer HTTP:

### Python
```bash
cd btc-eth-tracker-esm
python3 -m http.server 8080
```

Potem otwórz:
http://localhost:8080/

## Struktura
- `index.html` – szkielet UI + ładowanie skryptów
- `css/styles.css` – style
- `js/main.js` – punkt wejścia, event listenery
- `js/state.js` – wspólny stan aplikacji
- `js/config.js` – stałe (API key, kursy fallback, itp.)
- `js/api/transactions.js` – pobieranie i renderowanie transakcji (BTC + ETH)
- `js/controller/jump.js` – logika przycisku JUMP (dodawanie krawędzi/noda)
- `js/graph/network.js` – konfiguracja i obsługa grafu (vis-network)
- `js/currency/*` – kursy i formatowanie kwot
- `js/ui/tables.js` – sekcje/tabele + zwijanie

## Uwaga
Klucz Moralis w frontendzie jest OK do projektu uczelnianego, ale nie jest bezpieczny w produkcji.


## Zmiana
- Usunięto inline `onclick` w tabelach; kliknięcia obsługuje delegacja zdarzeń w `js/main.js`.
