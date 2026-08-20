import { createClient } from '@supabase/supabase-js';
import { queryAchievements } from '../lib/achievementQuery.js';
import { verifySession } from '../lib/verifySession.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function toPublicAchievement(achievement) {
  return {
    id: achievement.id,
    credentialId: achievement.credentialId,
    eventId: achievement.eventId,
    eventName: achievement.eventName,
    eventDate: achievement.eventDate,
    issuerName: achievement.issuerName,
    points: achievement.points,
    earnedAt: achievement.earnedAt,
    txHash: achievement.txHash,
    mintStatus: achievement.mintStatus,
    claimStatus: achievement.claimStatus,
    tokenId: achievement.tokenId,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      if (req.query?.public === '1') {
        const ocid = req.query.ocid;
        if (typeof ocid !== 'string' || !ocid.trim()) {
          return res.status(400).json({ error: 'Missing public profile OCID.' });
        }

        const result = await queryAchievements(supabase, 'ocid', ocid.trim());
        return res.status(200).json({
          achievements: result.achievements.map(toPublicAchievement),
          totalPoints: result.totalPoints,
        });
      }

      const session = await verifySession(req);
      if (!session) {
        return res.status(401).json({ error: 'You must be logged in to view achievements.' });
      }

      const result = await queryAchievements(supabase, 'user_id', session.user_id);
      return res.status(200).json(result);
    }

    return res.status(405).end();
  } catch (error) {
    console.error('API Error /api/achievements:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
