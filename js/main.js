import { state, syncDatesFromInputs, resetForChain } from './state.js';
import { initNetwork, fitGraph, exportGraphToPng, ensureGraphDatasets, createNodeObject } from './graph/network.js';
import { renderTableForAddress, toggleTxSection } from './ui/tables.js';
import { jumpToAddress } from './controller/jump.js';
import { fetchCurrencyRatesFromAPI } from './currency/rates.js';
import { updateAllCurrencyDisplays } from './currency/format.js';
import { saveSessionToFile, loadSessionFromFile } from './persistence/session.js';

function initUI() {
  // daty
  syncDatesFromInputs();
  document.getElementById('startDate').addEventListener('change', () => syncDatesFromInputs());
  document.getElementById('endDate').addEventListener('change', () => syncDatesFromInputs());

  // waluta
  document.getElementById('currencySelect').addEventListener('change', function() {
    state.currentCurrency = this.value;
    updateAllCurrencyDisplays();
  });

  // zmiana sieci
  document.getElementById('chainSelect').addEventListener('change', function() {
    resetForChain(this.value);

    const currencySelect = document.getElementById('currencySelect');
    currencySelect.value = state.currentCurrency;

    updateAllCurrencyDisplays();
  });

  // przyciski grafu
  document.getElementById('layoutBtn').addEventListener('click', () => fitGraph());
  document.getElementById('exportBtn').addEventListener('click', () => exportGraphToPng());

  // start śledzenia
  document.getElementById('showTxBtn').addEventListener('click', () => {
    syncDatesFromInputs();

    const address = document.getElementById('addressInput').value.trim();
    if (!address) return;

    if (!state.depthMap[address]) state.depthMap[address] = 0;

    renderTableForAddress(address, 0, false);

    ensureGraphDatasets();
    if (!state.nodes.get(address)) {
      state.nodes.add(createNodeObject(address, state.labelMap[address], state.finalAddressMap[address]));
    }
  });

  // Delegacja zdarzeń: bez inline onclick=""
  const tablesContainer = document.getElementById('tables-container');
  if (tablesContainer) {
    tablesContainer.addEventListener('click', async (e) => {
      const header = e.target.closest('.tx-section-header');
      if (header) {
        const section = header.closest('.tx-section');
        if (section && section.id) toggleTxSection(section.id);
        return;
      }

      const jumpBtn = e.target.closest('.jump-btn');
      if (jumpBtn) {
        const to = jumpBtn.dataset.to;
        const from = jumpBtn.dataset.from;
        const depth = Number(jumpBtn.dataset.depth);
        const amount = Number(jumpBtn.dataset.amount);

        if (!to || !from || !Number.isFinite(depth)) return;

        try {
          await jumpToAddress(jumpBtn, to, from, depth, Number.isFinite(amount) ? amount : undefined);
        } catch (err) {
          console.error(err);
          jumpBtn.disabled = false;
          jumpBtn.style.opacity = 1;
          jumpBtn.style.cursor = 'pointer';
        }
      }
    });
  }

  // Zapis/Wczytanie sesji
  document.getElementById('saveSessionBtn').addEventListener('click', () => {
    saveSessionToFile();
  });

  document.getElementById('loadSessionBtn').addEventListener('click', () => {
    document.getElementById('sessionFileInput').click();
  });

  document.getElementById('sessionFileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await loadSessionFromFile(file);
    } finally {
      e.target.value = ''; // pozwala wczytać ten sam plik drugi raz
    }
  });
}

function main() {
  ensureGraphDatasets();
  initNetwork();
  initUI();

  // kursy (CoinGecko)
  fetchCurrencyRatesFromAPI();
}

main();

