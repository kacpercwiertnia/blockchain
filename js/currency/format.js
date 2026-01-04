import { state } from '../state.js';
import { currencyRates, currencySymbols } from '../config.js';

export function formatCurrency(nativeAmount, type = 'out') {
  const rate = currencyRates[state.currentChain]?.[state.currentCurrency];
  const value = nativeAmount * rate;

  const isNative = (state.currentCurrency === 'BTC' || state.currentCurrency === 'ETH');
  const decimals = isNative ? 8 : 2;

  const color = (type === 'in') ? '#2e7d32' : '#c62828';
  const sign = (type === 'in') ? '+' : '-';

  // jeśli rate nie istnieje, nie ryzykuj NaN w UI
  if (!Number.isFinite(value)) {
    return `<span style="color:${color};font-weight:bold;">${sign} ?</span>`;
  }

  const symbol = currencySymbols[state.currentChain]?.[state.currentCurrency] ?? state.currentCurrency;
  return `<span style="color:${color};font-weight:bold;">${sign} ${value.toFixed(decimals)} ${symbol}</span>`;
}

// Label krawędzi na podstawie kwoty natywnej (BTC/ETH)
export function formatEdgeLabelFromNative(nativeAmount) {
  const rate = currencyRates[state.currentChain]?.[state.currentCurrency];
  const value = nativeAmount * rate;

  const isNative = (state.currentCurrency === 'BTC' || state.currentCurrency === 'ETH');
  const decimals = isNative ? 8 : 2;

  if (!Number.isFinite(value)) return '';

  const symbol = currencySymbols[state.currentChain]?.[state.currentCurrency] ?? state.currentCurrency;
  return `${value.toFixed(decimals)} ${symbol}`;
}

export function updateAllCurrencyDisplays() {
  // tabele
  document.querySelectorAll('.tx-section table tbody tr').forEach(tr => {
    const amountCell = tr.querySelector('td:nth-child(2)');
    if (amountCell && amountCell.dataset.btc) {
      // incoming/outgoing rozpoznaj po tle
      const isIn = tr.style.background === 'rgb(230, 251, 230)';
      amountCell.innerHTML = formatCurrency(parseFloat(amountCell.dataset.btc), isIn ? 'in' : 'out');
    }
  });

  // krawędzie
  if (!state.edges) return;
  state.edges.forEach(edge => {
    if (edge._nativeValue !== undefined && edge._nativeValue !== '') {
      state.edges.update({
        id: edge.id,
        label: formatEdgeLabelFromNative(parseFloat(edge._nativeValue)),
        font: { color: '#888', size: 12, align: 'top' }
      });
    }
  });
}

