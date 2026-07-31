import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const initialEventsToMigrate = [
  {
    slug: 'hcmc-ai-meetup-2026',
    name: 'HCMC AI Meetup 2026',
    description: 'A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.',
    content: "A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.\n\nThis meetup will provide insights into prompt engineering, RAG pipelines, and open-source models. Join us to network and exchange ideas with experts.",
    datetime: '2026-07-10T14:00:00Z',
    location_type: 'In-person',
    location: 'Grand Hall A, University of Information Technology, HCMC',
    points: 5,
    capacity: 150,
    tags: ['AI', 'Python', 'Networking'],
    category: 'Tech',
    theme: 'Tech',
    visibility: 'Public',
    cover_image: 'https://picsum.photos/seed/evt-101/800/400',
    chapter_slug: 'fit'
  },
  {
    slug: 'solidity-workshop',
    name: 'Solidity Smart Contract Workshop',
    description: 'Learn how to write secure Solidity code, compile, deploy, and interact with smart contracts on the Ethereum blockchain and EDU Chain. Perfect for intermediate Web3 developers.',
    content: "Learn how to write secure Solidity code, compile, deploy, and interact with smart contracts on the Ethereum blockchain and EDU Chain. Perfect for intermediate Web3 developers.\n\nWe will cover ERC-20 tokens, basic access control, and auditing practices. Bring your laptops for a hands-on developer session.",
    datetime: '2026-07-15T09:00:00Z',
    location_type: 'Hybrid',
    location: 'Lab 302, Block B, University of Technology & Zoom Online',
    points: 3,
    capacity: 50,
    tags: ['Web3', 'Blockchain', 'Security'],
    category: 'Tech',
    theme: 'Retro',
    visibility: 'Public',
    cover_image: 'https://picsum.photos/seed/evt-102/800/400',
    chapter_slug: 'fit'
  },
  {
    slug: 'design-thinking-ux-bootcamp',
    name: 'Design Thinking & UX Bootcamp',
    description: 'An interactive design sprint session. Learn how to solve user problems, build low-fidelity wireframes, and test concepts with actual users in a fast-paced environment.',
    content: "An interactive design sprint session. Learn how to solve user problems, build low-fidelity wireframes, and test concepts with actual users in a fast-paced environment.\n\nWe will guide you through user research methodologies, prototyping tools, and testing cycles. Ideal for aspiring UI/UX designers.",
    datetime: '2026-07-22T10:00:00Z',
    location_type: 'In-person',
    location: 'Art Studio, Innovation Center',
    points: 4,
    capacity: 40,
    tags: ['UX', 'UI', 'Design'],
    category: 'Design',
    theme: 'Art',
    visibility: 'Public',
    cover_image: 'https://picsum.photos/seed/evt-103/800/400',
    chapter_slug: 'arts'
  },
  {
    slug: 'pitching-investors-startup-101',
    name: 'Pitching to Investors: Startup 101',
    description: 'How to structure your pitch deck, tell a compelling story, define your business model, and negotiate terms with angel investors and early-stage venture capitalists.',
    content: "How to structure your pitch deck, tell a compelling story, define your business model, and negotiate terms with angel investors and early-stage venture capitalists.\n\nThis session includes slide-by-slide pitch breakdown, valuation basics, and founder stories. Bring your startup deck for live feedback from mentors.",
    datetime: '2026-07-28T18:00:00Z',
    location_type: 'Online',
    location: 'Google Meet (Link will be sent to registered attendees)',
    points: 2,
    capacity: 200,
    tags: ['Startup', 'Pitching', 'Business'],
    category: 'Business',
    theme: 'Minimal',
    visibility: 'Public',
    cover_image: 'https://picsum.photos/seed/evt-104/800/400',
    chapter_slug: 'hub'
  },
  {
    slug: 'community-charity-run-2026',
    name: 'Community Charity Run 2026',
    description: 'Annual charity running event to raise funds for local education initiatives. Join us to run for a good cause and earn positive movement points.',
    content: "Annual charity running event to raise funds for local education initiatives. Join us to run for a good cause and earn positive movement points.\n\nThe route is 5km around Sala Park. Water stations and custom physical badges will be provided to all checked-in participants. Register and run for local kids!",
    datetime: '2026-08-05T06:00:00Z',
    location_type: 'In-person',
    location: 'Sala Park, District 2, HCMC',
    points: 5,
    capacity: 500,
    tags: ['Charity', 'Social', 'Health'],
    category: 'Social',
    theme: 'Nature',
    visibility: 'Public',
    cover_image: 'https://picsum.photos/seed/evt-105/800/400',
    chapter_slug: 'youth'
  }
];

async function migrateEvents() {
  console.log('=== STEP 1: Migrating initialEvents to Supabase Postgres DB ===');

  // Fetch chapters to get Postgres UUIDs
  const { data: chapters, error: chErr } = await supabase.from('chapters').select('id, slug');
  if (chErr) {
    console.error('Failed to fetch chapters:', chErr);
    return;
  }

  const chapterMap = new Map();
  chapters.forEach(c => chapterMap.set(c.slug, c.id));

  for (const evt of initialEventsToMigrate) {
    const chapterId = chapterMap.get(evt.chapter_slug);
    if (!chapterId) {
      console.warn(`No chapter found for slug ${evt.chapter_slug}`);
      continue;
    }

    const { chapter_slug, ...eventData } = evt;
    eventData.chapter_id = chapterId;

    // Check if event already exists by slug
    const { data: existing } = await supabase
      .from('events')
      .select('id, name')
      .eq('slug', evt.slug)
      .maybeSingle();

    if (existing) {
      console.log(`[EXISTS] Event '${evt.name}' already in Supabase with UUID: ${existing.id}`);
    } else {
      const { data: created, error: createErr } = await supabase
        .from('events')
        .insert(eventData)
        .select('id, name')
        .single();

      if (createErr) {
        console.error(`[ERROR] Failed to insert '${evt.name}':`, createErr);
      } else {
        console.log(`[CREATED] Inserted '${evt.name}' with UUID: ${created.id}`);
      }
    }
  }

  console.log('\n=== MIGRATION VERIFICATION ===');
  const { data: allEvts } = await supabase.from('events').select('id, slug, name, chapter_id');
  console.log('All events in Supabase Postgres DB count:', allEvts ? allEvts.length : 0);
  console.log(allEvts);
}

migrateEvents();
