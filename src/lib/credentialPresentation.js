export function hasRealTransaction(credential = {}) {
  const hash = String(credential.txHash || '');
  return /^0x[0-9a-f]{64}$/i.test(hash);
}

export function getClaimPresentation(credential = {}) {
  if (credential.claimStatus === 'expired') return { label: 'Expired', tone: 'danger' };
  if (credential.claimStatus === 'ready') return { label: 'Ready to claim', tone: 'info' };
  if (credential.claimStatus === 'not_claimable') return { label: 'Not claimable', tone: 'neutral' };
  return { label: 'Claimed', tone: 'success' };
}

export function getCredentialPresentation(credential = {}) {
  const status = String(credential.mintStatus || '').toLowerCase();
  const isSample = Boolean(credential.isSample || String(credential.id || '').startsWith('sample-'));
  if (isSample) return { label: 'Sample', tone: 'neutral', evidence: 'Demo record' };
  if ((status === 'success' || status === 'minted') && hasRealTransaction(credential)) return { label: 'Issued', tone: 'success', evidence: 'Blockchain transaction recorded' };
  if (status === 'skipped_no_wallet') return { label: 'Off-chain only', tone: 'neutral', evidence: 'No blockchain transaction recorded' };
  if (status.startsWith('skipped_')) return { label: 'On-chain not available', tone: 'neutral', evidence: 'Minting prerequisites were unavailable' };
  if (status === 'pending' || status === 'minting') return { label: 'Issuance pending', tone: 'warning', evidence: 'Transaction not yet available' };
  if (status === 'failed') return { label: 'Mint failed', tone: 'danger', evidence: 'No completed transaction' };
  return { label: 'Not available', tone: 'neutral', evidence: 'No issuance evidence recorded' };
}

export function hasRealPoints(credential = {}) {
  return credential.points !== null && credential.points !== undefined && Number.isFinite(Number(credential.points));
}
