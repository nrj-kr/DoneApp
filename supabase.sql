-- Schema for Family Task Planner
-- Run this in your Supabase SQL editor

-- 1) Tables
create table if not exists public.family_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  start_date date,
  due_date date,
  assigned_user_id uuid references public.family_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_tasks_assignee on public.tasks(assigned_user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due on public.tasks(due_date);

-- 2) Enable RLS
alter table public.family_users enable row level security;
alter table public.tasks enable row level security;

-- 3) Open policies for demo (anon CRUD). For production, tighten these.
do $$ begin
  create policy "anon_select_users" on public.family_users for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon_modify_users" on public.family_users for all to anon using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon_select_tasks" on public.tasks for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anon_modify_tasks" on public.tasks for all to anon using (true) with check (true);
exception when duplicate_object then null; end $$;

-- 4) Simple view for joining (optional). Not required by app, but handy.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'v_tasks' and c.relkind = 'm'
  ) then
    execute 'drop materialized view public.v_tasks';
  elsif exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'v_tasks' and c.relkind = 'v'
  ) then
    execute 'drop view public.v_tasks';
  end if;
end $$;

create view public.v_tasks as
select t.*, u.name as assignee_name
from public.tasks t
left join public.family_users u on u.id = t.assigned_user_id;


