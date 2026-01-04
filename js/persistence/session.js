import { state, syncDatesFromInputs, resetForChain } from '../state.js';
import { ensureGraphDatasets, createNodeObject } from '../graph/network.js';
import { renderTableForAddress, toggleTxSection } from '../ui/tables.js';
import { formatEdgeLabelFromNative, updateAllCurrencyDisplays } from '../currency/format.js';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeName(s) {
  return String(s || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

function buildSessionObject() {
  const chain = document.getElementById('chainSelect').value;
  const currency = document.getElementById('currencySelect').value;

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  const showOutgoing = document.getElementById('showOutgoing').checked;
  const showIncoming = document.getElementById('showIncoming').checked;

  const rootAddress = document.getElementById('addressInput').value.trim();

  // Kolejność tabel + które są zwinięte
  const tableOrder = [];
  const collapsedAddresses = [];

  document.querySelectorAll('#tables-container .tx-section').forEach((sec) => {
    const address = sec.dataset.address;
    const depth = Number(sec.dataset.depth ?? 0);
    if (!address) return;

    tableOrder.push({
      address,
      depth,
      isDuplicate: !!state.duplicateMap[address]
    });

    if (sec.classList.contains('collapsed')) {
      collapsedAddresses.push(address);
    }
  });

  // Graf
  const nodes = state.nodes ? state.nodes.get().map(n => n.id) : Object.keys(state.depthMap);
  const edges = state.edges
    ? state.edges.get().map(e => ({
        from: e.from,
        to: e.to,
        nativeValue: e._nativeValue ?? ''
      }))
    : [];

  const view = state.network
    ? { position: state.network.getViewPosition(), scale: state.network.getScale() }
    : null;

  return {
    version: 1,
    savedAt: new Date().toISOString(),

    chain,
    currency,
    startDate,
    endDate,
    showOutgoing,
    showIncoming,
    rootAddress,

    // maps
    depthMap: state.depthMap,
    duplicateMap: state.duplicateMap,
    labelMap: state.labelMap,
    finalAddressMap: state.finalAddressMap,

    // what user had opened
    tableOrder,
    collapsedAddresses,

    // graph
    nodes,
    edges,
    view
  };
}

export function saveSessionToFile() {
  const session = buildSessionObject();
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const filename = `${safeName(session.chain)}_${safeName(session.rootAddress || 'session')}_${nowStamp()}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function loadSessionFromFile(file) {
  const text = await file.text();
  const session = JSON.parse(text);

  // minimalna walidacja
  if (!session || !session.chain || !session.startDate || !session.endDate) {
    alert('Nieprawidłowy plik sesji.');
    return;
  }

  await applySession(session);
}

async function applySession(session) {
  // ustaw UI + reset stanu pod chain
  document.getElementById('chainSelect').value = session.chain;
  resetForChain(session.chain);

  // daty + checkboxy + root address
  document.getElementById('startDate').value = session.startDate;
  document.getElementById('endDate').value = session.endDate;
  syncDatesFromInputs();

  document.getElementById('showOutgoing').checked = !!session.showOutgoing;
  document.getElementById('showIncoming').checked = !!session.showIncoming;

  document.getElementById('addressInput').value = session.rootAddress || '';

  // waluta
  document.getElementById('currencySelect').value = session.currency;
  state.currentCurrency = session.currency;

  // odtwórz mapy
  state.depthMap = session.depthMap || {};
  state.duplicateMap = session.duplicateMap || {};
  state.labelMap = session.labelMap || {};
  state.finalAddressMap = session.finalAddressMap || {};

  // odtwórz graf
  ensureGraphDatasets();
  state.nodes.clear();
  state.edges.clear();

  const nodeIds = (session.nodes && session.nodes.length)
    ? session.nodes
    : Object.keys(state.depthMap);

  const nodeObjs = nodeIds.map(addr => createNodeObject(
    addr,
    state.labelMap[addr],
    !!state.finalAddressMap[addr]
  ));
  if (nodeObjs.length) state.nodes.add(nodeObjs);

  (session.edges || []).forEach(ed => {
    const native = ed.nativeValue !== '' ? Number(ed.nativeValue) : NaN;
    const label = Number.isFinite(native) ? formatEdgeLabelFromNative(native) : '';

    state.edges.add({
      from: ed.from,
      to: ed.to,
      arrows: 'to',
      color: { color: '#000000' },
      label,
      font: { color: '#888', size: 12, align: 'top' },
      smooth: {
        enabled: true,
        type: 'cubicBezier',
        forceDirection: 'horizontal',
        roundness: 0.5
      },
      _nativeValue: ed.nativeValue ?? ''
    });
  });

  // odtwórz tabele (i dociągnij transakcje z API)
  const collapsedSet = new Set(session.collapsedAddresses || []);
  (session.tableOrder || []).forEach(item => {
    const secId = renderTableForAddress(item.address, item.depth, !!item.isDuplicate);
    if (collapsedSet.has(item.address) && secId) {
      toggleTxSection(secId);
    }
  });

  // odtwórz widok grafu (jeśli zapisany)
  if (session.view && state.network) {
    state.network.moveTo({
      position: session.view.position,
      scale: session.view.scale,
      animation: false
    });
  }

  // odśwież kwoty (tabele + etykiety krawędzi)
  updateAllCurrencyDisplays();
}
