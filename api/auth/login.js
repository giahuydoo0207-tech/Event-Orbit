import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { checkRateLimit } from '../../lib/rateLimit.js';
import { OcidConfigurationError, deriveSessionIdentity, verifyOcidIdToken } from '../../lib/authentication.js';
import { setSessionCookieHeader } from '../../lib/sessionCookie.js';
import { verifySession } from '../../lib/verifySession.js';
import { AuthorizationError, assertAdmin } from '../../lib/authorization.js';
import { normalizeSessionIdentity, resolveVerifiedAccess, resolveVerifiedPermissions } from '../../lib/sessionPermissions.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'https://event-orbit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const session = await verifySession(req);
    if (!session) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.query?.adminConsole === 'true') {
      try { assertAdmin(session); } catch (error) {
        if (error instanceof AuthorizationError) return res.status(403).json({ error: error.message });
        throw error;
      }
      const [admins, organizers, chapters] = await Promise.all([
        supabase.from('admin_users').select('ocid, status, created_at').order('created_at'),
        supabase.from('chapter_organizers').select('ocid, chapter_id, status, created_at, chapters(name)').order('created_at'),
        supabase.from('chapters').select('id, slug, name, ocid, description, category, avatar_gradient, follower_count, created_at').order('name'),
      ]);
      if (admins.error || organizers.error || chapters.error) return res.status(500).json({ error: 'Unable to load access records.' });
      return res.status(200).json({ admins: admins.data || [], organizers: organizers.data || [], chapters: chapters.data || [] });
    }
    let permissions;
    try {
      permissions = await resolveVerifiedPermissions(supabase, session);
    } catch (error) {
      console.error('Session permission lookup failed.');
      return res.status(500).json({ error: 'Unable to resolve account permissions.' });
    }
    return res.status(200).json({
      ok: true,
      user: {
        ocid: session.ocid,
        fullName: session.full_name,
        ethAddress: session.eth_address,
        role: session.role,
        chapterId: session.chapter_id,
        permissions,
      },
    });
  }

  if (req.method === 'PATCH') {
    const session = await verifySession(req);
    try { assertAdmin(session); } catch (error) {
      if (error instanceof AuthorizationError) return res.status(session ? 403 : 401).json({ error: error.message });
      throw error;
    }
    const { resource, action, ocid, chapterId } = req.body || {};
    const targetOcid = typeof ocid === 'string' ? ocid.trim().toLowerCase() : '';
    if (!/^[a-z0-9][a-z0-9._-]{2,127}$/i.test(targetOcid) || !['admin', 'organizer'].includes(resource) || !['grant', 'revoke', 'reactivate', 'delete'].includes(action)) {
      return res.status(400).json({ error: 'Invalid access management request.' });
    }
    try {
      if (resource === 'admin') {
        if (action === 'delete') {
          const { data: currentAdmin, error: fetchErr } = await supabase
            .from('admin_users')
            .select('status')
            .eq('ocid', targetOcid)
            .maybeSingle();
          if (fetchErr) throw fetchErr;
          if (!currentAdmin) return res.status(404).json({ error: 'Admin access record not found.' });
          if (currentAdmin.status !== 'revoked') {
            return res.status(400).json({ error: 'Only revoked admin access records can be permanently deleted.' });
          }
          const { error: delErr } = await supabase.from('admin_users').delete().eq('ocid', targetOcid);
          if (delErr) throw delErr;
        } else {
          const { error } = await supabase.rpc('manage_admin_access', { p_actor_ocid: session.ocid, p_target_ocid: targetOcid, p_action: action });
          if (error) {
            if (error.message?.includes('last_active_admin')) return res.status(409).json({ error: 'The final active admin cannot be revoked.' });
            throw error;
          }
        }
      } else {
        if (!chapterId) return res.status(400).json({ error: 'A chapter is required for organizer access.' });
        if (action === 'delete') {
          const { data: currentOrg, error: fetchErr } = await supabase
            .from('chapter_organizers')
            .select('status')
            .eq('chapter_id', chapterId)
            .eq('ocid', targetOcid)
            .maybeSingle();
          if (fetchErr) throw fetchErr;
          if (!currentOrg) return res.status(404).json({ error: 'Organizer access record not found.' });
          if (currentOrg.status !== 'revoked') {
            return res.status(400).json({ error: 'Only revoked organizer access records can be permanently deleted.' });
          }
          const { error: delErr } = await supabase.from('chapter_organizers').delete().eq('chapter_id', chapterId).eq('ocid', targetOcid);
          if (delErr) throw delErr;
        } else {
          const status = action === 'revoke' ? 'revoked' : 'active';
          if (status === 'active') {
            const { data: existingActive, error: checkError } = await supabase
              .from('chapter_organizers')
              .select('chapter_id, chapters(name)')
              .eq('ocid', targetOcid)
              .eq('status', 'active')
              .neq('chapter_id', chapterId)
              .maybeSingle();

            if (checkError) {
              console.error('Organizer duplicate check failed:', checkError);
              return res.status(500).json({ error: 'Unable to verify organizer permissions.' });
            }

            if (existingActive) {
              const chapterName = existingActive.chapters?.name || existingActive.chapter_id;
              return res.status(409).json({
                error: `This OCID is already an active organizer for "${chapterName}". Revoke that access first before granting a new chapter.`
              });
            }
          }
          const { error } = await supabase.from('chapter_organizers').upsert({ chapter_id: chapterId, ocid: targetOcid, role: 'organizer', status }, { onConflict: 'chapter_id,ocid' });
          if (error) throw error;
        }
      }
      await supabase.from('sessions').delete().eq('ocid', targetOcid);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Access management failed:', error?.name || 'Error', error);
      return res.status(500).json({ error: error.message || 'Unable to update access.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const rateOk = await checkRateLimit(req);
  if (!rateOk) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { idToken } = req.body || {};
    let claims;
    try {
      claims = await verifyOcidIdToken(idToken);
    } catch (error) {
      if (error instanceof OcidConfigurationError) {
        console.error('OCID login is not configured:', error.message);
        return res.status(503).json({ error: 'Open Campus ID login is not configured.' });
      }
      console.warn('Rejected invalid OCID login token:', error?.code || error?.name || 'verification_failed');
      return res.status(401).json({ error: 'Invalid or expired Open Campus ID token.' });
    }

    const tokenOcid = normalizeSessionIdentity({ ocid: claims.edu_username });
    if (!tokenOcid) {
      return res.status(401).json({ error: 'Open Campus ID token has no usable identity.' });
    }

    let verifiedAccess;
    try {
      verifiedAccess = await resolveVerifiedAccess(supabase, { ocid: tokenOcid });
    } catch (error) {
      console.error('Account permission lookup failed.');
      return res.status(500).json({ error: 'Unable to resolve account permissions.' });
    }
    const { permissions, organizerChapterId } = verifiedAccess;

    const normalizedClaims = { ...claims, edu_username: tokenOcid };
    const identity = deriveSessionIdentity(normalizedClaims, organizerChapterId ? { id: organizerChapterId } : null);
    if (permissions.admin) {
      identity.role = 'admin';
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from('sessions').insert({
      token,
      ...identity,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Session DB Error:', error);
      return res.status(500).json({ error: 'Database session storage failed.' });
    }

    setSessionCookieHeader(res, token, 604800);
    return res.status(200).json({
      ok: true,
      user: {
        ocid: identity.ocid,
        fullName: identity.full_name,
        ethAddress: identity.eth_address,
        role: identity.role,
        chapterId: identity.chapter_id,
        permissions: { ...permissions, student: Boolean(identity.user_id || identity.ocid || identity.mssv) },
      },
    });
  } catch (error) {
    console.error('Login Endpoint Error:', error?.name || 'Error');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
