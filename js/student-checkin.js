import { getEventById, getHistory, checkInTicketLocal, addRegistration, getRegistrations } from './storage.js';
import { connectWallet, getContractInstance, switchToEduChain } from './web3.js';
import { showToast, truncateAddress, generateMockHash, formatDateTime } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Read eventId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  if (!eventId) {
    showState('state-not-found');
    return;
  }

  const event = getEventById(eventId);
  if (!event) {
    showState('state-not-found');
    return;
  }

  // 2. Populate event info on the ready state
  document.getElementById('event-name').innerText = event.name;
  document.getElementById('event-location').innerText = event.location;
  document.getElementById('event-datetime').innerText = formatDateTime(event.datetime);
  document.getElementById('event-points').innerText = `+${event.points} Điểm`;

  // Pre-fill success state
  document.getElementById('success-event-name').innerText = event.name;
  document.getElementById('success-points').innerText = `+${event.points} Điểm`;

  // 3. Show ready state
  showState('state-ready');

  let studentWallet = null;

  // 4. Connect Wallet Button
  document.getElementById('btn-connect-wallet').addEventListener('click', async () => {
    try {
      studentWallet = await connectWallet();
      
      // Show connected state
      document.getElementById('connected-wallet-address').innerText = truncateAddress(studentWallet);
      document.getElementById('wallet-section').style.display = 'none';
      document.getElementById('wallet-connected-section').style.display = 'block';

      // Check if already checked in (on-chain first, then localStorage fallback)
      const alreadyCheckedIn = await checkAlreadyCheckedIn(studentWallet, eventId);
      if (alreadyCheckedIn) {
        showState('state-already');
        return;
      }

    } catch (error) {
      console.error('Wallet connection error:', error);
      showToast(error.message || 'Không thể kết nối ví MetaMask', 'danger');
    }
  });

  // 5. Confirm Check-in Button
  document.getElementById('btn-confirm-checkin').addEventListener('click', async () => {
    if (!studentWallet) {
      showToast('Vui lòng kết nối ví trước!', 'warning');
      return;
    }

    // Double-check anti-duplicate
    const alreadyCheckedIn = await checkAlreadyCheckedIn(studentWallet, eventId);
    if (alreadyCheckedIn) {
      showState('state-already');
      return;
    }

    // Show processing
    showState('state-processing');

    let txHash = '';

    try {
      // Attempt real blockchain mint
      const contract = await getContractInstance();
      const numEventId = parseInt(eventId.replace('EVT-', '')) || parseInt(eventId);

      console.log(`Student minting: mintProofBadge(${studentWallet}, ${numEventId}, ${event.points})`);

      const tx = await contract.mintProofBadge(
        studentWallet,
        numEventId,
        event.points
      );

      const receipt = await tx.wait();
      txHash = receipt.hash;
      console.log('SBT Minted on-chain, Tx Hash:', txHash);

    } catch (web3Error) {
      console.warn("Blockchain mint failed, using mock fallback:", web3Error);

      // Mock fallback: simulate blockchain delay
      txHash = generateMockHash();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save to localStorage so BTC dashboard (same machine demo) can see it
    saveCheckinToLocalStorage(studentWallet, eventId, event, txHash);

    // Show success state
    document.getElementById('tx-hash-link').innerText = txHash;
    document.getElementById('tx-hash-link').href = `https://edu-chain-testnet.blockscout.com/tx/${txHash}`;
    showState('state-success');
  });

  // 6. Retry button
  document.getElementById('btn-retry').addEventListener('click', () => {
    showState('state-ready');
  });
});

// ── Helper Functions ──

function showState(stateId) {
  const allStates = [
    'state-loading', 'state-not-found', 'state-ready',
    'state-processing', 'state-success', 'state-already', 'state-error'
  ];
  allStates.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(stateId).style.display = 'flex';
}

async function checkAlreadyCheckedIn(wallet, eventId) {
  // 1. Try on-chain check first
  try {
    const contract = await getContractInstance();
    const numEventId = parseInt(eventId.replace('EVT-', '')) || parseInt(eventId);
    const result = await contract.hasCheckedIn(wallet, numEventId);
    if (result) return true;
  } catch (e) {
    console.warn("On-chain hasCheckedIn check failed, falling back to localStorage:", e);
  }

  // 2. Fallback: check localStorage history
  const history = getHistory();
  return history.some(h =>
    h.studentWallet.toLowerCase() === wallet.toLowerCase() &&
    h.eventId === eventId
  );
}

function saveCheckinToLocalStorage(wallet, eventId, event, txHash) {
  // 1. Find or create a registration entry for this student
  const registrations = getRegistrations();
  let ticket = registrations.find(r =>
    r.studentWallet.toLowerCase() === wallet.toLowerCase() && r.eventId === eventId
  );

  if (!ticket) {
    // Auto-create a registration entry (student scanned QR directly, wasn't pre-registered)
    const ticketId = 'TCK-' + Math.floor(Math.random() * 90000 + 10000);
    ticket = {
      ticketId: ticketId,
      eventId: eventId,
      studentName: `Sinh viên ${truncateAddress(wallet)}`,
      studentWallet: wallet,
      checkedIn: false
    };
    addRegistration(ticket);
  }

  // 2. Mark as checked in and record history
  if (!ticket.checkedIn) {
    checkInTicketLocal(ticket.ticketId, eventId, wallet, txHash);
  }
}
