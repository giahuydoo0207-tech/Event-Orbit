import { createRemoteJWKSet, jwtVerify } from 'jose';

const OCID_JWKS_URLS = Object.freeze({
  live: 'https://static.opencampus.xyz/jwks/jwks-live.json',
  sandbox: 'https://static.opencampus.xyz/jwks/jwks-sandbox.json',
});

const jwksByEnvironment = new Map();

export class OcidConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OcidConfigurationError';
  }
}

export function getOcidJwksUrl(environment = process.env.OCID_ENVIRONMENT) {
  return environment === 'sandbox' ? OCID_JWKS_URLS.sandbox : OCID_JWKS_URLS.live;
}

function getRemoteJwks(environment) {
  const url = getOcidJwksUrl(environment);
  if (!jwksByEnvironment.has(url)) {
    jwksByEnvironment.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksByEnvironment.get(url);
}

export async function verifyOcidIdToken(idToken, options = {}) {
  if (typeof idToken !== 'string' || idToken.length < 32 || idToken.length > 16_384) {
    throw new Error('A valid OCID ID token is required.');
  }

  const environment = options.environment || process.env.OCID_ENVIRONMENT;
  const audience = options.audience || process.env.OCID_CLIENT_ID;
  if (environment !== 'sandbox' && !audience) {
    throw new OcidConfigurationError('OCID_CLIENT_ID is required for live token verification.');
  }
  const verifyOptions = audience ? { audience } : {};
  const { payload } = await jwtVerify(
    idToken,
    options.jwks || getRemoteJwks(environment),
    verifyOptions,
  );

  return payload;
}

export function deriveSessionIdentity(verifiedClaims, organizerChapter) {
  const ocid = typeof verifiedClaims?.edu_username === 'string'
    ? verifiedClaims.edu_username.trim()
    : '';

  if (!ocid) {
    throw new Error('Verified OCID token is missing an identity claim.');
  }

  const ethAddress = typeof verifiedClaims.eth_address === 'string'
    ? verifiedClaims.eth_address.trim()
    : null;

  return {
    user_id: ocid,
    role: organizerChapter ? 'organizer' : 'student',
    chapter_id: organizerChapter?.id || null,
    ocid,
    mssv: null,
    full_name: typeof verifiedClaims.name === 'string' && verifiedClaims.name.trim()
      ? verifiedClaims.name.trim()
      : ocid,
    eth_address: ethAddress || null,
  };
}
