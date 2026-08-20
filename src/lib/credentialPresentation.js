export function getCredentialPresentation(credential = {}) {
  const status = String(credential.mintStatus || '').toLowerCase();
  const isSample = Boolean(credential.isSample || String(credential.id || '').startsWith('sample-'));
  if (isSample) return { label: 'Sample', tone: 'neutral', evidence: 'Demo record' };
  if (status === 'success' || status === 'minted') return { label: 'Issued', tone: 'success', evidence: credential.txHash ? 'Transaction recorded' : 'Issuance recorded' };
  if (status === 'claimed' || status === 'skipped_no_wallet') return { label: 'Claimed', tone: 'info', evidence: 'Credential added to profile' };
  if (status === 'pending' || status === 'minting') return { label: 'Issuance pending', tone: 'warning', evidence: 'Transaction not yet available' };
  if (status === 'failed') return { label: 'Issuance unavailable', tone: 'danger', evidence: 'No completed transaction' };
  return { label: 'Status unavailable', tone: 'neutral', evidence: 'No issuance status was recorded' };
}

export function hasRealPoints(credential = {}) {
  return credential.points !== null && credential.points !== undefined && Number.isFinite(Number(credential.points));
}
