import { createHmac, randomUUID } from 'crypto';
import { verifySession } from '../../../lib/verifySession.js';

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
    if (!session || session.role !== 'organizer') {
      return res.status(403).json({ error: 'Not authorized. Organizer access required.' });
    }

    const { id: eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing event ID.' });
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
