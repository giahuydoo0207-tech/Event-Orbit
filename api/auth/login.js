import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { checkRateLimit } from '../../lib/rateLimit.js';
import { OcidConfigurationError, deriveSessionIdentity, verifyOcidIdToken } from '../../lib/authentication.js';
import { setSessionCookieHeader } from '../../lib/sessionCookie.js';
import { verifySession } from '../../lib/verifySession.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const session = await verifySession(req);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    return res.status(200).json({
      ok: true,
      user: {
        ocid: session.ocid,
        fullName: session.full_name,
        ethAddress: session.eth_address,
        role: session.role,
        chapterId: session.chapter_id,
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { idToken } = req.body || {};
    let claims;
    try {
      claims = await verifyOcidIdToken(idToken);
    } catch (error) {
      if (error instanceof OcidConfigurationError) {
        console.error('OCID login is not configured:', error.message);
        return res.status(503).json({ error: 'Open Campus ID login is not configured.' });
      }
      console.warn('Rejected invalid OCID login token:', error?.code || error?.name || 'verification_failed');
      return res.status(401).json({ error: 'Invalid or expired Open Campus ID token.' });
    }

    const tokenOcid = typeof claims.edu_username === 'string' ? claims.edu_username.trim() : '';
    if (!tokenOcid) {
      return res.status(401).json({ error: 'Open Campus ID token has no usable identity.' });
    }

    const { data: organizerChapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id')
      .eq('ocid', tokenOcid)
      .maybeSingle();

    if (chapterError) {
      console.error('Organizer chapter lookup failed:', chapterError);
      return res.status(500).json({ error: 'Unable to resolve account permissions.' });
    }

    const identity = deriveSessionIdentity(claims, organizerChapter);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from('sessions').insert({
      token,
      ...identity,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Session DB Error:', error);
      return res.status(500).json({ error: 'Database session storage failed.' });
    }

    setSessionCookieHeader(res, token, 604800);
    return res.status(200).json({
      ok: true,
      user: {
        ocid: identity.ocid,
        fullName: identity.full_name,
        ethAddress: identity.eth_address,
        role: identity.role,
        chapterId: identity.chapter_id,
      },
    });
  } catch (error) {
    console.error('Login Endpoint Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
