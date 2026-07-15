import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const registrations = (await kv.get('registrations:dynamic')) || [];

    if (req.method === 'GET') {
      const { userId, eventId } = req.query;
      let result = registrations;
      
      if (eventId) {
        result = result.filter((r) => r.eventId === eventId);
      }
      if (userId) {
        const u = userId.toLowerCase();
        result = result.filter(
          (r) =>
            (r.ocid && r.ocid.toLowerCase() === u) ||
            (r.mssv && r.mssv.toLowerCase() === u) ||
            (r.ethAddress && r.ethAddress.toLowerCase() === u)
        );
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { eventId, student, capacity } = req.body;
      if (!eventId || !student) {
        return res.status(400).json({ error: 'Missing eventId or student data' });
      }

      const mssv = student.mssv;
      const ocid = student.ocid;
      const ethAddress = student.ethAddress;

      // 1. Check if already registered
      const alreadyRegistered = registrations.some(
        (r) =>
          r.eventId === eventId &&
          ((ethAddress && r.ethAddress && r.ethAddress.toLowerCase() === ethAddress.toLowerCase()) ||
            (ocid && r.ocid && r.ocid.toLowerCase() === ocid.toLowerCase()) ||
            (mssv && r.mssv && r.mssv === mssv))
      );

      if (alreadyRegistered) {
        return res.status(409).json({ error: 'You have already registered for this event.' });
      }

      // 2. Check capacity
      const currentCount = registrations.filter((r) => r.eventId === eventId).length;
      if (capacity && currentCount >= capacity) {
        return res.status(409).json({ error: 'This event is full.' });
      }

      const newRegistration = {
        id: `REG-${Math.floor(Math.random() * 90000 + 10000)}`,
        eventId,
        studentName: student.fullName || 'Anonymous Student',
        ocid: ocid || null,
        ethAddress: ethAddress || null,
        mssv: mssv || null,
        checkedIn: false,
        checkedInAt: null,
        registeredAt: new Date().toISOString()
      };

      registrations.push(newRegistration);
      await kv.set('registrations:dynamic', registrations);
      return res.status(201).json(newRegistration);
    }

    return res.status(405).end();
  } catch (error) {
    console.error('API Error /api/registrations:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
