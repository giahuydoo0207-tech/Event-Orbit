-- 1. Bảng Chapters
create table chapters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  ocid text unique not null,
  description text,
  category text,
  avatar_gradient text,
  follower_count int default 0,
  created_at timestamptz default now()
);

-- 2. Bảng Events
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  chapter_id uuid references chapters(id) not null,
  name text not null,
  description text,
  content text,
  datetime timestamptz not null,
  location_type text default 'In-person',
  location text,
  points int default 5,
  capacity int not null,
  tags text[] default '{}',
  category text,
  theme text default 'Minimal',
  visibility text default 'Public',
  cover_image text,
  created_at timestamptz default now()
);

-- 3. Bảng Registrations
create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  user_id text not null,
  student_name text,
  ocid text,
  mssv text,
  eth_address text,
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

-- 4. Bảng Achievements (Badges / Check-in)
create table achievements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) not null,
  user_id text not null,
  ocid text,
  credential_id text,
  points int,
  tx_hash text,
  token_id text,
  mint_status text default 'pending', -- pending | minting | success | failed
  mint_error text,
  checked_in_at timestamptz default now(),
  minted_at timestamptz,
  unique(event_id, user_id)
);

-- 5. Bảng Chapter Follows
create table chapter_follows (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) not null,
  user_id text not null,
  followed_at timestamptz default now(),
  unique(chapter_id, user_id)
);

-- 6. Bảng Sessions (Quản lý phiên đăng nhập, hỗ trợ lưu eth_address để relayer mint SBT)
create table sessions (
  token text primary key,
  user_id text not null,
  role text not null, -- 'student' | 'organizer'
  chapter_id uuid references chapters(id),
  ocid text,
  mssv text,
  full_name text,
  eth_address text, -- Lưu ví của sinh viên để mint SBT trực tiếp
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- 7. Bảng QR Nonces (Ngăn chặn replay attack khi check-in)
create table qr_nonces (
  nonce text primary key,
  event_id uuid references events(id) not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- Kích hoạt Row Level Security (RLS)
alter table events enable row level security;
alter table chapters enable row level security;
alter table registrations enable row level security;
alter table achievements enable row level security;
alter table chapter_follows enable row level security;

-- Thêm quyền select công khai cho Events và Chapters
create policy "Public read events" on events for select using (true);
create policy "Public read chapters" on chapters for select using (true);
