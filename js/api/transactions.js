import { state } from '../state.js';
import { MIDDLE_MAN_ADDRESSES, MORALIS_API_KEY } from '../config.js';
import { createNodeObject } from '../graph/network.js';
import { formatCurrency } from '../currency/format.js';

export function fetchTransactions(address, tableId, depth, paginationToken = null, isDuplicate = false) {
  if (state.currentChain === 'BTC') {
    return fetchTransactionsBtc(address, tableId, depth, paginationToken, isDuplicate);
  } else if (state.currentChain === 'ETH') {
    return fetchTransactionsEth(address, tableId, depth, paginationToken, isDuplicate);
  }
}

async function fetchTransactionsBtc(address, tableId, depth, lastSeenTxid = null, isDuplicate = false) {
  const tableBody = document.querySelector(`#${tableId} tbody`);

  if (isDuplicate) {
    tableBody.innerHTML = `<tr><td colspan='4' style='background:#ffebee;color:#c62828;padding:8px 12px;text-align:center;font-weight:bold;'>This is a duplicate address</td></tr>`;
    return;
  }

  if (MIDDLE_MAN_ADDRESSES.includes(address)) {
    tableBody.innerHTML = `<tr><td colspan='4' style='background:#fff8e1;color:#ef6c00;padding:8px 12px;text-align:center;font-weight:bold;'>Adres pośrednika (Middle Man)</td></tr>`;
    return;
  }

  // label z walletexplorer (jeśli się uda)
  let label = null;
  try {
    const labelResp = await fetch(`https://www.walletexplorer.com/api/1/address-lookup?address=${address}`);
    const labelData = await labelResp.json();
    if (labelData.found && labelData.label) {
      label = labelData.label;
      state.labelMap[address] = labelData.label;
    }
  } catch (e) {}

  // aktualizacja noda (jeśli istnieje)
  const existingNode = state.nodes.get(address);
  if (existingNode) {
    state.nodes.update({
      id: address,
      ...createNodeObject(address, label || state.labelMap[address], state.finalAddressMap[address])
    });
  }

  const url = lastSeenTxid
    ? `https://blockstream.info/api/address/${address}/txs/chain/${lastSeenTxid}`
    : `https://blockstream.info/api/address/${address}/txs`;

  const showOutgoing = document.getElementById('showOutgoing').checked;
  const showIncoming = document.getElementById('showIncoming').checked;

  try {
    const response = await fetch(url);
    const txs = await response.json();

    if (!txs.length && !lastSeenTxid) {
      tableBody.innerHTML = `<tr><td colspan='4'>Brak transakcji dla tego adresu.</td></tr>`;
      return;
    }
    if (!lastSeenTxid) tableBody.innerHTML = '';

    let hasAny = false;
    let lastTxidForPagination = null;
    let addedRows = 0;

    txs.forEach(tx => {
      lastTxidForPagination = tx.txid;

      const blockTime = tx.status && tx.status.block_time ? tx.status.block_time : null;
      if (!blockTime || blockTime < state.START_DATE || blockTime > state.END_DATE) return;

      const time = new Date(blockTime * 1000).toLocaleString();

      // OUTGOING
      if (showOutgoing) {
        const isOutgoing = tx.vin.some(v => v.prevout && v.prevout.scriptpubkey_address === address);
        if (isOutgoing) {
          tx.vout.forEach(vout => {
            if (vout.scriptpubkey_address && vout.scriptpubkey_address !== address) {
              hasAny = true;
              const btc = vout.value / 1e8;

              const tr = document.createElement('tr');
              tr.style.background = '#fdecea';
              tr.innerHTML = `<td>${time}</td>
                              <td data-btc="${btc}">${formatCurrency(btc, 'out')}</td>
                              <td>${address}</td>
                              <td>
                                ${vout.scriptpubkey_address}
                                <br>
                                <button class="jump-btn"
                                  style="background:#1976d2;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;"
                                  data-to="${vout.scriptpubkey_address}" data-from="${address}" data-depth="${depth}" data-amount="${btc}">
                                  JUMP
                                </button>
                              </td>`;
              tableBody.appendChild(tr);
              addedRows++;
            }
          });
        }
      }

      // INCOMING
      if (showIncoming) {
        tx.vout.forEach(vout => {
          if (vout.scriptpubkey_address === address) {
            let fromAddr = (tx.vin[0] && tx.vin[0].prevout && tx.vin[0].prevout.scriptpubkey_address)
              ? tx.vin[0].prevout.scriptpubkey_address
              : 'Nieznany';

            if (fromAddr !== address) {
              hasAny = true;
              const btc = vout.value / 1e8;

              const tr = document.createElement('tr');
              tr.style.background = '#e6fbe6';
              tr.innerHTML = `<td>${time}</td>
                              <td data-btc="${btc}">${formatCurrency(btc, 'in')}</td>
                              <td>${fromAddr}</td>
                              <td></td>`;
              tableBody.appendChild(tr);
              addedRows++;
            }
          }
        });
      }
    });

    // Load more
    // Load more / pomijanie "pustych" stron po filtrowaniu dat
    const oldestBlockTime = txs[txs.length - 1]?.status?.block_time ?? null;
    const hasMorePages = (txs.length === 25 && lastTxidForPagination);

    if (hasMorePages) {
      // Jeśli z tej strony nic nie weszło do tabeli po filtrowaniu,
      // to albo idziemy dalej automatycznie, albo kończymy jeśli zeszliśmy poniżej START_DATE
      if (addedRows === 0) {
        if (oldestBlockTime && oldestBlockTime < state.START_DATE) {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td colspan="4" style="text-align:center;color:#666;padding:10px;">
            Brak kolejnych transakcji w podanym zakresie dat.
          </td>`;
          tableBody.appendChild(tr);
        } else {
          // pomijamy stronę bez wyników w zakresie
          return fetchTransactions(address, tableId, depth, lastTxidForPagination, isDuplicate);
        }
      } else {
        const loadMoreTr = document.createElement('tr');
        loadMoreTr.innerHTML = `<td colspan='4' style='text-align:center;'>
          <button id="loadMoreBtn_${tableId}" style="background:#1976d2;color:#fff;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;">
            Załaduj kolejne 25
          </button>
        </td>`;
        tableBody.appendChild(loadMoreTr);

        const nextTxid = lastTxidForPagination;
        document.getElementById(`loadMoreBtn_${tableId}`).onclick = function() {
          loadMoreTr.remove();
          fetchTransactions(address, tableId, depth, nextTxid, isDuplicate);
        };
      }
    }

    // Jeśli brak outgoing, to final
    if (!hasAny && showOutgoing) {
      state.finalAddressMap[address] = true;
      const n = state.nodes.get(address);
      if (n) {
        state.nodes.update({ id: address, ...createNodeObject(address, state.labelMap[address], true) });
      }
    }
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan='4'>Błąd pobierania transakcji (BTC).</td></tr>`;
  }
}

async function fetchTransactionsEth(address, tableId, depth, cursor = null, isDuplicate = false) {
  const tableBody = document.querySelector(`#${tableId} tbody`);

  if (isDuplicate) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4"
            style="background:#ffebee;color:#c62828;padding:8px 12px;text-align:center;font-weight:bold;">
          This is a duplicate address
        </td>
      </tr>`;
    return;
  }

  if (!cursor) tableBody.innerHTML = '';

  try {
    const params = new URLSearchParams({
      chain: 'eth',
      limit: '50',
      order: 'DESC'
    });

    if (cursor) params.set('cursor', cursor);

    // zakres dat (Moralis filtrujemy już po stronie klienta – tak jak w BTC)
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/history?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY
      }
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Moralis error: ${res.status} ${t}`);
    }

    const data = await res.json();
    const txs = data.result || [];

    const showOutgoing = document.getElementById('showOutgoing').checked;
    const showIncoming = document.getElementById('showIncoming').checked;

    const addrLower = address.toLowerCase();
    let hasAny = false;

    txs.forEach(tx => {
      const ts = tx.block_timestamp ? Date.parse(tx.block_timestamp) / 1000 : null;
      if (!ts || ts < state.START_DATE || ts > state.END_DATE) return;

      const time = new Date(ts * 1000).toLocaleString();

      const from = (tx.from_address || '').toLowerCase();
      const to = (tx.to_address || '').toLowerCase();

      const valueEth = (tx.value ? (Number(tx.value) / 1e18) : 0);

      // outgoing
      if (showOutgoing && from === addrLower && to && to !== addrLower) {
        hasAny = true;

        const tr = document.createElement('tr');
        tr.style.background = '#fdecea';
        tr.innerHTML = `<td>${time}</td>
                        <td data-btc="${valueEth}">${formatCurrency(valueEth, 'out')}</td>
                        <td>${address}</td>
                        <td>
                          ${tx.to_address}
                          <br>
                          <button class="jump-btn"
                            style="background:#1976d2;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;"
                            data-to="${tx.to_address}" data-from="${address}" data-depth="${depth}" data-amount="${valueEth}">
                            JUMP
                          </button>
                        </td>`;
        tableBody.appendChild(tr);
      }

      // incoming
      if (showIncoming && to === addrLower && from && from !== addrLower) {
        hasAny = true;

        const tr = document.createElement('tr');
        tr.style.background = '#e6fbe6';
        tr.innerHTML = `<td>${time}</td>
                        <td data-btc="${valueEth}">${formatCurrency(valueEth, 'in')}</td>
                        <td>${tx.from_address}</td>
                        <td></td>`;
        tableBody.appendChild(tr);
      }
    });

    // pagination (Moralis zwraca cursor)
    if (data.cursor) {
      const loadMoreTr = document.createElement('tr');
      loadMoreTr.innerHTML = `<td colspan='4' style='text-align:center;'>
        <button id="loadMoreBtn_${tableId}" style="background:#1976d2;color:#fff;border:none;padding:8px 18px;border-radius:4px;cursor:pointer;">
          Załaduj kolejne 50
        </button>
      </td>`;
      tableBody.appendChild(loadMoreTr);

      const nextCursor = data.cursor;
      document.getElementById(`loadMoreBtn_${tableId}`).onclick = function() {
        loadMoreTr.remove();
        fetchTransactions(address, tableId, depth, nextCursor, isDuplicate);
      };
    }

    // final address styling
    if (!hasAny && showOutgoing) {
      state.finalAddressMap[address] = true;
      const n = state.nodes.get(address);
      if (n) {
        state.nodes.update({ id: address, ...createNodeObject(address, state.labelMap[address], true) });
      }
    }
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan='4'>Błąd pobierania transakcji (ETH/Moralis).</td></tr>`;
  }
}

