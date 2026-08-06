import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CLAIM_BASE_URL = process.env.CLAIM_BASE_URL || 'https://event-orbit-app.vercel.app';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // Session Verification — Organizer only
  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (session.role !== 'organizer') {
    return res.status(403).json({ error: 'Forbidden. Only organizers can view pending claims.' });
  }

  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId query parameter.' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return res.status(400).json({ error: 'Invalid eventId format. Must be a valid UUID.' });
    }

    // Fetch all pending claims for this event, ordered by creation date
    const { data: claims, error: queryErr } = await supabase
      .from('pending_claims')
      .select('id, event_id, import_mssv, import_email, import_name, claim_token, status, claimed_by_ocid, claimed_by_eth_address, claimed_at, created_at, expires_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (queryErr) {
      console.error('[PendingClaims] Query error:', queryErr);
      return res.status(500).json({ error: 'Failed to fetch pending claims.' });
    }

    // Enrich with claim URLs
    const enrichedClaims = (claims || []).map(c => ({
      id: c.id,
      importMssv: c.import_mssv || null,
      importEmail: c.import_email || null,
      importName: c.import_name || 'Unknown',
      status: c.status,
      claimToken: c.claim_token,
      claimUrl: `${CLAIM_BASE_URL}/claim/${c.claim_token}`,
      claimedByOcid: c.claimed_by_ocid || null,
      claimedByEthAddress: c.claimed_by_eth_address || null,
      claimedAt: c.claimed_at || null,
      createdAt: c.created_at,
      expiresAt: c.expires_at
    }));

    const pendingCount = enrichedClaims.filter(c => c.status === 'pending').length;
    const claimedCount = enrichedClaims.filter(c => c.status === 'claimed').length;

    return res.status(200).json({
      ok: true,
      eventId,
      totalClaims: enrichedClaims.length,
      pendingCount,
      claimedCount,
      claims: enrichedClaims
    });
  } catch (error) {
    console.error('[PendingClaims] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
