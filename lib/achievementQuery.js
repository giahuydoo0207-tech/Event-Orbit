import { mapAchievementRecord } from './achievementRecord.js';

const ALLOWED_IDENTITY_COLUMNS = new Set(['user_id', 'ocid']);

export async function queryAchievements(supabase, identityColumn, identity) {
  if (!ALLOWED_IDENTITY_COLUMNS.has(identityColumn)) {
    throw new Error('Unsupported achievement identity column.');
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('id, event_id, user_id, ocid, credential_id, points, tx_hash, token_id, mint_status, checked_in_at, event:events!achievements_event_id_fkey(name, datetime, chapter:chapters(name))')
    .eq(identityColumn, identity)
    .order('checked_in_at', { ascending: false });

  if (error) throw error;

  const achievements = (data || []).map(mapAchievementRecord);
  const totalPoints = achievements.reduce((sum, item) => sum + (Number.isFinite(item.points) ? item.points : 0), 0);
  return { achievements, totalPoints };
}
