import { getEvents, getRegistrations } from './storage.js';
import { truncateAddress, formatDateTime } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authentication Check
  const organiserWallet = sessionStorage.getItem('current_organiser_wallet');
  if (!organiserWallet) {
    window.location.href = './index.html';
    return;
  }

  // Update wallet display on sidebar
  document.getElementById('wallet-address').innerText = truncateAddress(organiserWallet);

  // 2. Disconnect Handler
  document.getElementById('btn-disconnect').addEventListener('click', () => {
    sessionStorage.removeItem('current_organiser_wallet');
    window.location.href = './index.html';
  });

  // 3. Render Events
  renderEvents();
});

function renderEvents() {
  const eventsGrid = document.getElementById('events-grid');
  const events = getEvents();
  const registrations = getRegistrations();

  if (events.length === 0) {
    eventsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--eo-text-secondary);">
        Chưa có sự kiện nào được tạo. Nhấn "Tạo sự kiện mới" để bắt đầu.
      </div>
    `;
    return;
  }

  eventsGrid.innerHTML = '';
  events.forEach(event => {
    // Calculate registered count for this specific event
    const eventRegs = registrations.filter(r => r.eventId === event.id);
    const eventCheckedIn = eventRegs.filter(r => r.checkedIn).length;
    
    const card = document.createElement('div');
    card.className = 'event-card';
    
    // Render tags
    const tagsHtml = event.tags.map(tag => {
      const isSecond = tag.toLowerCase().includes('soft') || tag.toLowerCase().includes('general');
      return `<span class="tag ${isSecond ? 'tag-secondary' : 'tag-primary'}">${tag}</span>`;
    }).join(' ');

    card.innerHTML = `
      <div class="event-header">
        <div class="event-title">${event.name}</div>
      </div>
      <div class="event-meta">
        <div class="event-meta-item">
          <i class="ti ti-map-pin"></i> <span>${event.location}</span>
        </div>
        <div class="event-meta-item">
          <i class="ti ti-calendar"></i> <span>${formatDateTime(event.datetime)}</span>
        </div>
        <div class="event-meta-item">
          <i class="ti ti-users"></i> <span>Đăng ký: ${eventCheckedIn}/${eventRegs.length || event.capacity}</span>
        </div>
      </div>
      <div class="tags-container">
        ${tagsHtml}
      </div>
      <div class="event-footer">
        <div class="event-points">
          <span>SBT</span> <span>+${event.points} Điểm</span>
        </div>
        <a href="./checkin.html?eventId=${event.id}" class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;">
          <i class="ti ti-qrcode" style="font-size: 14px;"></i> Hiển thị QR Check-in
        </a>
      </div>
    `;
    eventsGrid.appendChild(card);
  });
}
