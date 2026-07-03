-- User management RPCs for mnipl_admin
--
-- Gives MNIPL admins the ability to view all users and change their roles
-- from the in-app Users panel — no Supabase dashboard access required.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- 1. List all users with their email, name, and role.
--    Joins auth.users (for email/created_at) with public.profiles (for role/name).
--    Security definer so it can read auth.users; unauthorized callers are rejected.
create or replace function admin_list_users()
returns table(id uuid, email text, full_name text, role text, created_at timestamptz)
language plpgsql security definer stable as $$
begin
  if not is_mnipl_admin() then
    raise exception 'Unauthorized: only mnipl_admin may list users';
  end if;
  return query
    select
      p.id,
      u.email::text,
      p.full_name,
      p.role,
      u.created_at
    from profiles p
    join auth.users u on u.id = p.id
    order by u.created_at desc;
end; $$;

-- 2. Set a user's role. Guards:
--    - Caller must be mnipl_admin
--    - Role must be one of the three valid values
--    - Admin cannot change their own role (prevents accidental self-lockout)
create or replace function admin_set_role(target_id uuid, new_role text)
returns void
language plpgsql security definer as $$
begin
  if not is_mnipl_admin() then
    raise exception 'Unauthorized: only mnipl_admin may change roles';
  end if;
  if new_role not in ('resident', 'hub_admin', 'mnipl_admin') then
    raise exception 'Invalid role — must be resident, hub_admin, or mnipl_admin';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  update profiles set role = new_role where id = target_id;
end; $$;
