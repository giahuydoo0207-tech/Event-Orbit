import { kv } from './kv.js';

export default async function handler(req, res) {
  // Set CORS headers so it works across domains if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const dynamicEvents = (await kv.get('events:dynamic')) || [];
      return res.status(200).json(dynamicEvents);
    }

    if (req.method === 'POST') {
      const newEvent = req.body;
      if (!newEvent || !newEvent.name) {
        return res.status(400).json({ error: 'Invalid event data' });
      }
      
      const dynamicEvents = (await kv.get('events:dynamic')) || [];
      dynamicEvents.unshift(newEvent); // put new events at the beginning
      await kv.set('events:dynamic', dynamicEvents);
      return res.status(201).json(newEvent);
    }

    return res.status(405).end();
  } catch (error) {
    console.error('API Error /api/events:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
