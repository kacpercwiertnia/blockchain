// Wspólny stan aplikacji (singleton)

export const state = {
  currentChain: 'BTC',
  currentCurrency: 'BTC',

  // zakres dat w sekundach (unix)
  START_DATE: null,
  END_DATE: null,

  tableCounter: 0,

  // vis.js
  nodes: null,
  edges: null,
  network: null,

  // metadane grafu
  depthMap: {},        // address -> depth
  duplicateMap: {},    // address -> bool
  labelMap: {},        // address -> label (giełda / opis)
  finalAddressMap: {}  // address -> bool (brak outgoing)
};

export function syncDatesFromInputs() {
  const startEl = document.getElementById('startDate');
  const endEl = document.getElementById('endDate');

  state.START_DATE = new Date(startEl.value + 'T00:00:00Z').getTime() / 1000;
  state.END_DATE = new Date(endEl.value + 'T23:59:59Z').getTime() / 1000;
}

export function resetForChain(chain) {
  state.currentChain = chain;
  state.currentCurrency = (chain === 'BTC') ? 'BTC' : 'ETH';

  state.tableCounter = 0;
  state.depthMap = {};
  state.duplicateMap = {};
  state.labelMap = {};
  state.finalAddressMap = {};

  if (state.nodes) state.nodes.clear();
  if (state.edges) state.edges.clear();

  const tables = document.getElementById('tables-container');
  if (tables) tables.innerHTML = '';
}

