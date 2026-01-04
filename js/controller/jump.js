import { state } from '../state.js';
import { createNodeObject, updateDepthRecursively } from '../graph/network.js';
import { renderTableForAddress } from '../ui/tables.js';
import { formatEdgeLabelFromNative } from '../currency/format.js';

export async function jumpToAddress(btn, address, from, fromDepth, amount) {
  btn.disabled = true;
  btn.style.opacity = 0.5;
  btn.style.cursor = 'not-allowed';

  const newDepth = fromDepth + 1;

  // upewnij się, że "from" ma właściwy depth
  if (!state.depthMap[from] || state.depthMap[from] !== fromDepth) {
    state.depthMap[from] = fromDepth;
    const fromNode = state.nodes.get(from);
    if (fromNode) {
      state.nodes.update({
        id: from,
        level: fromDepth,
        ...createNodeObject(from, state.labelMap[from], state.finalAddressMap[from])
      });
    }
  }

  // duplikat?
  const existingNode = state.nodes.get(address);
  const isDuplicate = existingNode !== null;

  // label z walletexplorer (BTC) – jeśli nie mamy
  if (!state.labelMap[address] && state.currentChain === 'BTC') {
    try {
      const labelResp = await fetch(`https://www.walletexplorer.com/api/1/address-lookup?address=${address}`);
      const labelData = await labelResp.json();
      if (labelData.found && labelData.label) {
        state.labelMap[address] = labelData.label;
      }
    } catch (e) {}
  }

  // depth update
  const oldDepth = state.depthMap[address];
  const needsDepthUpdate = !oldDepth || oldDepth <= newDepth;

  if (isDuplicate) {
    state.duplicateMap[address] = true;
    if (needsDepthUpdate) {
      updateDepthRecursively(address, newDepth);
    }
  } else {
    state.depthMap[address] = newDepth;
    state.nodes.add(createNodeObject(address, state.labelMap[address]));
  }

  // kwota natywna (BTC/ETH) przekazana w amount
  let value = '';
  if (typeof amount === 'number') value = amount.toString();
  else if (typeof amount === 'string' && amount !== '') value = amount;

  // usuń istniejącą krawędź (żeby zaktualizować label)
  const existingEdge = state.edges.get({ filter: e => e.from === from && e.to === address });
  if (existingEdge.length) {
    state.edges.remove(existingEdge[0].id);
  }

  // label krawędzi wg wybranej waluty
  let edgeLabel = '';
  if (value !== '') {
    edgeLabel = formatEdgeLabelFromNative(parseFloat(value));
  }

  state.edges.add({
    from,
    to: address,
    arrows: 'to',
    color: { color: '#000000' },
    label: edgeLabel,
    font: { color: '#888', size: 12, align: 'top' },
    smooth: {
      enabled: true,
      type: 'cubicBezier',
      forceDirection: 'horizontal',
      roundness: 0.5
    },
    _nativeValue: value
  });

  // pokaż nową tabelę (i jednocześnie pobierz transakcje)
  renderTableForAddress(address, newDepth, isDuplicate);
}

