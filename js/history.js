import { getEvents, getHistory } from './storage.js';
import { truncateAddress, formatDateTime } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication Check
  const organiserWallet = sessionStorage.getItem('current_organiser_wallet');
  if (!organiserWallet) {
    window.location.href = './index.html';
    return;
  }
  document.getElementById('wallet-address').innerText = truncateAddress(organiserWallet);

  // 2. Disconnect Handler
  document.getElementById('btn-disconnect').addEventListener('click', () => {
    sessionStorage.removeItem('current_organiser_wallet');
    window.location.href = './index.html';
  });

  // 3. Populate Event Filter
  const events = getEvents();
  const filterEventSelect = document.getElementById('history-filter-event');
  events.forEach(evt => {
    const opt = document.createElement('option');
    opt.value = evt.id;
    opt.innerText = evt.name;
    filterEventSelect.appendChild(opt);
  });

  // 4. Initial Render
  renderHistoryTable();

  // 5. Handle Filter / Search Input events
  const searchInput = document.getElementById('history-search');
  searchInput.addEventListener('input', renderHistoryTable);
  filterEventSelect.addEventListener('change', renderHistoryTable);
});

function renderHistoryTable() {
  const tableBody = document.getElementById('history-table-body');
  const searchVal = document.getElementById('history-search').value.toLowerCase().trim();
  const filterEvent = document.getElementById('history-filter-event').value;

  const history = getHistory();
  
  // Filter history records
  const filtered = history.filter(item => {
    // 1. Filter by event select
    if (filterEvent !== 'all' && item.eventId !== filterEvent) {
      return false;
    }
    // 2. Filter by search input (matches student name, wallet address or event name)
    if (searchVal !== '') {
      const matchName = item.studentName.toLowerCase().includes(searchVal);
      const matchWallet = item.studentWallet.toLowerCase().includes(searchVal);
      const matchEvent = item.eventName.toLowerCase().includes(searchVal);
      return matchName || matchWallet || matchEvent;
    }
    return true;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--eo-text-secondary);">
          Không tìm thấy lượt check-in nào phù hợp với bộ lọc.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = '';
  filtered.forEach(item => {
    const tr = document.createElement('tr');
    
    // Explorer Tx Hash Link
    const txLink = item.fullTxHash 
      ? `<a href="https://edu-chain-testnet.blockscout.com/tx/${item.fullTxHash}" target="_blank" class="block-link">${item.blockId}</a>`
      : `<span style="font-family: monospace; color: var(--eo-text-secondary); font-weight: bold;">${item.blockId}</span>`;

    tr.innerHTML = `
      <td>
        <div style="font-weight: 600;">${item.studentName}</div>
        <div style="font-size: 11px; color: var(--eo-text-secondary); font-family: monospace;">${truncateAddress(item.studentWallet)}</div>
      </td>
      <td style="font-weight: 500;">${item.eventName}</td>
      <td>${txLink}</td>
      <td style="color: var(--eo-success); font-weight: 700;">+${item.points} Điểm phong trào</td>
      <td style="color: var(--eo-text-secondary); font-size: 13px;">
        ${new Date(item.timestamp).toLocaleTimeString('vi-VN')} ${new Date(item.timestamp).toLocaleDateString('vi-VN')}
      </td>
    `;
    tableBody.appendChild(tr);
  });
}
