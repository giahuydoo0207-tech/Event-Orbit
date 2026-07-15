import QRCode from 'qrcode';
import { getEventById, getRegistrations, getHistory } from './storage.js';
import { getContractInstance } from './web3.js';
import { showToast, truncateAddress, formatDateTime } from './utils.js';

let currentEventId = null;
let currentEvent = null;
let checkinUrl = '';
let pollInterval = null;
let lastHistoryLength = 0;

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
    clearInterval(pollInterval);
    window.location.href = './index.html';
  });

  // 3. Get Event from query param
  const urlParams = new URLSearchParams(window.location.search);
  currentEventId = urlParams.get('eventId');
  if (!currentEventId) {
    showToast('Không tìm thấy ID sự kiện!', 'danger');
    setTimeout(() => { window.location.href = './dashboard.html'; }, 1500);
    return;
  }

  currentEvent = getEventById(currentEventId);
  if (!currentEvent) {
    showToast('Sự kiện không tồn tại!', 'danger');
    setTimeout(() => { window.location.href = './dashboard.html'; }, 1500);
    return;
  }

  // 4. Update UI headers
  document.getElementById('event-title-display').innerText = `QR Check-in: ${currentEvent.name}`;
  document.getElementById('event-details-display').innerText = `${currentEvent.location} | SBT: +${currentEvent.points} Điểm phong trào`;

  // 5. Generate QR Code
  checkinUrl = `${window.location.origin}/student-checkin.html?eventId=${currentEventId}`;
  document.getElementById('checkin-qr-url').innerText = checkinUrl;

  await generateQR('checkin-qr-canvas', 280);

  // 6. Load initial stats
  updateCheckinStats();
  loadRecentLogs();
  lastHistoryLength = getHistory().filter(h => h.eventId === currentEventId).length;

  // 7. Start polling for new check-ins (every 5 seconds)
  pollInterval = setInterval(() => {
    pollForNewCheckins();
  }, 5000);

  // 8. Also try to listen for on-chain events (if contract available)
  tryListenBlockchainEvents();

  // 9. Fullscreen QR button
  const fullscreenModal = document.getElementById('fullscreen-qr-modal');
  document.getElementById('btn-fullscreen-qr').addEventListener('click', async () => {
    document.getElementById('fullscreen-event-name').innerText = currentEvent.name;
    await generateQR('fullscreen-qr-canvas', 360);
    fullscreenModal.classList.add('show');
  });

  document.getElementById('fullscreen-close').addEventListener('click', () => {
    fullscreenModal.classList.remove('show');
  });

  fullscreenModal.addEventListener('click', (e) => {
    if (e.target === fullscreenModal) fullscreenModal.classList.remove('show');
  });

  // 10. Copy URL button
  document.getElementById('btn-copy-url').addEventListener('click', () => {
    navigator.clipboard.writeText(checkinUrl).then(() => {
      showToast('Đã copy link check-in!', 'success');
    }).catch(() => {
      showToast('Không thể copy. Hãy copy thủ công.', 'warning');
    });
  });
});

// ── QR Generation ──
async function generateQR(canvasId, size) {
  const canvas = document.getElementById(canvasId);
  try {
    await QRCode.toCanvas(canvas, checkinUrl, {
      width: size,
      margin: 2,
      color: {
        dark: '#0A2540',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('QR generation failed:', err);
    showToast('Lỗi tạo mã QR', 'danger');
  }
}

// ── Stats Update ──
function updateCheckinStats() {
  const regs = getRegistrations().filter(r => r.eventId === currentEventId);
  const checked = regs.filter(r => r.checkedIn).length;

  document.getElementById('count-checked-in').innerText = checked;
  document.getElementById('count-total-registered').innerText = regs.length;
}

// ── Load Recent Logs ──
function loadRecentLogs() {
  const logsList = document.getElementById('checkin-logs-list');
  const history = getHistory().filter(h => h.eventId === currentEventId);

  if (history.length === 0) {
    logsList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--eo-text-secondary); font-size: 13px;">
        Đang chờ sinh viên quét mã QR...
      </div>
    `;
    return;
  }

  logsList.innerHTML = '';
  history.slice(0, 10).forEach(log => {
    addLogItem(log, false);
  });
}

function addLogItem(log, isNew = true) {
  const logsList = document.getElementById('checkin-logs-list');

  // Clear "waiting" message if first item
  if (logsList.querySelector('[style*="text-align: center"]')) {
    logsList.innerHTML = '';
  }

  const logItem = document.createElement('div');
  logItem.className = 'log-item';
  if (isNew) {
    logItem.style.animation = 'successPop 0.3s ease';
    logItem.style.backgroundColor = 'var(--eo-success-light)';
    setTimeout(() => { logItem.style.backgroundColor = ''; }, 3000);
  }

  logItem.innerHTML = `
    <div class="log-info">
      <div class="log-student">${log.studentName}</div>
      <div class="log-hash">${formatDateTime(log.timestamp)}</div>
    </div>
    <div>
      <span class="log-status success">+${log.points} Điểm</span>
    </div>
  `;

  if (isNew) {
    logsList.prepend(logItem);
  } else {
    logsList.appendChild(logItem);
  }
}

// ── Polling for new check-ins (localStorage) ──
function pollForNewCheckins() {
  const history = getHistory().filter(h => h.eventId === currentEventId);
  const currentLength = history.length;

  if (currentLength > lastHistoryLength) {
    // New check-ins found!
    const newEntries = history.slice(0, currentLength - lastHistoryLength);
    newEntries.reverse().forEach(entry => {
      addLogItem(entry, true);
    });

    updateCheckinStats();
    showToast(`${newEntries.length} sinh viên vừa check-in!`, 'success');
    lastHistoryLength = currentLength;
  }
}

// ── Blockchain Event Listener (for cross-device real-time) ──
async function tryListenBlockchainEvents() {
  try {
    const contract = await getContractInstance();
    const numEventId = parseInt(currentEventId.replace('EVT-', '')) || parseInt(currentEventId);

    // Listen for BadgeMinted events filtered by this eventId
    const filter = contract.filters.BadgeMinted(null, null, numEventId);
    contract.on(filter, (student, tokenId, eventId, points) => {
      console.log('On-chain BadgeMinted event detected:', { student, tokenId: tokenId.toString(), eventId: eventId.toString(), points: points.toString() });

      // Update stats from blockchain
      updateCheckinStats();

      showToast(`[Blockchain] SBT minted cho ${truncateAddress(student)}`, 'success');
    });

    console.log('Listening for on-chain BadgeMinted events...');
  } catch (e) {
    console.warn('Cannot listen for blockchain events (contract might not be deployed):', e.message);
  }
}
