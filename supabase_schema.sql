-- SQL Schema for EcoREALM Migration to Supabase

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  email text not null unique,
  avatar text default '',
  level integer default 1,
  xp integer default 0,
  eco_points integer default 100, -- Maps to coins
  carbon_score numeric default 16.0,
  guardian_rank text default 'Seed Guardian',
  role text default 'user',
  
  -- Game state additions
  carbon_offset numeric default 0,
  water_saved numeric default 0,
  energy_conserved numeric default 0,
  net_zero_unlocked boolean default false,
  custom_title_bought boolean default false,
  scan_completed boolean default false,
  island jsonb default '{"trees": 1, "flowers": 1, "waterCleanliness": 25, "meadowGreenness": 25, "solarPanels": 0, "windTurbines": 0}'::jsonb,
  history jsonb default '[]'::jsonb,
  coach_history jsonb default '[]'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- 2. ASSESSMENTS Table
create table if not exists public.assessments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  transportation numeric default 0,
  food numeric default 0,
  energy numeric default 0,
  waste numeric default 0,
  water numeric default 0,
  shopping numeric default 0,
  carbon_score numeric default 0,
  
  -- Carbon assessment extensions
  period text default '',
  notes text default '',
  compared_to_average numeric default 0,
  improvement_areas text[] default '{}'::text[],
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assessments enable row level security;

-- 3. MISSIONS Table
create table if not exists public.missions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  xp_reward integer default 50,
  eco_points_reward integer default 25,
  difficulty text default 'easy',
  
  -- Additional fields matching model
  category text default 'general',
  carbon_impact numeric default 0,
  water_impact numeric default 0,
  energy_impact numeric default 0,
  icon text default '🌱',
  is_daily boolean default true,
  is_recurring boolean default true,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.missions enable row level security;

-- 4. USER_MISSIONS Table
create table if not exists public.user_missions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  mission_id uuid references public.missions(id) on delete cascade not null,
  status text default 'completed',
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_missions enable row level security;

-- 5. BADGES Table
create table if not exists public.badges (
  id text primary key, -- Text string key e.g., 'recycling_hero'
  badge_name text not null,
  badge_image text default '',
  description text not null
);

alter table public.badges enable row level security;

-- 6. USER_BADGES Table
create table if not exists public.user_badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text references public.badges(id) on delete cascade not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_badges enable row level security;

-- 7. REWARDS Table
create table if not exists public.rewards (
  id uuid default gen_random_uuid() primary key,
  reward_name text not null,
  reward_type text not null
);

alter table public.rewards enable row level security;

-- 8. LEADERBOARD Table
create table if not exists public.leaderboard (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  eco_points integer default 0,
  xp integer default 0
);

alter table public.leaderboard enable row level security;

-- 9. COMMUNITY_POSTS Table
create table if not exists public.community_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text default 'general',
  likes uuid[] default '{}'::uuid[],
  comments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.community_posts enable row level security;

-- 10. WORLD_REGIONS Table
create table if not exists public.world_regions (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  category text not null,
  color text not null,
  position jsonb not null,
  is_locked boolean default false,
  unlock_cost integer default 0,
  trees_planted integer default 0,
  carbon_reduced numeric default 0,
  waste_recycled numeric default 0,
  water_saved numeric default 0,
  restoration_percent numeric default 0,
  contributors uuid[] default '{}'::uuid[]
);

alter table public.world_regions enable row level security;

-- 11. NOTIFICATIONS Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient uuid references public.profiles(id) on delete cascade not null,
  sender uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;


-- ================= ROW LEVEL SECURITY POLICIES =================

-- Profiles policies
create policy "Users can read their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Enable insert for signup trigger" on public.profiles
  for insert with check (true);

-- Assessments policies
create policy "Users can view their own assessments" on public.assessments
  for select using (auth.uid() = user_id);

create policy "Users can insert their own assessments" on public.assessments
  for insert with check (auth.uid() = user_id);

-- Missions policies
create policy "Missions are viewable by everyone" on public.missions
  for select using (true);

-- User Missions policies
create policy "Users can view their completed missions" on public.user_missions
  for select using (auth.uid() = user_id);

create policy "Users can log completed missions" on public.user_missions
  for insert with check (auth.uid() = user_id);

-- Badges policies
create policy "Badges are viewable by everyone" on public.badges
  for select using (true);

-- User Badges policies
create policy "Users can view their own badges" on public.user_badges
  for select using (auth.uid() = user_id);

