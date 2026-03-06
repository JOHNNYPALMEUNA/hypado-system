
-- Create Tasks Table if it doesn't exist
create table if not exists tasks (
  id text primary key,
  title text not null,
  "projectId" text,
  "workName" text,
  done boolean default false,
  "dueDate" text,
  priority text
);

-- Create Events Table if it doesn't exist
create table if not exists events (
  id text primary key,
  title text not null,
  start text not null,
  "end" text not null,
  type text,
  "projectId" text,
  description text,
  location text
);

-- Enable RLS (this might error if already enabled, but usually idempotent in newer postgres or ignored)
alter table tasks enable row level security;
alter table events enable row level security;

-- Create Policies (Drop first to avoid duplication errors)
drop policy if exists "Allow all operations for tasks" on tasks;
create policy "Allow all operations for tasks" on tasks for all to public using (true) with check (true);

drop policy if exists "Allow all operations for events" on events;
create policy "Allow all operations for events" on events for all to public using (true) with check (true);
