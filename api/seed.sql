-- Seed Data for Event Orbit (Supabase PostgreSQL)
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)

-- 1. Seed Chapters
INSERT INTO chapters (slug, name, ocid, description, category, avatar_gradient, follower_count)
VALUES 
  ('fit', 'IT Department', 'fit.opencampus.edu', 'AI workshops, Blockchain hackathons, and software engineering meetups for tech students.', 'Tech', 'from-blue-600 to-indigo-900', 142),
  ('arts', 'Creative Arts Club', 'arts.opencampus.edu', 'Design sprints, wireframing bootcamps, and creative UI/UX showcase seminars.', 'Design', 'from-purple-600 to-pink-900', 64),
  ('hub', 'Entrepreneurship Hub', 'hub.opencampus.edu', 'Startup incubation meetups, pitching guidelines, and VC networking sessions.', 'Business', 'from-amber-600 to-red-900', 95),
  ('youth', 'Youth Union Board', 'youth.opencampus.edu', 'Campus social activities, community service runs, and student sports events.', 'Social', 'from-green-600 to-teal-900', 310)
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name, 
  ocid = EXCLUDED.ocid, 
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  avatar_gradient = EXCLUDED.avatar_gradient;

-- 2. Seed Sample Events (Linked to 'fit' Chapter)
INSERT INTO events (slug, chapter_id, name, description, content, datetime, location_type, location, points, capacity, tags, category, theme, visibility, cover_image)
SELECT 
  'hcmc-ai-meetup-2026',
  id,
  'HCMC AI Meetup 2026',
  'A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.',
  'A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.\n\nThis meetup will provide insights into prompt engineering, RAG pipelines, and open-source models. Join us to network and exchange ideas with experts.',
  '2026-07-10 14:00:00+00',
  'In-person',
  'Grand Hall A, University of Information Technology, HCMC',
  5,
  150,
  ARRAY['AI', 'Python', 'LLM'],
  'Tech',
  'Minimal',
  'Public',
  'https://picsum.photos/seed/evt-101/800/400'
FROM chapters WHERE slug = 'fit'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO events (slug, chapter_id, name, description, content, datetime, location_type, location, points, capacity, tags, category, theme, visibility, cover_image)
SELECT 
  'solidity-smart-contract-workshop',
  id,
  'Solidity Smart Contract Workshop',
  'Hands-on developer workshop building & deploying ERC-721 and ERC-20 tokens on EDU Chain testnet.',
  'Hands-on developer workshop building & deploying ERC-721 and ERC-20 tokens on EDU Chain testnet.\n\nParticipants will write smart contracts in Remix IDE, deploy using Hardhat, and interact with web3 frontends using ethers.js.',
  '2026-07-15 09:00:00+00',
  'In-person',
  'Lab 402, Building B, UIT Campus',
  3,
  50,
  ARRAY['Blockchain', 'Solidity', 'Web3'],
  'Tech',
  'Neon',
  'Public',
  'https://picsum.photos/seed/evt-102/800/400'
FROM chapters WHERE slug = 'fit'
ON CONFLICT (slug) DO NOTHING;
