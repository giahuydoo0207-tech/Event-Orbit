export const CHAPTERS = [
  { 
    id: 'org-001', 
    slug: 'fit',
    name: 'IT Department', 
    ocid: 'fit.opencampus.edu', 
    description: 'AI workshops, Blockchain hackathons, and software engineering meetups for tech students.', 
    followerCount: 142, 
    eventsHosted: 2, 
    avatarGradient: 'from-blue-600 to-indigo-900', 
    category: 'Tech' 
  },
  { 
    id: 'org-002', 
    slug: 'arts',
    name: 'Creative Arts Club', 
    ocid: 'arts.opencampus.edu', 
    description: 'Design sprints, wireframing bootcamps, and creative UI/UX showcase seminars.', 
    followerCount: 64, 
    eventsHosted: 1, 
    avatarGradient: 'from-purple-600 to-pink-900', 
    category: 'Design' 
  },
  { 
    id: 'org-003', 
    slug: 'hub',
    name: 'Entrepreneurship Hub', 
    ocid: 'hub.opencampus.edu', 
    description: 'Startup incubation meetups, pitching guidelines, and VC networking sessions.', 
    followerCount: 95, 
    eventsHosted: 1, 
    avatarGradient: 'from-amber-600 to-red-900', 
    category: 'Business' 
  },
  { 
    id: 'org-004', 
    slug: 'youth',
    name: 'Youth Union Board', 
    ocid: 'youth.opencampus.edu', 
    description: 'Campus social activities, community service runs, and student sports events.', 
    followerCount: 310, 
    eventsHosted: 1, 
    avatarGradient: 'from-green-600 to-teal-900', 
    category: 'Social' 
  }
];

export const initialEvents = [
  {
    id: '101',
    slug: 'hcmc-ai-meetup-2026',
    name: 'HCMC AI Meetup 2026',
    description: 'A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.',
    content: "A gathering of developers, researchers, and AI enthusiasts in HCMC. Learn about latest advancements in Large Language Models (LLMs) and real-world generative AI business cases.\n\nThis meetup will provide insights into prompt engineering, RAG pipelines, and open-source models. Join us to network and exchange ideas with experts.",
    datetime: '2026-07-10T14:00',
    locationType: 'In-person',
    location: 'Grand Hall A, University of Information Technology, HCMC',
    points: 5,
    capacity: 150,
    registered: 120,
    tags: ['AI', 'Python', 'Networking'],
    category: 'Tech',
    theme: 'Tech',
    visibility: 'Public',
    coverImage: 'https://picsum.photos/seed/evt-101/800/400',
    chapterId: 'org-001'
  },
  {
    id: '102',
    slug: 'solidity-workshop',
    name: 'Solidity Smart Contract Workshop',
    description: 'Learn how to write secure Solidity code, compile, deploy, and interact with smart contracts on the Ethereum blockchain and EDU Chain. Perfect for intermediate Web3 developers.',
    content: "Learn how to write secure Solidity code, compile, deploy, and interact with smart contracts on the Ethereum blockchain and EDU Chain. Perfect for intermediate Web3 developers.\n\nWe will cover ERC-20 tokens, basic access control, and auditing practices. Bring your laptops for a hands-on developer session.",
    datetime: '2026-07-15T09:00',
    locationType: 'Hybrid',
    location: 'Lab 302, Block B, University of Technology & Zoom Online',
    points: 3,
    capacity: 50,
    registered: 45,
    tags: ['Web3', 'Blockchain', 'Security'],
    category: 'Tech',
    theme: 'Retro',
    visibility: 'Public',
    coverImage: 'https://picsum.photos/seed/evt-102/800/400',
    chapterId: 'org-001'
  },
  {
    id: '103',
    slug: 'design-thinking-ux-bootcamp',
    name: 'Design Thinking & UX Bootcamp',
    description: 'An interactive design sprint session. Learn how to solve user problems, build low-fidelity wireframes, and test concepts with actual users in a fast-paced environment.',
    content: "An interactive design sprint session. Learn how to solve user problems, build low-fidelity wireframes, and test concepts with actual users in a fast-paced environment.\n\nWe will guide you through user research methodologies, prototyping tools, and testing cycles. Ideal for aspiring UI/UX designers.",
    datetime: '2026-07-22T10:00',
    locationType: 'In-person',
    location: 'Art Studio, Innovation Center',
    points: 4,
    capacity: 40,
    registered: 32,
    tags: ['UX', 'UI', 'Design'],
    category: 'Design',
    theme: 'Art',
    visibility: 'Public',
    coverImage: 'https://picsum.photos/seed/evt-103/800/400',
    chapterId: 'org-002'
  },
  {
    id: '104',
    slug: 'pitching-investors-startup-101',
    name: 'Pitching to Investors: Startup 101',
    description: 'How to structure your pitch deck, tell a compelling story, define your business model, and negotiate terms with angel investors and early-stage venture capitalists.',
    content: "How to structure your pitch deck, tell a compelling story, define your business model, and negotiate terms with angel investors and early-stage venture capitalists.\n\nThis session includes slide-by-slide pitch breakdown, valuation basics, and founder stories. Bring your startup deck for live feedback from mentors.",
    datetime: '2026-07-28T18:00',
    locationType: 'Online',
    location: 'Google Meet (Link will be sent to registered attendees)',
    points: 2,
    capacity: 200,
    registered: 140,
    tags: ['Startup', 'Pitching', 'Business'],
    category: 'Business',
    theme: 'Minimal',
    visibility: 'Public',
    coverImage: 'https://picsum.photos/seed/evt-104/800/400',
    chapterId: 'org-003'
  },
  {
    id: '105',
    slug: 'community-charity-run-2026',
    name: 'Community Charity Run 2026',
    description: 'Annual charity running event to raise funds for local education initiatives. Join us to run for a good cause and earn positive movement points.',
    content: "Annual charity running event to raise funds for local education initiatives. Join us to run for a good cause and earn positive movement points.\n\nThe route is 5km around Sala Park. Water stations and custom physical badges will be provided to all checked-in participants. Register and run for local kids!",
    datetime: '2026-08-05T06:00',
    locationType: 'In-person',
    location: 'Sala Park, District 2, HCMC',
    points: 5,
    capacity: 500,
    registered: 380,
    tags: ['Charity', 'Social', 'Health'],
    category: 'Social',
    theme: 'Nature',
    visibility: 'Public',
    coverImage: 'https://picsum.photos/seed/evt-105/800/400',
    chapterId: 'org-004'
  }
];

