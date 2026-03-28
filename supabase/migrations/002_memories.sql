-- Memories table — stores Cody's markdown memory files
create table if not exists memories (
  id uuid default gen_random_uuid() primary key,
  agent text not null default 'cody',
  file_path text not null,
  title text not null,
  content text not null,
  category text default 'general', -- 'daily', 'topic', 'lesson', 'lead-list'
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(agent, file_path)
);
alter table memories enable row level security;
create policy "Public read" on memories for select using (true);
create policy "Public insert" on memories for insert with check (true);
create policy "Public update" on memories for update using (true);
create policy "Public upsert" on memories for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table memories;
