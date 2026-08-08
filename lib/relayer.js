import { ethers } from 'ethers';

// Correct ABI matching the ProofBadge.sol contract signature
const PROOFBADGE_ABI = [
  'function mintProofBadge(address to, uint256 eventId, uint256 points) external returns (uint256)',
];

/**
 * Mints an attendance SBT badge on-chain using the relayer wallet.
 * @param {string} recipientAddress The student's Ethereum wallet address
 * @param {string} eventId The UUID string of the event (will be hashed to a uint256 for the contract)
 * @param {number} points The movement points awarded
 * @returns {Promise<{txHash: string, mocked: boolean}>}
 */
export async function mintBadge({ recipientAddress, eventId, points }) {
  const contractAddress = process.env.PROOFBADGE_CONTRACT_ADDRESS;
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  const rpcUrl = process.env.EDU_RPC_URL || 'https://rpc.open-campus-codex.gelato.digital';

  // Mocking must be explicitly enabled and is never allowed in production.
  if (!contractAddress || !relayerPrivateKey) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_MINTING === 'true') {
      console.warn('[Relayer] Explicit mock minting is enabled for local development.');
      return { txHash: `0xMOCK${Date.now().toString(16)}`, mocked: true };
    }
    throw new Error('Badge relayer is not configured.');
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(relayerPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, PROOFBADGE_ABI, wallet);

    // Map UUID string (e.g. "5d0fa511-daf1-...") to a uint256 using Keccak256 hash
    // This allows unique and deterministic mapping of UUIDs to Solidity uint256
    const uuidBytes = ethers.toUtf8Bytes(eventId);
    const hashedUuid = ethers.keccak256(uuidBytes);
    const eventIdUint256 = BigInt(hashedUuid);

    const pointsUint256 = BigInt(points);

    console.log(`[Relayer] Dispatching mintProofBadge transaction:`);
    console.log(` - To: ${recipientAddress}`);
    console.log(` - Event ID (UUID): ${eventId}`);
    console.log(` - Event ID (Solidity uint256): ${eventIdUint256.toString()}`);
    console.log(` - Points: ${pointsUint256.toString()}`);

    // Send transaction
    const tx = await contract.mintProofBadge(recipientAddress, eventIdUint256, pointsUint256);
    
    console.log(`[Relayer] Transaction submitted. Hash: ${tx.hash}. Waiting for confirmation...`);
    
    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    
    console.log(`[Relayer] Transaction confirmed in block ${receipt.blockNumber}.`);
    
    return { txHash: tx.hash, mocked: false };
  } catch (error) {
    console.error('[Relayer] Error during on-chain minting:', error);
    throw error;
  }
}
