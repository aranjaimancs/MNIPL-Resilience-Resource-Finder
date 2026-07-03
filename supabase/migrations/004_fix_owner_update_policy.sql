-- Fix: hub owners could not update status on verified hubs
--
-- Root cause: the WITH CHECK on "hubs: owner update" required verified = false,
-- which blocked all updates once a hub was approved (verified = true).
--
-- Solution:
--   1. Relax the RLS policy so owners can update any of their hubs (verified or not).
--   2. Add a BEFORE UPDATE trigger to block any attempt to change the verified field
--      by a non-mnipl_admin, preserving the original security intent.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- 1. Replace the overly-restrictive update policy
drop policy if exists "hubs: owner update" on hubs;

create policy "hubs: owner update"
  on hubs for update
  to authenticated
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 2. Guard the verified field so owners still cannot self-approve
create or replace function prevent_verified_flip()
  returns trigger language plpgsql security definer as $$
begin
  if new.verified != old.verified and not is_mnipl_admin() then
    raise exception 'Unauthorized: only mnipl_admin can change the verified field';
  end if;
  return new;
end; $$;

drop trigger if exists guard_verified_field on hubs;
create trigger guard_verified_field
  before update on hubs
  for each row execute function prevent_verified_flip();

-- 3. Allow hub owners to delete their own hubs
create policy "hubs: owner delete"
  on hubs for delete
  to authenticated
  using (owner_id = auth.uid());