export const initialRegistrations = [
  // Event 101
  {
    id: 'REG-001',
    eventId: '101',
    studentName: 'Alex Mercer',
    ocid: 'alex.edu',
    ethAddress: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
    mssv: 'IT202201',
    checkedIn: true,
    checkedInAt: '2026-07-10T14:15'
  },
  {
    id: 'REG-002',
    eventId: '101',
    studentName: 'Sarah Connor',
    ocid: 'sarah.edu',
    ethAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mssv: 'IT202202',
    checkedIn: true,
    checkedInAt: '2026-07-10T14:05'
  },
  {
    id: 'REG-003',
    eventId: '101',
    studentName: 'Bruce Wayne',
    ocid: 'bruce.edu',
    ethAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    mssv: 'IT202203',
    checkedIn: false,
    checkedInAt: null
  },
  // Event 102
  {
    id: 'REG-004',
    eventId: '102',
    studentName: 'Alex Mercer',
    ocid: 'alex.edu',
    ethAddress: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
    mssv: 'IT202201',
    checkedIn: true,
    checkedInAt: '2026-07-15T09:10'
  },
  {
    id: 'REG-005',
    eventId: '102',
    studentName: 'Diana Prince',
    ocid: 'diana.edu',
    ethAddress: '0x9965507B1a0595C5411B43b3334d754b2d35C3E5',
    mssv: 'IT202204',
    checkedIn: false,
    checkedInAt: null
  }
];

export const initialAchievements = [
  {
    id: 'ACH-001',
    studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
    ocid: 'alex.edu',
    eventName: 'HCMC AI Meetup 2026',
    eventId: '101',
    points: 5,
    earnedAt: '2026-07-10T14:15',
    txHash: '0x7f14e9a38f32145b20a1081512bb673e4d9c72e1',
    badgeImage: 'https://picsum.photos/seed/badge-101/150/150'
  },
  {
    id: 'ACH-002',
    studentWallet: '0x326C977E6e1C8116C92fD9CDE32A44B04C0dBbB6',
    ocid: 'alex.edu',
    eventName: 'Solidity Smart Contract Workshop',
    eventId: '102',
    points: 3,
    earnedAt: '2026-07-15T09:10',
    txHash: '0x8c71e3cf5a2a1975e533c3a4439c2d1b73c4f9a2',
    badgeImage: 'https://picsum.photos/seed/badge-102/150/150'
  },
  {
    id: 'ACH-003',
    studentWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    ocid: 'sarah.edu',
    eventName: 'HCMC AI Meetup 2026',
    eventId: '101',
    points: 5,
    earnedAt: '2026-07-10T14:05',
    txHash: '0xa4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5',
    badgeImage: 'https://picsum.photos/seed/badge-101/150/150'
  }
];

export const DEMO_ACCOUNTS = {
  student: {
    mssv: 'DEMO-STU-001',
    fullName: 'Alex Mercer',
    ocid: 'alex.edu', // Matches OCID used in PublicProfile
    role: 'student',
  },
  organizer: {
    mssv: 'DEMO-ORG-001',
    fullName: 'FIT Chapter Admin',
    ocid: 'fit.opencampus.edu', // Matches OCID of Chapter 'fit'
    role: 'organizer',
    chapterId: 'org-001', // Targets 'IT Department'
  },
};

