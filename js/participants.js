import { getHistory } from './storage.js';
import { truncateAddress, formatDateTime } from './utils.js';

let participantsData = [];
let currentSort = 'points-desc';

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

  // 3. Process & Aggregate Participant Data from Check-in History
  loadParticipants();

  // 4. Sort Dropdown Change Handler
  const sortSelect = document.getElementById('participants-sort');
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderParticipants();
  });

  // 5. Header Click Sorting
  const thTotalPoints = document.getElementById('th-total-points');
  thTotalPoints.addEventListener('click', () => {
    if (currentSort === 'points-desc') {
      currentSort = 'points-asc';
    } else {
      currentSort = 'points-desc';
    }
    sortSelect.value = currentSort;
    renderParticipants();
  });

  const thEventCount = document.getElementById('th-event-count');
  thEventCount.addEventListener('click', () => {
    if (currentSort === 'events-desc') {
      currentSort = 'events-asc'; // Fallback asc order
    } else {
      currentSort = 'events-desc';
    }
    sortSelect.value = currentSort;
    renderParticipants();
  });

  // 6. Search Filter Input Handler
  const searchInput = document.getElementById('participants-search');
  searchInput.addEventListener('input', renderParticipants);

  // 7. Modal Close Handler
  const modal = document.getElementById('participant-modal');
  const modalClose = document.getElementById('modal-close');
  modalClose.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

function loadParticipants() {
  const history = getHistory();
  const map = {};

  history.forEach(record => {
    const walletKey = record.studentWallet.toLowerCase();
    if (!map[walletKey]) {
      map[walletKey] = {
        name: record.studentName,
        wallet: record.studentWallet,
        eventCount: 0,
        totalPoints: 0,
        events: []
      };
    }
    map[walletKey].eventCount += 1;
    map[walletKey].totalPoints += record.points;
    map[walletKey].events.push({
      eventName: record.eventName,
      points: record.points,
      timestamp: record.timestamp
    });
  });

  participantsData = Object.values(map);
  renderParticipants();
}

function renderParticipants() {
  const tableBody = document.getElementById('participants-table-body');
  const searchVal = document.getElementById('participants-search').value.toLowerCase().trim();

  // 1. Filter Data
  let filtered = participantsData.filter(student => {
    if (searchVal !== '') {
      const matchName = student.name.toLowerCase().includes(searchVal);
      const matchWallet = student.wallet.toLowerCase().includes(searchVal);
      return matchName || matchWallet;
    }
    return true;
  });

  // 2. Sort Data
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'points-desc':
        return b.totalPoints - a.totalPoints;
      case 'points-asc':
        return a.totalPoints - b.totalPoints;
      case 'events-desc':
        return b.eventCount - a.eventCount;
      case 'events-asc':
        return a.eventCount - b.eventCount;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'vi');
      default:
        return b.totalPoints - a.totalPoints;
    }
  });

  // 3. Render Table rows
  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--eo-text-secondary);">
          Không tìm thấy sinh viên nào phù hợp với tìm kiếm.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = '';
  filtered.forEach(student => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    
    // Status color badge logic
    const statusHtml = `<span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-tag); background-color: var(--eo-success-light); border: 1px solid #C8EFDD; color: var(--eo-success);">Active</span>`;

    tr.innerHTML = `
      <td><strong>${student.name}</strong></td>
      <td style="font-family: monospace; color: var(--eo-text-secondary);">${truncateAddress(student.wallet)}</td>
      <td style="text-align: center; font-weight: 600;">${student.eventCount}</td>
      <td style="text-align: center; font-weight: 700; color: var(--eo-accent);">+${student.totalPoints} Điểm</td>
      <td>${statusHtml}</td>
      <td>
        <button class="btn btn-secondary btn-detail" style="padding: 4px 8px; font-size: 12px; font-weight: 600;">Xem chi tiết</button>
      </td>
    `;

    // Row Click or Button Click triggers modal detail popup
    const openModal = () => {
      showDetailModal(student);
    };

    tr.addEventListener('click', (e) => {
      // Don't trigger if click is on details button itself to prevent double trigger
      if (e.target.tagName !== 'BUTTON') {
        openModal();
      }
    });

    tr.querySelector('.btn-detail').addEventListener('click', openModal);

    tableBody.appendChild(tr);
  });
}

function showDetailModal(student) {
  const modal = document.getElementById('participant-modal');
  document.getElementById('modal-student-name').innerText = student.name;
  document.getElementById('modal-student-wallet').innerText = student.wallet;

  const tbody = document.getElementById('modal-events-tbody');
  tbody.innerHTML = '';

  student.events.forEach(evt => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding: 10px 14px; font-weight: 500;">${evt.eventName}</td>
      <td style="padding: 10px 14px; font-weight: 700; color: var(--eo-success);">+${evt.points} Điểm</td>
      <td style="padding: 10px 14px; color: var(--eo-text-secondary); font-size: 11px;">${formatDateTime(evt.timestamp)}</td>
    `;
    tbody.appendChild(tr);
  });

  modal.classList.add('show');
}
