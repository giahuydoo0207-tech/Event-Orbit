// Toast notification system
export function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✓';
  if (type === 'warning') icon = '⚠';
  if (type === 'danger') icon = '✕';
  
  toast.innerHTML = `
    <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: rgba(255,255,255,0.2); font-weight: bold; font-size: 14px;">${icon}</div>
    <div style="flex-grow: 1; font-size: 14px; font-weight: 500;">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Format crypto address for UI
export function truncateAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Format datetime local string to human readable format
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Helper to generate safe mock hash
export function generateMockHash() {
  return '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
}

// Validate Ethereum Address
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
