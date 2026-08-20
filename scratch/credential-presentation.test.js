import assert from 'node:assert/strict';
import { getClaimPresentation, getCredentialPresentation, hasRealPoints, hasRealTransaction } from '../src/lib/credentialPresentation.js';

const realHash = `0x${'a'.repeat(64)}`;
assert.equal(getCredentialPresentation({ mintStatus: 'minted', txHash: realHash }).label, 'Issued');
assert.equal(getCredentialPresentation({ mintStatus: 'minted' }).label, 'Not available');
assert.equal(getCredentialPresentation({ mintStatus: 'success', txHash: '0xMOCK123' }).label, 'Not available');
assert.equal(getCredentialPresentation({ mintStatus: 'skipped_no_wallet' }).label, 'Off-chain only');
assert.equal(getCredentialPresentation({ mintStatus: 'skipped_relayer_unavailable' }).label, 'On-chain not available');
assert.equal(getCredentialPresentation({ mintStatus: 'failed' }).label, 'Mint failed');
assert.equal(getCredentialPresentation({}).label, 'Not available');
assert.equal(getClaimPresentation({}).label, 'Claimed');
assert.equal(getClaimPresentation({ claimStatus: 'ready' }).label, 'Ready to claim');
assert.equal(hasRealTransaction({ txHash: realHash }), true);
assert.equal(hasRealTransaction({ txHash: '0xMOCK123' }), false);
assert.equal(hasRealPoints({ points: 0 }), true);
assert.equal(hasRealPoints({}), false);
console.log('credential presentation tests passed');