create policy "Users can earn badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- Leaderboard policies
create policy "Leaderboard is viewable by everyone" on public.leaderboard
  for select using (true);

-- Community Posts policies
create policy "Community posts are viewable by everyone" on public.community_posts
  for select using (true);

create policy "Authenticated users can create community posts" on public.community_posts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own community posts" on public.community_posts
  for update using (auth.uid() = user_id);

-- World Regions policies
create policy "World regions are viewable by everyone" on public.world_regions
  for select using (true);

create policy "Authenticated users can contribute to world regions" on public.world_regions
  for update using (true);

-- Notifications policies
create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = recipient);

create policy "Users can update their own notifications" on public.notifications
  for update using (auth.uid() = recipient);

create policy "Users can delete their own notifications" on public.notifications
  for delete using (auth.uid() = recipient);


-- ================= AUTOMATIC PROFILE INSERTION TRIGGER =================

-- Create a trigger that inserts a row into public.profiles on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, avatar, level, xp, eco_points, carbon_score, guardian_rank, island, history)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Commander Eco'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar', ''),
    1,
    0,
    100,
    16.0,
    'Seed Guardian',
    '{"trees": 1, "flowers": 1, "waterCleanliness": 25, "meadowGreenness": 25, "solarPanels": 0, "windTurbines": 0}'::jsonb,
    '[]'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ================= SEEDING DATA FOR MISSIONS AND BADGES =================

-- Seed Missions
insert into public.missions (title, description, category, difficulty, xp_reward, eco_points_reward, carbon_impact, water_impact, energy_impact, icon, is_daily, is_recurring)
values
  ('Commute Green', 'Walk, cycle, or use public transit instead of driving.', 'transportation', 'easy', 50, 25, 3.5, 0, 0.8, '🚲', true, true),
  ('Meatless Day', 'Eat only plant-based meals for an entire day.', 'food', 'easy', 40, 20, 2.5, 150, 0, '🥦', true, true),
  ('Zero Waste Actions', 'Use only reusable bags, bottles, and containers today.', 'waste', 'easy', 30, 15, 1.2, 20, 0, '♻️', true, true),
  ('Unplug Idle Electronics', 'Unplug all devices not in use before sleeping.', 'energy', 'easy', 25, 12, 0.8, 0, 1.5, '⚡', true, true),
  ('Plant a Seedling', 'Plant a seedling or tend to your garden today.', 'general', 'medium', 60, 30, 4.0, 10, 0, '🌱', true, true),
  ('Sort & Recycle', 'Sort all your household waste and recycle properly.', 'waste', 'easy', 20, 10, 1.0, 5, 0, '🗑️', true, true),
  ('Cold Water Wash', 'Wash your clothes in cold water only.', 'energy', 'easy', 20, 10, 0, 0, 2.0, '🧺', false, true),
  ('Short Shower Challenge', 'Limit your shower to under 4 minutes.', 'water', 'easy', 25, 12, 0, 60, 0, '🚿', true, true),
  ('No Single-Use Plastic', 'Go an entire day without using any single-use plastic.', 'waste', 'medium', 50, 25, 1.5, 0, 0, '🌊', true, true),
  ('Switch to LED', 'Replace at least one incandescent bulb with an LED.', 'energy', 'easy', 35, 18, 0, 0, 5.0, '💡', false, false)
on conflict do nothing;

-- Seed Badges
insert into public.badges (id, badge_name, badge_image, description)
values
  ('recycling-hero', 'Recycling Hero', '♻️', 'Unlock: Sort & Recycle waste 3 times'),
  ('water-warrior', 'Water Warrior', '💧', 'Unlock: Save > 100L of water'),
  ('energy-saver', 'Energy Saver', '⚡', 'Unlock: Save > 15 kWh of energy'),
  ('green-traveler', 'Green Traveler', '🚲', 'Unlock: Log Commute Green 5 times'),
  ('tree-guardian', 'Tree Guardian', '🌳', 'Unlock: Deployed simulator trees >= 3'),
  ('ocean-protector', 'Ocean Protector', '🌊', 'Unlock: Earn coins from Ocean Cleanup game'),
  ('wildlife-defender', 'Wildlife Defender', '🦋', 'Unlock: Deployed Wildlife sanctuary upgrades'),
  ('climate-champion', 'Climate Champion', '🏆', 'Unlock: Carbon Offset >= 20 kg'),
  ('sustainability-master', 'Sustainability Master', '🌍', 'Unlock: Completed Carbon scanner wizard with score < 6.0'),
  ('planet-savior', 'Planet Savior', '🌟', 'Unlock: Reach Command level 50')
