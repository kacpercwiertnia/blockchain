import { state } from '../state.js';
import { fetchTransactions } from '../api/transactions.js';

export function renderTableForAddress(address, depth, isDuplicate = false) {
  const container = document.getElementById('tables-container');
  const tableId = `txTable_${state.tableCounter++}`;
  const sectionId = `txSection_${tableId}`;

  const section = document.createElement('div');
  section.className = 'tx-section';
  section.id = sectionId;
  section.dataset.address = address;
  section.dataset.depth = String(depth);

  section.innerHTML = `
    <div class="tx-section-header">
      <span class="arrow">&#9660;</span>
      <span style="font-size:0.95em;">Transakcje dla adresu: <span style='font-weight:bold;'>${address}</span></span>
    </div>
    <div class="tx-section-content">
      <table id="${tableId}">
        <thead>
          <tr><th>Czas</th><th>Kwota</th><th>Z</th><th>Do</th></tr>
        </thead>
        <tbody><tr><td colspan='4'>Ładowanie...</td></tr></tbody>
      </table>
    </div>
  `;

  container.appendChild(section);
  fetchTransactions(address, tableId, depth, null, isDuplicate);
  return sectionId;
}

// Funkcja musi być globalnie dostępna, bo jest używana w onclick="" w HTML generowanym w tabelach.
// Podpinamy ją w main.js: window.toggleTxSection = toggleTxSection
export function toggleTxSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  section.classList.toggle('collapsed');

  const content = section.querySelector('.tx-section-content');
  const arrow = section.querySelector('.arrow');

  if (section.classList.contains('collapsed')) {
    content.style.display = 'none';
    arrow.innerHTML = '&#9654;';
  } else {
    content.style.display = 'block';
    arrow.innerHTML = '&#9660;';
  }
}

