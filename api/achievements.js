import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const achievements = (await kv.get('achievements:dynamic')) || [];

    if (req.method === 'GET') {
      const { ocid, wallet } = req.query;
      let result = achievements;

      if (ocid) {
        result = result.filter((a) => a.ocid && a.ocid === ocid);
      } else if (wallet) {
        result = result.filter(
          (a) => a.studentWallet && a.studentWallet.toLowerCase() === wallet.toLowerCase()
        );
      }
      
      const totalPoints = result.reduce((sum, item) => sum + item.points, 0);
      return res.status(200).json({ achievements: result, totalPoints });
    }

    if (req.method === 'POST') {
      const { eventId, student } = req.body;
      if (!eventId || !student) {
        return res.status(400).json({ error: 'Missing eventId or student data' });
      }

      const mssv = student.mssv;
      const ocid = student.ocid;
      const ethAddress = student.ethAddress;

      const alreadyCheckedIn = achievements.some(
        (a) =>
          a.eventId === eventId &&
          ((ethAddress && a.studentWallet && a.studentWallet.toLowerCase() === ethAddress.toLowerCase()) ||
            (ocid && a.ocid && a.ocid === ocid))
      );

      if (alreadyCheckedIn) {
        return res.status(409).json({ error: 'You have already checked in for this event.' });
      }

      const registrations = (await kv.get('registrations:dynamic')) || [];
      let reg = registrations.find(
        (r) =>
          r.eventId === eventId &&
          ((ethAddress && r.ethAddress && r.ethAddress.toLowerCase() === ethAddress.toLowerCase()) ||
            (mssv && r.mssv && r.mssv === mssv) ||
            (ocid && r.ocid && r.ocid.toLowerCase() === ocid.toLowerCase()))
      );

      const checkInTime = new Date().toISOString();

      if (reg && reg.checkedIn) {
        return res.status(409).json({ error: 'You have already checked in for this event.' });
      }

      if (!reg) {
        reg = {
          id: `REG-${Math.floor(Math.random() * 90000 + 10000)}`,
          eventId,
          studentName: student.fullName || `Student ${mssv || ocid || 'Guest'}`,
          ocid: ocid || null,
          ethAddress: ethAddress || null,
          mssv: mssv || null,
          checkedIn: true,
          checkedInAt: checkInTime,
          registeredAt: checkInTime
        };
        registrations.push(reg);
      } else {
        reg.checkedIn = true;
        reg.checkedInAt = checkInTime;
      }

      await kv.set('registrations:dynamic', registrations);

      const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');

      const newAch = {
        id: `ACH-${Math.floor(Math.random() * 90000 + 10000)}`,
        studentWallet: ethAddress || null,
        ocid: ocid || null,
        eventName: student.eventName || 'Verified Event Attendance',
        eventId: eventId,
        points: student.points || 5,
        earnedAt: checkInTime,
        txHash,
        badgeImage: `https://picsum.photos/seed/badge-${eventId}/150/150`
      };

      achievements.unshift(newAch);
      await kv.set('achievements:dynamic', achievements);

      return res.status(201).json({ success: true, txHash, achievement: newAch });
    }

    return res.status(405).end();
  } catch (error) {
    console.error('API Error /api/achievements:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
