import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { mintBadge } from '../lib/relayer.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId) || typeof nonce !== 'string' || nonce.length > 128
      || !Number.isSafeInteger(expiresAt) || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Invalid QR payload.' });
    }

    if (!process.env.QR_SECRET) {
      console.error('QR_SECRET is not configured.');
      return res.status(503).json({ error: 'QR check-in is temporarily unavailable.' });
    }

    // Validate Signature
    const expectedSig = createHmac('sha256', process.env.QR_SECRET)
      .update(JSON.stringify({ eventId, nonce, expiresAt }))
      .digest('hex');
      
    const providedSignature = Buffer.from(signature, 'hex');
    const expectedSignature = Buffer.from(expectedSig, 'hex');
    if (providedSignature.length !== expectedSignature.length
      || !timingSafeEqual(providedSignature, expectedSignature)) {
      return res.status(400).json({ error: 'Invalid QR code signature.' });
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: 'QR code expired. Ask the organizer to refresh it.' });
    }

    const { data: reservationRows, error: reservationError } = await supabase.rpc('record_qr_checkin', {
      p_nonce: nonce,
      p_event_id: eventId,
      p_user_id: session.user_id,
      p_full_name: session.full_name || 'Student',
      p_ocid: session.ocid || null,
      p_mssv: session.mssv || null,
      p_eth_address: session.eth_address || null,
      p_expires_at: new Date(expiresAt).toISOString(),
    });

    if (reservationError) {
      if (reservationError.code === '23505') {
        return res.status(409).json({ error: 'You have already checked in to this event.' });
      }
      if (reservationError.code === 'P0002') {
        return res.status(404).json({ error: 'Event not found.' });
      }
      console.error('Atomic check-in reservation failed:', reservationError);
      return res.status(500).json({ error: 'Failed to reserve attendance credential.' });
    }

    const reservation = reservationRows?.[0];
    if (!reservation) return res.status(409).json({ error: 'Unable to reserve this check-in.' });

    // 6. Mint SBT (On-chain via Relayer if eth_address is present)
    let txHash = null;
    let mintStatus = 'skipped_no_wallet';
    let mocked = false;

    if (session.eth_address) {
      try {
        const relayerResult = await mintBadge({ 
          recipientAddress: session.eth_address,
          eventId,
          points: reservation.event_points
        });
        txHash = relayerResult.txHash;
        mocked = relayerResult.mocked;
        mintStatus = 'success';
      } catch (err) {
        console.error('Relayer minting failed:', err);
        txHash = null;
        mintStatus = 'failed';
      }
    }

    const { error: achError } = await supabase
      .from('achievements')
      .update({
        tx_hash: txHash,
        mint_status: mintStatus
      })
      .eq('id', reservation.achievement_id);

    if (achError) {
      console.error('Achievement recording error:', achError);
      return res.status(500).json({ error: 'Attendance was recorded, but mint status could not be updated.' });
    }

    return res.status(200).json({ ok: true, txHash, mocked, points: reservation.event_points });
  } catch (error) {
    console.error('Checkin handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
