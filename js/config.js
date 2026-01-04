// Stałe i konfiguracja aplikacji

// Uwaga: w realnej aplikacji klucz NIE powinien być w JS na froncie.
// Na potrzeby projektu uczelnianego może być tu:
export const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImQxMGViMmJkLTYwN2YtNGQ4OC05MWUyLTgxNzBmYmEzNjUzMiIsIm9yZ0lkIjoiNDg1MDQyIiwidXNlcklkIjoiNDk5MDIxIiwidHlwZUlkIjoiM2Q0M2U2ZjEtODFiOC00ZjhmLWE2OWEtYTQ1ZTYwYjQ2ZDY1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjUxMzk0NjMsImV4cCI6NDkyMDg5OTQ2M30.DCBvrihVhXE4-gHIbbs8AL250a4l4K0HHMNJUxyKzQI';

export const MIDDLE_MAN_ADDRESSES = [
  '1KBvGdNWDfZEJNMAEtb8US6SeZhvPp3MU8',
  '197fNrDmfYQjnyKEMpwiZB1vz2cQ2MLKby',
  '1FfZqdzi2E7MYbYsPCPwQLLQVu5numwExA',
  '1FVdevUYiWweQn674EDH5NEzXG5UMGhjXB',
  '1JAL263EtZ67n6uorFjZobrL7P5icNgjha',
  '1KKwAuLxbozvn1Z8BvZNYSGpw6B86DDHK1',
  '1GsHMgtcYACnbKScUvj7jTRDWtnQ1M9aiE'
];

// Kursy: osobno dla BTC i ETH
// Wartości fallback – zostaną nadpisane przez API
export const currencyRates = {
  BTC: {
    BTC: 1,
    ETH: 87500 / 3000, // fallback: BTC->ETH = BTCUSD / ETHUSD
    USD: 87500,
    PLN: 321000
  },
  ETH: {
    ETH: 1,
    BTC: 3000 / 87500, // fallback: ETH->BTC = ETHUSD / BTCUSD
    USD: 3000,
    PLN: 12000
  }
};

// Symbole walut (dla labeli)
export const currencySymbols = {
  BTC: { BTC: 'BTC', ETH: 'ETH', USD: 'USD', PLN: 'PLN' },
  ETH: { ETH: 'ETH', BTC: 'BTC', USD: 'USD', PLN: 'PLN' }
};

