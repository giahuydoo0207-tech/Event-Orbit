import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../lib/verifySession.js';

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

  try {
    // 1. Session verification
    const session = await verifySession(req);
    if (!session || session.role !== 'organizer') {
      return res.status(403).json({ error: 'Forbidden. Only organizers can upload cover images.' });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data.' });
    }

    // 2. Parse data URI
    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Must be a valid Data URL.' });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Validation size & type
    if (buffer.length > 1.5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must be under 1.5MB.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported file type. Only JPEG, PNG, GIF, and WEBP are allowed.' });
    }

    // 4. Generate unique file path
    const extension = contentType.split('/')[1] || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = `${session.chapter_id || 'general'}/${fileName}`;

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-covers')
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image to storage.' });
    }

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-covers')
      .getPublicUrl(filePath);

    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Upload Cover API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
