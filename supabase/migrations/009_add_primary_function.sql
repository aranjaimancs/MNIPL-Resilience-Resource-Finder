-- Adds an optional hub-admin-chosen primary function that overrides the
-- automatic PIN_PRIORITY ordering when setting the map marker color.
-- Run in Supabase Dashboard → SQL Editor → New query.

alter table hubs
  add column if not exists primary_function text default null;
