import assert from 'node:assert/strict';
import { getCredentialPresentation, hasRealPoints } from '../src/lib/credentialPresentation.js';

assert.equal(getCredentialPresentation({ mintStatus: 'minted', txHash: '0xabc' }).label, 'Issued');
assert.equal(getCredentialPresentation({ mintStatus: 'skipped_no_wallet' }).label, 'Claimed');
assert.equal(getCredentialPresentation({ mintStatus: 'failed' }).label, 'Issuance unavailable');
assert.equal(getCredentialPresentation({}).label, 'Status unavailable');
assert.equal(hasRealPoints({ points: 0 }), true);
assert.equal(hasRealPoints({}), false);
console.log('credential presentation tests passed');
