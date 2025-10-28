# Family Task Planner (Vanilla JS + Supabase)

Minimal, dynamic task planner for families. Create members and tasks with timelines, assign tasks, and edit/delete inline.

## 1) Setup Supabase

1. Open Supabase SQL editor and run `supabase.sql` from this repo.
2. Ensure your project's URL and anon key match those hardcoded in `app.js`.
3. This demo enables permissive RLS policies for `anon` to allow CRUD. For production, replace them with authenticated policies.

## 2) Run Locally

Open `index.html` in a browser. No build tools needed.

## 3) Tables

- `family_users`: members (id, name, email, created_at)
- `tasks`: tasks (id, title, description, status, start_date, due_date, assigned_user_id, created_at)

## 4) Features

- Add/edit/delete members
- Add/edit/delete tasks
- Assign tasks to members
- Status, start and due dates
- Filter tasks by member and status


