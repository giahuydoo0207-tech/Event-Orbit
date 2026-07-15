import { connectWallet } from './web3.js';
import { showToast } from './utils.js';
import { initDatabase } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize storage databases
  initDatabase();

  const btnConnect = document.getElementById('btn-connect');
  const connStatus = document.getElementById('connection-status');

  // Check if wallet is already connected previously (session storage or direct check)
  if (window.ethereum && window.ethereum.selectedAddress) {
    autoLogin();
  }

  btnConnect.addEventListener('click', async () => {
    btnConnect.disabled = true;
    btnConnect.innerText = 'Đang kết nối ví...';
    connStatus.style.display = 'block';
    connStatus.innerText = 'Vui lòng xác nhận yêu cầu kết nối trên ví MetaMask của bạn...';

    try {
      const address = await connectWallet();
      showToast('Kết nối ví MetaMask thành công!', 'success');
      
      // Store current logged-in address in session
      sessionStorage.setItem('current_organiser_wallet', address);
      
      setTimeout(() => {
        window.location.href = './dashboard.html';
      }, 1000);
      
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Kết nối ví thất bại!', 'danger');
      btnConnect.disabled = false;
      btnConnect.innerText = 'Kết nối ví MetaMask';
      connStatus.style.display = 'none';
    }
  });

  // Handle Demo Mode Bypass Connect
  const btnDemo = document.getElementById('btn-demo');
  btnDemo.addEventListener('click', () => {
    // Generate a mock organiser wallet address
    const mockOrganiserWallet = '0x111122223333444455556666777788889999AaaA';
    sessionStorage.setItem('current_organiser_wallet', mockOrganiserWallet);
    
    showToast('Đăng nhập chế độ Demo thành công (Giao dịch Blockchain sẽ được giả lập)!', 'warning');
    
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1000);
  });

  async function autoLogin() {
    try {
      const address = window.ethereum.selectedAddress;
      sessionStorage.setItem('current_organiser_wallet', address);
      window.location.href = './dashboard.html';
    } catch (e) {
      console.log('Auto login failed', e);
    }
  }
});
