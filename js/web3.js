import { ethers } from 'ethers';

// EDU Chain Testnet Parameters
export const EDU_CHAIN_PARAMS = {
  chainId: '0xa0454', // 656476 in hex
  chainName: 'EDU Chain Testnet (Codex)',
  nativeCurrency: {
    name: 'EDU Token',
    symbol: 'EDU',
    decimals: 18
  },
  rpcUrls: ['https://rpc.open-campus-codex.gelato.digital'],
  blockExplorerUrls: ['https://edu-chain-testnet.blockscout.com']
};

// ABI of ProofBadge contract
export const CONTRACT_ABI = [
  "function organiser() view returns (address)",
  "function isMinster(address) view returns (bool)",
  "function setMinterStatus(address minter, bool status) external",
  "function mintProofBadge(address to, uint256 eventId, uint256 points) external returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function getBadgeData(uint256 tokenId) view returns (uint256 eventId, uint256 points, uint256 timestamp)",
  "function hasCheckedIn(address, uint256) view returns (bool)",
  "event BadgeMinted(address indexed student, uint256 indexed tokenId, uint256 indexed eventId, uint256 points)",
  "event MinsterStatusUpdated(address indexed minter, bool status)"
];

// Default contract address (saved to local storage to make it editable without rebuilding)
const STORAGE_CONTRACT_KEY = 'eduai_orbit_contract_address';
// Default fallback address deployed for testing
const DEFAULT_CONTRACT_ADDRESS = '0xa11E488d578B321f645A5661b3690B448C2Ce3F5'; 

export function getContractAddress() {
  return localStorage.getItem(STORAGE_CONTRACT_KEY) || DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address) {
  if (address && address.startsWith('0x')) {
    localStorage.setItem(STORAGE_CONTRACT_KEY, address);
  }
}

// Request account access & check MetaMask
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('Vui lòng cài đặt ví MetaMask!');
  }
  
  // Switch network to EDU Chain Codex
  await switchToEduChain();
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  
  if (accounts.length === 0) {
    throw new Error('Không tìm thấy tài khoản ví nào.');
  }
  
  return accounts[0];
}

// Auto network switcher & adder for MetaMask
export async function switchToEduChain() {
  if (!window.ethereum) return;
  
  try {
    // Try switching network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: EDU_CHAIN_PARAMS.chainId }],
    });
  } catch (switchError) {
    // If the network does not exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [EDU_CHAIN_PARAMS],
        });
      } catch (addError) {
        throw new Error('Không thể thêm mạng EDU Chain vào ví MetaMask: ' + addError.message);
      }
    } else {
      throw switchError;
    }
  }
}

// Get provider and signer
export async function getWeb3Provider() {
  if (!window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum);
}

// Get connected Contract instance
export async function getContractInstance() {
  if (!window.ethereum) {
    throw new Error('Vui lòng kết nối MetaMask trước!');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contractAddress = getContractAddress();
  
  return new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
}
