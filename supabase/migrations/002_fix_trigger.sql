-- Fix: safer handle_new_user trigger
-- Run this in Supabase SQL Editor if signup returns "Database error saving new user"

create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    return new;  -- never block user creation
end; $$;
