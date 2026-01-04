import { currencyRates } from '../config.js';
import { updateAllCurrencyDisplays } from './format.js';

// Pobiera kursy BTC/ETH w USD i PLN z CoinGecko, a potem liczy cross-rate BTC<->ETH
export async function fetchCurrencyRatesFromAPI() {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,pln';
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.bitcoin) {
      currencyRates.BTC.USD = data.bitcoin.usd;
      currencyRates.BTC.PLN = data.bitcoin.pln;
    }
    if (data.ethereum) {
      currencyRates.ETH.USD = data.ethereum.usd;
      currencyRates.ETH.PLN = data.ethereum.pln;
    }

    // cross-rate na podstawie USD (to naprawia BTC<->ETH, żeby nie było NaN)
    if (currencyRates.BTC.USD && currencyRates.ETH.USD) {
      currencyRates.BTC.ETH = currencyRates.BTC.USD / currencyRates.ETH.USD;
      currencyRates.ETH.BTC = currencyRates.ETH.USD / currencyRates.BTC.USD;
    }

    console.log('Zaktualizowano kursy z API CoinGecko:', currencyRates);
    updateAllCurrencyDisplays();
  } catch (err) {
    console.error('Nie udało się pobrać kursów z API, używam wartości domyślnych.', err);
  }
}

