import { state } from '../state.js';

// Upewnia się, że vis jest załadowany i że mamy DataSet-y
export function ensureGraphDatasets() {
  if (typeof window.vis === 'undefined') {
    throw new Error('vis-network nie jest załadowany. Upewnij się, że skrypt vis-network jest dodany przed main.js.');
  }
  if (!state.nodes) state.nodes = new window.vis.DataSet([]);
  if (!state.edges) state.edges = new window.vis.DataSet([]);
}

function drawEntry(ctx, fillColor, borderColor, labelText, x, y, boxSize, lineHeight) {
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y - boxSize + 4, boxSize, boxSize);
  ctx.strokeRect(x, y - boxSize + 4, boxSize, boxSize);
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.fillText(labelText, x + boxSize + 12, y);
}

export function initNetwork() {
  ensureGraphDatasets();

  const container = document.getElementById('network');
  const data = { nodes: state.nodes, edges: state.edges };

  const options = {
    physics: { enabled: false },
    layout: {
      hierarchical: {
        direction: 'LR',
        sortMethod: 'directed',
        levelSeparation: 550,
        nodeSpacing: 100,
        treeSpacing: 300,
        blockShifting: true,
        edgeMinimization: true
      }
    },
    nodes: {
      shape: 'box',
      margin: 15,
      widthConstraint: { minimum: 220 },
      borderWidth: 2,
      color: {
        background: '#f5f5f5',
        border: '#808080',
        highlight: { background: '#e8e8e8', border: '#666666' }
      }
    },
    edges: {
      arrows: { to: { enabled: true, scaleFactor: 0.6 } },
      smooth: {
        enabled: true,
        type: 'cubicBezier',
        forceDirection: 'horizontal',
        roundness: 0.5
      }
    },
    interaction: {
      dragNodes: true,
      dragView: true,
      zoomView: true
    }
  };

  state.network = new window.vis.Network(container, data, options);

  // legenda
  state.network.on('afterDrawing', function(ctx) {
    ctx.save();

    const pixelRatio = state.network?.canvas?.pixelRatio ?? 1;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const padding = 20;
    const lineHeight = 32;
    const boxSize = 18;

    const legendWidth = 330;
    const legendHeight = 145;

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.fillRect(padding, padding, legendWidth, legendHeight);
    ctx.strokeRect(padding, padding, legendWidth, legendHeight);
    ctx.globalAlpha = 1.0;

    const startX = padding + 16;
    let y = padding + 28;

    ctx.font = 'bold 25px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText('Legenda', startX, y);
    y += 30;

    drawEntry(ctx, '#f5f5f5', '#808080', 'Adres zwykły', startX, y, boxSize, lineHeight);
    y += lineHeight;
    drawEntry(ctx, '#e3f2fd', '#1565c0', 'Adres giełdy', startX, y, boxSize, lineHeight);
    y += lineHeight;
    drawEntry(ctx, '#bdbdbd', '#424242', 'Adres końcowy', startX, y, boxSize, lineHeight);

    ctx.restore();
  });
}

export function fitGraph() {
  if (!state.network) return;
  state.network.fit();
}

export function exportGraphToPng() {
  const network = state.network;
  if (!network || !network.canvas || !network.canvas.frame || !network.canvas.frame.canvas) {
    alert('Graf nie jest jeszcze gotowy do eksportu.');
    return;
  }

  network.fit({
    animation: { duration: 0, easingFunction: 'linear' }
  });

  const canvas = network.canvas.frame.canvas;
  network.redraw();

  const dataURL = canvas.toDataURL('image/png');

  const addr = document.getElementById('addressInput').value.trim() || 'graf';
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const filename = `${state.currentChain.toLowerCase()}_graph_${addr}_${stamp}.png`.replace(/[^a-zA-Z0-9._-]/g, '_');

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createNodeObject(address, label = null, isFinal = false) {
  const short = address.slice(0, 5) + '...' + address.slice(-5);

  const nodeObj = {
    id: address,
    label: `*${short}*\n${address}`,
    font: {
      multi: 'md',
      size: 12,
      color: '#666666',
      bold: { size: 24, color: '#000000' }
    },
    level: state.depthMap[address] || 0
  };

  // jeśli mamy label (giełda/serwis)
  if (label) {
    nodeObj.label = `*${short}*\n${label}\n${address}`;
    nodeObj.color = {
      background: '#e3f2fd',
      border: '#1565c0',
      highlight: { background: '#bbdefb', border: '#0d47a1' }
    };
    nodeObj.font.color = '#0d47a1';
    nodeObj.font.bold.color = '#0d47a1';
  }

  // adres końcowy
  if (isFinal) {
    nodeObj.color = {
      background: '#bdbdbd',
      border: '#424242',
      highlight: { background: '#9e9e9e', border: '#212121' }
    };
    nodeObj.font.color = '#424242';
    nodeObj.font.bold.color = '#424242';
  }

  return nodeObj;
}

// Rekurencyjnie aktualizuje depth dla noda i jego potomków
export function updateDepthRecursively(address, newDepth) {
  const oldDepth = state.depthMap[address];

  // aktualizuj tylko jeśli nowy depth jest większy
  if (oldDepth >= newDepth) return;

  state.depthMap[address] = newDepth;

  const node = state.nodes.get(address);
  if (node) {
    state.nodes.update({
      id: address,
      level: newDepth,
      ...createNodeObject(address, state.labelMap[address], state.finalAddressMap[address])
    });
  }

  // dzieci = outgoing edges
  const outgoingEdges = state.edges.get({ filter: e => e.from === address });
  outgoingEdges.forEach(edge => {
    updateDepthRecursively(edge.to, newDepth + 1);
  });
}

