import { createHmac, randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../../../lib/verifySession.js';
import { AuthorizationError, assertEventOwnership } from '../../../lib/authorization.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await verifySession(req);
    const { id: eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event ID.' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, chapter_id, status')
      .eq('id', eventId)
      .is('deleted_at', null)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.status !== 'published') return res.status(409).json({ error: 'QR check-in is only available for published events.' });
    try {
      assertEventOwnership(session, event);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({ error: error.message });
      }
      throw error;
    }

    if (!process.env.QR_SECRET) {
      console.error('QR_SECRET is not configured.');
      return res.status(503).json({ error: 'QR generation is temporarily unavailable.' });
    }

    const nonce = randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    const payload = { eventId, nonce, expiresAt };
    
    // Sign the payload using the QR_SECRET
    const signature = createHmac('sha256', process.env.QR_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Encode to base64 for easy transport in QR code
    const qrData = Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64');
    
    return res.status(200).json({ qrData, expiresAt });
  } catch (error) {
    console.error('QR Generator Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
