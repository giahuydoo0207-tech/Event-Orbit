const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_CHAPTERS = [
  {
    slug: 'fit',
    name: 'IT Department',
    ocid: 'fit.opencampus.edu',
    description: 'AI workshops, Blockchain hackathons, and software engineering meetups for tech students.',
    category: 'Tech',
    avatar_gradient: 'from-blue-600 to-indigo-900',
    follower_count: 142
  },
  {
    slug: 'arts',
    name: 'Creative Arts Club',
    ocid: 'arts.opencampus.edu',
    description: 'Design sprints, wireframing bootcamps, and creative UI/UX showcase seminars.',
    category: 'Design',
    avatar_gradient: 'from-purple-600 to-pink-900',
    follower_count: 64
  },
  {
    slug: 'hub',
    name: 'Entrepreneurship Hub',
    ocid: 'hub.opencampus.edu',
    description: 'Startup incubation meetups, pitching guidelines, and VC networking sessions.',
    category: 'Business',
    avatar_gradient: 'from-amber-600 to-red-900',
    follower_count: 95
  },
  {
    slug: 'youth',
    name: 'Youth Union Board',
    ocid: 'youth.opencampus.edu',
    description: 'Campus social activities, community service runs, and student sports events.',
    category: 'Social',
    avatar_gradient: 'from-green-600 to-teal-900',
    follower_count: 310
  }
];

/**
 * Resolves a chapter input (which could be a UUID, a slug like 'fit', an ID like 'org-001', or an OCID)
 * into a valid Postgres UUID string from the Supabase `chapters` table.
 * If the `chapters` table is completely empty, it automatically seeds the 4 core chapters.
 */
export async function resolveChapterUuid(supabase, chapterInput) {
  const inputStr = chapterInput ? String(chapterInput).trim() : 'fit';

  // 1. If it's already a valid UUID, return it directly
  if (UUID_REGEX.test(inputStr)) {
    return inputStr;
  }

  // 2. Map legacy mock IDs (org-001 -> fit, org-002 -> arts, org-003 -> hub, org-004 -> youth)
  const legacySlugMap = {
    'org-001': 'fit',
    'org-002': 'arts',
    'org-003': 'hub',
    'org-004': 'youth'
  };
  const targetSlug = legacySlugMap[inputStr] || inputStr;

  // 3. Query Supabase chapters table by slug or ocid
  const { data: matched } = await supabase
    .from('chapters')
    .select('id')
    .or(`slug.eq.${targetSlug},ocid.ilike.%${targetSlug}%`)
    .limit(1)
    .maybeSingle();

  if (matched && matched.id) {
    return matched.id;
  }

  // 4. Query first row in chapters table
  const { data: fallback } = await supabase.from('chapters').select('id').limit(1).maybeSingle();
  if (fallback && fallback.id) {
    return fallback.id;
  }

  // 5. Emergency On-The-Fly Seeding: If chapters table is completely empty, seed all 4 chapters
  try {
    const { data: seeded, error: seedError } = await supabase
      .from('chapters')
      .upsert(DEFAULT_CHAPTERS, { onConflict: 'slug' })
      .select('id, slug');

    if (!seedError && seeded && seeded.length > 0) {
      const matchSeeded = seeded.find(c => c.slug === targetSlug) || seeded[0];
      return matchSeeded.id;
    }
  } catch (e) {
    console.error('Auto-seeding chapters error:', e);
  }

  return null;
}
