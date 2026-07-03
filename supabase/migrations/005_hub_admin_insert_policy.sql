-- Enforce that only hub_admin (or mnipl_admin) can register new hubs.
--
-- Background: previously the insert RLS policy only required owner_id = auth.uid(),
-- which meant any authenticated user (default role = 'resident') could flood the
-- review queue with submissions. This migration adds a role gate at the DB level
-- so the check cannot be bypassed regardless of client-side UI.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- 1. Helper: returns true when the calling user is a hub_admin or mnipl_admin
create or replace function is_hub_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('hub_admin', 'mnipl_admin')
  );
$$;

-- 2. Replace the insert policy to require hub_admin role
drop policy if exists "hubs: owner insert" on hubs;

create policy "hubs: owner insert"
  on hubs for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and verified = false
    and is_hub_admin()
  );
