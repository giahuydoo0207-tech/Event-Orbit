import { kv } from './kv.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const followersMap = (await kv.get('chapters:followers')) || {};

    if (req.method === 'GET') {
      return res.status(200).json(followersMap);
    }

    if (req.method === 'POST') {
      const { chapterId, action } = req.body;
      if (!chapterId || !action) {
        return res.status(400).json({ error: 'Missing chapterId or action' });
      }

      const currentCount = followersMap[chapterId] !== undefined ? followersMap[chapterId] : 0;
      let newCount = currentCount;

      if (action === 'follow') {
        newCount = currentCount + 1;
      } else if (action === 'unfollow') {
        newCount = Math.max(0, currentCount - 1);
      }

      followersMap[chapterId] = newCount;
      await kv.set('chapters:followers', followersMap);

      return res.status(200).json({ chapterId, followerCount: newCount });
    }

    return res.status(405).end();
  } catch (error) {
    console.error('API Error /api/chapters-follow:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
