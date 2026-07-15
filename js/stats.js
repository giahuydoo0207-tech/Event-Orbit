import { getRegistrations, getHistory } from './storage.js';
import { truncateAddress, formatDateTime } from './utils.js';
import { getContractInstance } from './web3.js';

document.addEventListener('DOMContentLoaded', async () => {
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

  // 3. Load Metrics
  await updateMetrics();

  // 4. Render Recent History
  renderHistory();
});

async function updateMetrics() {
  const registrations = getRegistrations();
  const history = getHistory();

  const totalRegistered = registrations.length;
  const totalCheckedIn = registrations.filter(r => r.checkedIn).length;
  const checkinRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

  document.getElementById('metric-registered').innerText = totalRegistered;
  document.getElementById('metric-checkin').innerText = `${checkinRate}%`;

  // Try reading from blockchain, fallback to local count
  let sbtMinted = history.length;
  try {
    const contract = await getContractInstance();
    const mintedCount = await contract.totalMinted();
    sbtMinted = Number(mintedCount);
  } catch (error) {
    console.warn("Không thể đọc dữ liệu từ smart contract. Đang dùng mock value từ localStorage.", error);
  }
  document.getElementById('metric-minted').innerText = sbtMinted;
}

function renderHistory() {
  const tableBody = document.getElementById('stats-history-body');
  const history = getHistory();

  if (history.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--eo-text-secondary);">
          Chưa có hoạt động check-in nào.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = '';
  // Show latest 10 entries
  history.slice(0, 10).forEach(item => {
    const tr = document.createElement('tr');

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
      <td style="color: var(--eo-success); font-weight: 700;">+${item.points} Điểm</td>
      <td style="color: var(--eo-text-secondary); font-size: 13px;">${formatDateTime(item.timestamp)}</td>
    `;
    tableBody.appendChild(tr);
  });
}
