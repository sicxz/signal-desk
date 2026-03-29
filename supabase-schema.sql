-- Projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  api_key uuid default gen_random_uuid() not null unique,
  created_at timestamptz default now() not null
);

-- Events table
create table events (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  channel text not null,
  title text not null,
  description text,
  icon text,
  tags text[] default '{}',
  created_at timestamptz default now() not null
);

-- Indexes
create index events_project_id_idx on events(project_id);
create index events_channel_idx on events(channel);
create index events_created_at_idx on events(created_at desc);

-- Enable RLS
alter table projects enable row level security;
alter table events enable row level security;

-- Allow read access to events via anon key (for dashboard)
create policy "Allow public read access to events"
  on events for select
  using (true);

-- Allow service role full access (for API ingestion)
create policy "Allow service role insert events"
  on events for insert
  with check (true);

-- Allow read access to projects for service role
create policy "Allow public read access to projects"
  on projects for select
  using (true);

-- Enable Realtime on events table
alter publication supabase_realtime add table events;

-- Seed a default project
insert into projects (name) values ('Default Project');

-- ============================================================
-- Migration: Sources & enriched events
-- ============================================================

-- Sources table
create table sources (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  type text not null check (type in ('rss', 'api', 'email')),
  tag text not null,
  active boolean default true not null,
  created_at timestamptz default now() not null
);

-- Add new columns to events
alter table events add column source_id uuid references sources(id) on delete set null;
alter table events add column summary text;
alter table events add column original_url text;
alter table events add column content_hash text unique;

-- Index for deduplication lookups
create index events_content_hash_idx on events(content_hash);

-- RLS for sources
alter table sources enable row level security;

create policy "Allow public read access to sources"
  on sources for select
  using (true);

create policy "Allow service role full access to sources"
  on sources for all
  using (true);

-- Existing projects can run this block to allow email-based newsletter sources.
alter table sources drop constraint if exists sources_type_check;
alter table sources
  add constraint sources_type_check
  check (type in ('rss', 'api', 'email'));

-- Add topic column to events (AI-extracted during ingestion)
alter table events add column topic text;

-- Editorial section, speculation score, and promoted flag
alter table events add column section text;
alter table events add column speculation_score integer;
alter table events add column is_promoted boolean default false;

-- Structured editorial fields and article image
alter table events add column big_deal text;
alter table events add column catch text;
alter table events add column why_care text;
alter table events add column image_url text;

-- Seed default sources (existing + 8 new newsletter/site sources)
insert into sources (name, url, type, tag) values
  ('Dev.to AI', 'https://dev.to/api/articles?per_page=20&tag=ai', 'api', 'ai'),
  ('HackerNoon AI', 'https://hackernoon.com/tagged/ai/feed', 'rss', 'ai'),
  ('404 Media', 'https://www.404media.co/rss/', 'rss', 'tech'),
  ('Critical Playground', 'https://criticalplayground.org/latest/rss/', 'rss', 'tech'),
  ('The Curiosity Department', 'https://thecuriositydepartment.substack.com/feed', 'rss', 'design'),
  ('Bytes (Fireship)', 'https://bytes-rss.onrender.com/feed', 'rss', 'ai'),
  ('The Batch (DeepLearning.AI)', 'https://www.deeplearning.ai/the-batch/feed', 'rss', 'ai'),
  ('Ben''s Bites', 'https://bensbites.substack.com/feed', 'rss', 'ai'),
  ('Future Tools', 'https://futuretools.beehiiv.com/feed', 'rss', 'ai'),
  ('The Neuron Daily', 'https://rss.beehiiv.com/feeds/N4eCstxvgX.xml', 'rss', 'ai');