on conflict do nothing;


-- Seed World Regions
insert into public.world_regions (id, name, description, icon, category, color, position, is_locked, unlock_cost, restoration_percent)
values
  ('industrial', 'Industrial Zone', 'A smog-heavy district converting to clean energy.', '🏭', 'industrial', '#f59e0b', '{"x": 15, "y": 60}'::jsonb, false, 0, 18.0),
  ('forest', 'Forest Zone', 'Ancient woodland being revitalized by Guardians.', '🌲', 'forest', '#22c55e', '{"x": 35, "y": 30}'::jsonb, false, 0, 42.0),
  ('ocean', 'Ocean Cleanup Coast', 'Coastal cleanup mission removing marine debris.', '🌊', 'ocean', '#0ea5e9', '{"x": 60, "y": 70}'::jsonb, false, 0, 30.0),
  ('wildlife', 'Wildlife Sanctuary', 'Protected habitat for endangered species.', '🦋', 'wildlife', '#a855f7', '{"x": 75, "y": 35}'::jsonb, false, 0, 75.0),
  ('energy', 'Green Energy Zone', 'Solar and wind farms powering the new world.', '⚡', 'energy', '#00ff88', '{"x": 50, "y": 15}'::jsonb, false, 0, 68.0),
  ('netzero', 'Net-Zero Future Hub', 'The pinnacle of restoration — a carbon-neutral utopia.', '🌟', 'netzero', '#00d4ff', '{"x": 85, "y": 20}'::jsonb, true, 150, 5.0)
on conflict (id) do nothing;


-- 12. CHALLENGES Table
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null unique,
  description text not null,
  type text default 'individual',
  category text default 'general',
  difficulty text default 'medium',
  xp_reward integer default 200,
  coin_reward integer default 100,
  badge_reward text default null,
  goal numeric not null,
  unit text default 'actions',
  icon text default '🏆',
  start_date timestamp with time zone default timezone('utc'::text, now()),
  end_date timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.challenges enable row level security;

-- 13. USER_CHALLENGES Table
create table if not exists public.user_challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  progress numeric default 0 not null,
  completed_at timestamp with time zone,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, challenge_id)
);

alter table public.user_challenges enable row level security;


-- ================= CHALLENGES POLICIES =================

create policy "Challenges are viewable by everyone" on public.challenges
  for select using (true);

create policy "Users can view their own challenges" on public.user_challenges
  for select using (auth.uid() = user_id);

create policy "Users can join challenges" on public.user_challenges
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own challenge progress" on public.user_challenges
  for update using (auth.uid() = user_id);


-- ================= SEEDING CHALLENGES =================

insert into public.challenges (title, description, type, category, difficulty, xp_reward, coin_reward, badge_reward, goal, unit, icon)
values
  ('Plastic Free Challenge', 'Go 30 days without using any single-use plastic.', 'individual', 'waste', 'hard', 500, 250, 'ocean_protector', 30, 'days', '🌊'),
  ('Zero Waste Week', 'Produce zero landfill waste for 7 consecutive days.', 'individual', 'waste', 'hard', 350, 175, null, 7, 'days', '♻️'),
  ('Energy Saver Challenge', 'Reduce electricity usage by 20% for a month.', 'individual', 'energy', 'medium', 300, 150, 'energy_saver', 30, 'days', '⚡'),
  ('Green Mobility Month', 'Use only zero-emission transport for 30 days.', 'individual', 'transportation', 'hard', 450, 225, 'green_traveler', 30, 'days', '🚲'),
  ('Community Tree Drive', 'As a community, plant 1,000 trees this month.', 'community', 'general', 'legendary', 800, 400, 'tree_guardian', 1000, 'trees', '🌳'),
  ('Meatless Month', 'Eat plant-based for 30 consecutive days.', 'individual', 'food', 'hard', 400, 200, null, 30, 'days', '🥦')
on conflict (title) do nothing;


-- ================= REALTIME ENABLEMENT =================

-- Enable realtime for community_posts, leaderboard, world_regions, and notifications
begin;
  -- Remove existing subscription publications if they exist
  drop publication if exists supabase_realtime;
  
  -- Create new publication for realtime tables
  create publication supabase_realtime for table public.community_posts, public.leaderboard, public.profiles, public.user_missions, public.world_regions, public.notifications, public.challenges, public.user_challenges;
commit;

