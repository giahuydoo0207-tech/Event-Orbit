export const CHAPTERS = [
  { 
    id: 'ab5a59cc-bfb2-43dc-af19-faaa79b732cd',
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
    id: 'arts',
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
    id: 'hub',
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
    id: 'youth',
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
};
