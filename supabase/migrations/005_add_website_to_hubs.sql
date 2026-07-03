-- Add website URL field to hubs
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

alter table hubs
  add column if not exists website text default null;
