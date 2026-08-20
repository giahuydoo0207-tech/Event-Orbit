import { ethers } from 'ethers';

const PROOFBADGE_ABI = [
  'function mintProofBadge(address to, uint256 eventId, uint256 points) external returns (uint256)',
];

const DEFAULT_RPC_URL = 'https://rpc.open-campus-codex.gelato.digital';
const DEFAULT_CHAIN_ID = 656476;

export class MintUnavailableError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MintUnavailableError';
    this.code = code;
    this.mintAttempted = false;
  }
}

export class MintAttemptError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'MintAttemptError';
    this.code = code;
    this.mintAttempted = true;
  }
}

export function classifyMintError(error) {
  return {
    mintStatus: error?.mintAttempted ? 'failed' : 'skipped_relayer_unavailable',
    failureCode: error?.code || 'UNKNOWN_MINT_ERROR',
    mintAttempted: Boolean(error?.mintAttempted),
  };
}

function writeLog(level, event, details = {}) {
  const payload = { component: 'mint-relayer', event, ...details };
  console[level](JSON.stringify(payload));
}

function errorCode(error, fallback) {
  return typeof error?.code === 'string' ? error.code : fallback;
}

export async function mintBadge({ recipientAddress, eventId, points }) {
  const contractAddress = process.env.PROOFBADGE_CONTRACT_ADDRESS;
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
  const configuredRpcUrl = process.env.EDU_RPC_URL;
  const rpcUrl = configuredRpcUrl || DEFAULT_RPC_URL;
  const expectedChainId = Number(process.env.EDU_CHAIN_ID || DEFAULT_CHAIN_ID);
  const allowMock = process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_MINTING === 'true';

  writeLog('info', 'mint_start', {
    recipientWalletPresent: Boolean(recipientAddress),
    eventIdPresent: Boolean(eventId),
    pointsPresent: points !== null && points !== undefined,
  });
  writeLog('info', 'environment_presence', {
    contractAddressPresent: Boolean(contractAddress),
    relayerPrivateKeyPresent: Boolean(relayerPrivateKey),
    rpcUrlConfigured: Boolean(configuredRpcUrl),
    expectedChainIdConfigured: Boolean(process.env.EDU_CHAIN_ID),
    mockMintingEnabled: allowMock,
  });

  if (!recipientAddress || !ethers.isAddress(recipientAddress)) throw new MintUnavailableError('INVALID_RECIPIENT_WALLET', 'Recipient wallet is missing or invalid.');
  if (!contractAddress) throw new MintUnavailableError('MISSING_CONTRACT_ADDRESS', 'Credential contract address is not configured.');
  if (!ethers.isAddress(contractAddress)) throw new MintUnavailableError('INVALID_CONTRACT_ADDRESS', 'Credential contract address is invalid.');
  if (!relayerPrivateKey) {
    if (allowMock) {
      writeLog('warn', 'mint_mock_result', { mocked: true });
      return { txHash: `0xMOCK${Date.now().toString(16)}`, mocked: true, chainId: null };
    }
    throw new MintUnavailableError('MISSING_RELAYER_PRIVATE_KEY', 'Relayer private key is not configured.');
  }
  if (!Number.isSafeInteger(expectedChainId) || expectedChainId <= 0) throw new MintUnavailableError('INVALID_EXPECTED_CHAIN_ID', 'Expected chain ID is invalid.');

  let provider;
  let wallet;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    wallet = new ethers.Wallet(relayerPrivateKey, provider);
  } catch (error) {
    throw new MintUnavailableError(errorCode(error, 'INVALID_RELAYER_CONFIGURATION'), 'Relayer wallet or RPC configuration is invalid.');
  }

  let network;
  try {
    network = await provider.getNetwork();
  } catch (error) {
    throw new MintUnavailableError(errorCode(error, 'RPC_UNAVAILABLE'), 'EDU Chain RPC is unavailable.');
  }
  if (Number(network.chainId) !== expectedChainId) throw new MintUnavailableError('WRONG_CHAIN_ID', `RPC chain ID does not match expected chain ${expectedChainId}.`);

  let contractCode;
  let balance;
  try {
    [contractCode, balance] = await Promise.all([provider.getCode(contractAddress), provider.getBalance(wallet.address)]);
  } catch (error) {
    throw new MintUnavailableError(errorCode(error, 'RPC_PREFLIGHT_FAILED'), 'Unable to complete relayer RPC preflight checks.');
  }
  if (contractCode === '0x') throw new MintUnavailableError('CONTRACT_NOT_DEPLOYED', 'No contract code exists at the configured address.');
  if (balance === 0n) throw new MintUnavailableError('RELAYER_NO_GAS', 'Relayer wallet has no native token for gas.');

  const contract = new ethers.Contract(contractAddress, PROOFBADGE_ABI, wallet);
  const eventIdUint256 = BigInt(ethers.keccak256(ethers.toUtf8Bytes(eventId)));
  const pointsUint256 = BigInt(points);

  writeLog('info', 'mint_preflight_passed', { chainId: Number(network.chainId), contractCodePresent: true, relayerHasGas: true });
  try {
    const tx = await contract.mintProofBadge(recipientAddress, eventIdUint256, pointsUint256);
    writeLog('info', 'mint_submitted', { transactionHash: tx.hash });
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) throw new MintAttemptError('TRANSACTION_REVERTED', 'Mint transaction was not successful.');
    writeLog('info', 'mint_confirmed', { transactionHash: tx.hash, blockNumber: receipt.blockNumber, chainId: Number(network.chainId) });
    return { txHash: tx.hash, mocked: false, chainId: Number(network.chainId) };
  } catch (error) {
    const wrapped = error instanceof MintAttemptError ? error : new MintAttemptError(errorCode(error, 'CONTRACT_MINT_FAILED'), 'Credential contract mint failed.', error);
    writeLog('error', 'mint_failure', { failureCode: wrapped.code, mintAttempted: true, errorName: error?.name || 'Error', shortMessage: error?.shortMessage || error?.reason || 'Contract mint failed' });
    throw wrapped;
  }
}
