// Helper functions to map between Database schema (snake_case) and Frontend models (camelCase)

// 1. Chapters
export function mapChapterDbToClient(db) {
  if (!db) return null;
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    ocid: db.ocid,
    description: db.description,
    category: db.category,
    avatarGradient: db.avatar_gradient,
    followerCount: db.follower_count,
    createdAt: db.created_at
  };
}

export function mapChapterClientToDb(client) {
  if (!client) return null;
  return {
    slug: client.slug,
    name: client.name,
    ocid: client.ocid,
    description: client.description,
    category: client.category,
    avatar_gradient: client.avatarGradient,
    follower_count: client.followerCount || 0
  };
}

// 2. Events
export function mapEventDbToClient(db) {
  if (!db) return null;
  return {
    id: db.id,
    slug: db.slug,
    chapterId: db.chapter_id,
    name: db.name,
    description: db.description,
    content: db.content,
    datetime: db.datetime,
    locationType: db.location_type,
    location: db.location,
    points: db.points,
    capacity: db.capacity,
    tags: db.tags || [],
    category: db.category,
    theme: db.theme,
    visibility: db.visibility,
    coverImage: db.cover_image,
    createdAt: db.created_at,
    // Optional relation join
    chapter: db.chapters ? mapChapterDbToClient(db.chapters) : undefined
  };
}

export function mapEventClientToDb(client) {
  if (!client) return null;
  return {
    slug: client.slug,
    chapter_id: client.chapterId,
    name: client.name,
    description: client.description,
    content: client.content,
    datetime: client.datetime,
    location_type: client.locationType || 'In-person',
    location: client.location,
    points: client.points || 5,
    capacity: client.capacity,
    tags: client.tags || [],
    category: client.category,
    theme: client.theme || 'Minimal',
    visibility: client.visibility || 'Public',
    cover_image: client.coverImage
  };
}

// 3. Registrations
export function mapRegistrationDbToClient(db) {
  if (!db) return null;
  return {
    id: db.id,
    eventId: db.event_id,
    userId: db.user_id,
    registeredAt: db.registered_at,
    // Add student details from session if available, or populate checkedIn
    checkedIn: db.checkedIn || false,
    checkedInAt: db.checkedInAt || null,
    studentName: db.studentName || 'Anonymous Student',
    ocid: db.ocid || null,
    mssv: db.mssv || null,
    ethAddress: db.ethAddress || null
  };
}

// 4. Achievements
export function mapAchievementDbToClient(db) {
  if (!db) return null;
  return {
    id: db.id,
    eventId: db.event_id,
    userId: db.user_id,
    ocid: db.ocid,
    credentialId: db.credential_id,
    points: db.points,
    txHash: db.tx_hash,
    tokenId: db.token_id,
    mintStatus: db.mint_status,
    mintError: db.mint_error,
    checkedInAt: db.checked_in_at,
    mintedAt: db.minted_at,
    // Frontend compatibility fields
    studentWallet: db.ethAddress || db.studentWallet || null,
    eventName: db.eventName || (db.events ? db.events.name : 'Verified Event Attendance'),
    badgeImage: db.badgeImage || `https://picsum.photos/seed/badge-${db.event_id}/150/150`
  };
}
