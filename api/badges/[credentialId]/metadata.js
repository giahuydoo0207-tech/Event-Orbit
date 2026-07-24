import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Metadata should be readable by block explorers/wallets from anywhere
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { credentialId } = req.query;
    if (!credentialId) {
      return res.status(400).json({ error: 'Missing credential ID.' });
    }

    // Query achievement details along with event and chapter details
    const { data: ach, error: achError } = await supabase
      .from('achievements')
      .select('*, events(*, chapters(*))')
      .eq('credential_id', credentialId)
      .single();

    if (achError || !ach) {
      console.warn(`Badge metadata query failed for credentialId ${credentialId}:`, achError);
      return res.status(404).json({ error: 'Badge credential not found.' });
    }

    const event = ach.events;
    const chapter = event?.chapters;

    // Construct OpenSea standard ERC721 NFT metadata JSON
    const metadata = {
      name: event ? `Attendance Proof: ${event.name}` : 'Event Orbit Attendance Badge',
      description: event 
        ? `This Soulbound Token (SBT) certifies that the holder attended the event "${event.name}" organized by "${chapter?.name || 'Event Orbit Chapter'}".`
        : 'This Soulbound Token (SBT) certifies attendance at an Event Orbit chapter event.',
      image: event?.cover_image || `https://picsum.photos/seed/badge-${ach.event_id}/300/300`,
      external_url: `https://event-orbit-app.vercel.app/e/${event?.slug || ''}`,
      attributes: [
        {
          trait_type: 'Event Name',
          value: event?.name || 'Unknown Event'
        },
        {
          trait_type: 'Chapter',
          value: chapter?.name || 'Unknown Chapter'
        },
        {
          trait_type: 'Points Earned',
          value: ach.points || event?.points || 0,
          display_type: 'number'
        },
        {
          trait_type: 'Checked In Date',
          value: ach.checked_in_at ? new Date(ach.checked_in_at).toLocaleDateString() : 'N/A'
        },
        {
          trait_type: 'User ID',
          value: ach.user_id
        },
        {
          trait_type: 'Token Mint Status',
          value: ach.mint_status
        }
      ]
    };

    return res.status(200).json(metadata);
  } catch (error) {
    console.error('Badge Metadata API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
