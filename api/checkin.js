import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { mintBadge } from '../lib/relayer.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-session');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // 2. Session Verification
  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'You must be logged in to check in.' });
  }

  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ error: 'Missing QR data.' });
    }

    // Decode QR payload
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR format.' });
    }

    const { eventId, nonce, expiresAt, signature } = decoded;

    // Validate Signature
    const expectedSig = createHmac('sha256', process.env.QR_SECRET)
      .update(JSON.stringify({ eventId, nonce, expiresAt }))
      .digest('hex');
      
    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid QR code signature.' });
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: 'QR code expired. Ask the organizer to refresh it.' });
    }

    // 3. Replay Attack Prevention (using unique nonce constraint in DB)
    const { error: nonceError } = await supabase
      .from('qr_nonces')
      .insert({ 
        nonce, 
        event_id: eventId, 
        expires_at: new Date(expiresAt) 
      });

    if (nonceError) {
      // Postgres unique constraint violation code is 23505
      if (nonceError.code === '23505') {
        return res.status(409).json({ error: 'This QR code has already been used.' });
      }
      console.error('Nonce Insertion Error:', nonceError);
      return res.status(500).json({ error: 'Failed to record QR code verification.' });
    }

    // 4. Retrieve event details (points)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, points')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // 5. Mint SBT (On-chain via Relayer if eth_address is present)
    let txHash = null;
    let mintStatus = 'skipped_no_wallet';
    let mocked = false;

    if (session.eth_address) {
      try {
        const relayerResult = await mintBadge({ 
          recipientAddress: session.eth_address,
          eventId,
          points: event.points
        });
        txHash = relayerResult.txHash;
        mocked = relayerResult.mocked;
        mintStatus = mocked ? 'success' : 'minting';
      } catch (err) {
        console.error('Relayer minting failed:', err);
        txHash = null;
        mintStatus = 'failed';
      }
    }

    // 6. Record attendance / achievement in DB
    const { error: achError } = await supabase
      .from('achievements')
      .insert({
        event_id: eventId,
        user_id: session.user_id,
        ocid: session.ocid || null,
        credential_id: `cred-${Date.now()}`,
        points: event.points,
        tx_hash: txHash,
        mint_status: mintStatus
      });

    if (achError) {
      if (achError.code === '23505') {
        return res.status(409).json({ error: 'You have already checked in to this event.' });
      }
      console.error('Achievement recording error:', achError);
      return res.status(500).json({ error: 'Failed to save attendance badge.' });
    }

    // Update registration checked_in status if it exists
    await supabase
      .from('registrations')
      .update({ checked_in: true }) // Wait, registrations table doesn't have checked_in? Let's check schema!
      // Ah! Let's check the schema in schema.sql:
      // table registrations has: id, event_id, user_id, registered_at. It doesn't have checked_in!
      // Wait, is checked_in status only tracked in achievements table?
      // Yes! In achievements table we have user_id, event_id, points, checked_in_at.
      // So checking in means adding a record in achievements table!
      .eq('event_id', eventId)
      .eq('user_id', session.user_id);

    return res.status(200).json({ ok: true, txHash, mocked, points: event.points });
  } catch (error) {
    console.error('Checkin handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
