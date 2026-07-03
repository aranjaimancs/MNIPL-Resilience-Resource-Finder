-- Add congregation profile Q&A fields to hubs.
-- These are filled in by hub admins and visible to residents via the "Learn more" panel.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

alter table hubs
  add column if not exists about         text default null,
  add column if not exists experience    text default null,
  add column if not exists languages     text default null,
  add column if not exists accessibility text default null;

-- Allow MNIPL admins to update any hub directly
-- (e.g. curating profile content before or after approval).
-- The guard_verified_field trigger still enforces that only the
-- approve_hub() RPC can flip verified = true.
create policy "hubs: mnipl_admin update"
  on hubs for update
  to authenticated
  using  (is_mnipl_admin())
  with check (is_mnipl_admin());
