-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.tasks (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  bigint not null,
  deleted     boolean not null default false
);

create index if not exists tasks_user_idx on public.tasks(user_id);

alter table public.tasks enable row level security;

-- Each person can only see and change their own rows.
create policy "read own tasks"   on public.tasks for select using (user_id = auth.uid());
create policy "insert own tasks" on public.tasks for insert with check (user_id = auth.uid());
create policy "update own tasks" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own tasks" on public.tasks for delete using (user_id = auth.uid());

-- Live updates between devices.
alter publication supabase_realtime add table public.tasks;
