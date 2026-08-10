const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a chapter UUID, slug, or OCID
 * into a valid Postgres UUID string from the Supabase `chapters` table.
 */
export async function resolveChapterUuid(supabase, chapterInput) {
  const inputStr = chapterInput ? String(chapterInput).trim() : '';
  if (!inputStr) return null;

  // 1. If it's already a valid UUID, return it directly
  if (UUID_REGEX.test(inputStr)) {
    return inputStr;
  }

  // Resolve only exact, recognized identifiers. Never fall back to another
  // chapter: callers use this value as an authorization-sensitive filter.
  const { data: slugMatch } = await supabase
    .from('chapters')
    .select('id')
    .eq('slug', inputStr)
    .maybeSingle();
  if (slugMatch?.id) return slugMatch.id;

  const { data: ocidMatch } = await supabase
    .from('chapters')
    .select('id')
    .eq('ocid', inputStr)
    .maybeSingle();
  if (ocidMatch?.id) return ocidMatch.id;

  return null;
}
