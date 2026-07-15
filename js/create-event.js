import { autoTagEvent } from './ai-tagger.js';
import { createEvent, addRegistration } from './storage.js';
import { showToast, truncateAddress } from './utils.js';

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

  const form = document.getElementById('create-event-form');
  const descTextarea = document.getElementById('event-desc');
  const aiTagBox = document.getElementById('ai-tag-box');
  const aiTagsContainer = document.getElementById('ai-tags-container');
  const customTagInput = document.getElementById('custom-tag-input');
  const btnAddTag = document.getElementById('btn-add-tag');

  let selectedTags = new Set();

  // 3. AI Auto-Tagging Trigger on Textarea Blur
  descTextarea.addEventListener('blur', async () => {
    const text = descTextarea.value.trim();
    if (text.length < 10) return; // Only trigger if enough content is written

    aiTagBox.style.display = 'block';
    aiTagsContainer.innerHTML = `
      <div style="font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
        <span class="loading-spinner" style="border: 2px solid #f3f3f3; border-top: 2px solid var(--primary); border-radius: 50%; width: 14px; height: 14px; display: inline-block; animation: spin 1s linear infinite;"></span>
        AI đang phân tích mô tả...
      </div>
    `;

    try {
      const tags = await autoTagEvent(text);
      aiTagsContainer.innerHTML = '';
      selectedTags.clear();

      tags.forEach(tag => {
        selectedTags.add(tag);
        createTagChip(tag, true);
      });

    } catch (e) {
      console.error(e);
      aiTagsContainer.innerHTML = '<span style="color: var(--danger); font-size: 13px;">Lỗi gọi AI auto-tagging.</span>';
    }
  });

  // 4. Custom Tag Add Handler
  btnAddTag.addEventListener('click', () => {
    const tagVal = customTagInput.value.trim();
    if (tagVal === '') return;
    
    // Format tag correctly (add # if not present)
    let formattedTag = tagVal.startsWith('#') ? tagVal : `#${tagVal}`;
    // Capitalize first letter
    formattedTag = formattedTag.charAt(0) + formattedTag.slice(1).toUpperCase();

    if (selectedTags.has(formattedTag)) {
      showToast('Tag này đã có rồi!', 'warning');
      return;
    }

    selectedTags.add(formattedTag);
    createTagChip(formattedTag, true);
    customTagInput.value = '';
  });

  // Create UI Chip for tags
  function createTagChip(tagText, isSelected) {
    const chip = document.createElement('span');
    chip.className = `tag-chip ${isSelected ? 'selected' : ''}`;
    chip.innerHTML = `${tagText} <span class="close-icon" style="font-size: 10px; opacity: 0.6; margin-left: 4px;">✕</span>`;
    
    chip.addEventListener('click', () => {
      if (selectedTags.has(tagText)) {
        selectedTags.delete(tagText);
        chip.classList.remove('selected');
      } else {
        selectedTags.add(tagText);
        chip.classList.add('selected');
      }
    });

    aiTagsContainer.appendChild(chip);
  }

  // 5. Submit event form
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('event-name').value.trim();
    const description = descTextarea.value.trim();
    const datetime = document.getElementById('event-datetime').value;
    const location = document.getElementById('event-location').value.trim();
    const capacity = parseInt(document.getElementById('event-capacity').value);
    const points = parseInt(document.getElementById('event-points').value);

    // Collect tags
    const finalTags = Array.from(selectedTags);
    if (finalTags.length === 0) {
      finalTags.push('#General');
    }

    const eventId = 'EVT-' + Math.floor(1000 + Math.random() * 9000);

    const newEvent = {
      id: eventId,
      name,
      description,
      datetime,
      location,
      capacity,
      points,
      tags: finalTags,
      icon: getIconByTags(finalTags)
    };

    // Save event to local DB
    createEvent(newEvent);

    // Tự động tạo 3 vé đăng ký (Mock Ticket) để Ban tổ chức có dữ liệu test quét QR
    // Ticket 1: Sử dụng ví của Organiser hiện tại để BTC có thể tự quét ví của mình test mint SBT
    addRegistration({
      ticketId: 'TCK-' + Math.floor(100000 + Math.random() * 900000),
      eventId: eventId,
      studentName: 'Sinh viên Test (Ví Bạn)',
      studentWallet: organiserWallet,
      checkedIn: false
    });

    // Ticket 2 & 3: Ví sinh viên giả lập khác
    addRegistration({
      ticketId: 'TCK-' + Math.floor(100000 + Math.random() * 900000),
      eventId: eventId,
      studentName: 'Nguyễn Hoàng Lâm',
      studentWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      checkedIn: false
    });

    addRegistration({
      ticketId: 'TCK-' + Math.floor(100000 + Math.random() * 900000),
      eventId: eventId,
      studentName: 'Trần Phương Vy',
      studentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      checkedIn: false
    });

    showToast('Tạo sự kiện mới và mở cổng đăng ký thành công!', 'success');

    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1200);
  });

  function getIconByTags(tags) {
    const primary = tags[0].toLowerCase();
    if (primary.includes('ai')) return 'ti-robot';
    if (primary.includes('block') || primary.includes('web3')) return 'ti-code';
    if (primary.includes('soft') || primary.includes('skill')) return 'ti-presentation';
    if (primary.includes('frontend') || primary.includes('html')) return 'ti-browser';
    if (primary.includes('backend') || primary.includes('python')) return 'ti-settings';
    return 'ti-calendar';
  }
});

// CSS Animation injected dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
