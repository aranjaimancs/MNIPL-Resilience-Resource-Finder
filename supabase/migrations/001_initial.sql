-- Enable UUID extension (already available in Supabase)
-- profiles: one per auth user, carries the role
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'resident'  -- 'resident' | 'hub_admin' | 'mnipl_admin'
);

create table if not exists hubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete set null,
  name text not null,
  faith text,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  functions text[] not null default '{}',
  status text not null default 'open',
  verified boolean not null default false,
  hours text,
  phone text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- auto-create a profile when a user signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- helper for admin checks
create or replace function is_mnipl_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'mnipl_admin'
  );
$$;

-- approve_hub RPC — only mnipl_admin can call this effectively
create or replace function approve_hub(hub_id uuid) returns void
language plpgsql security definer as $$
begin
  if not is_mnipl_admin() then
    raise exception 'Unauthorized: only mnipl_admin may approve hubs';
  end if;
  update hubs set verified = true, updated_at = now() where id = hub_id;
end; $$;

-- ===================== ROW LEVEL SECURITY =====================

alter table profiles enable row level security;
alter table hubs enable row level security;

-- profiles: users can read/update their own profile
create policy "profiles: own read"
  on profiles for select using (auth.uid() = id);

create policy "profiles: own update"
  on profiles for update using (auth.uid() = id);

-- hubs: public (anon) can read verified hubs only
create policy "hubs: public read verified"
  on hubs for select
  to anon
  using (verified = true);

-- hubs: authenticated users can read verified hubs
create policy "hubs: authenticated read verified"
  on hubs for select
  to authenticated
  using (verified = true);

-- hubs: owners can also read their own unverified hubs
create policy "hubs: owner read own"
  on hubs for select
  to authenticated
  using (owner_id = auth.uid());

-- hubs: owners can insert their own hubs (verified must be false)
create policy "hubs: owner insert"
  on hubs for insert
  to authenticated
  with check (owner_id = auth.uid() and verified = false);

-- hubs: owners can update their own hubs, but NOT flip verified
create policy "hubs: owner update"
  on hubs for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and verified = false);

-- mnipl_admin: full access via service role / RPC only
-- (approve_hub is SECURITY DEFINER, so it bypasses RLS for the update)

-- ===================== SEED DATA =====================

insert into hubs (name, faith, neighborhood, address, lat, lng, functions, status, verified, hours, phone, note)
values
  (
    'Walker Community UMC',
    'United Methodist',
    'Uptown / Wedge',
    '3104 16th Ave S, Minneapolis, MN 55407',
    44.9464, -93.2614,
    array['warming','charging','rest'],
    'open', true,
    '7am – 9pm',
    '(612) 555-0142',
    'Generator-backed. Pet-friendly main hall.'
  ),
  (
    'Bethany Lutheran',
    'Lutheran (ELCA)',
    'Powderhorn',
    '2511 E 22nd St, Minneapolis, MN 55406',
    44.9395, -93.2397,
    array['food','rest','charging'],
    'open', true,
    '8am – 8pm',
    '(612) 555-0188',
    'Hot meals at noon and 6pm.'
  ),
  (
    'Plymouth Congregational',
    'UCC',
    'Loring Park',
    '1900 Nicollet Ave, Minneapolis, MN 55403',
    44.9674, -93.2844,
    array['cooling','cleanair','charging'],
    'limited', true,
    '9am – 6pm',
    '(612) 555-0210',
    'HEPA-filtered sanctuary; ~40 seats left.'
  ),
  (
    'Masjid An-Nur',
    'Islamic Center',
    'North Minneapolis',
    '1729 Lyndale Ave N, Minneapolis, MN 55411',
    44.9938, -93.2960,
    array['food','warming'],
    'open', true,
    'Open 24h during alerts',
    '(612) 555-0173',
    'Halal meals. Women''s & family room available.'
  ),
  (
    'St. Mark''s Cathedral',
    'Episcopal',
    'Lowry Hill',
    '519 Oak Grove St, Minneapolis, MN 55403',
    44.9707, -93.2882,
    array['beds','warming','food'],
    'full', true,
    'Overnight 7pm – 8am',
    '(612) 555-0155',
    '20 overnight cots — currently full.'
  ),
  (
    'First Universalist',
    'Unitarian Universalist',
    'Kingfield',
    '3400 Dupont Ave S, Minneapolis, MN 55408',
    44.9296, -93.2982,
    array['cleanair','cooling','charging'],
    'open', true,
    '9am – 7pm',
    '(612) 555-0199',
    'Air-filtered hall; quiet space for elders.'
  ),
  (
    'Sabathani Community Center',
    'Community (interfaith)',
    'Central',
    '310 E 38th St, Minneapolis, MN 55409',
    44.9231, -93.2561,
    array['food','charging','rest'],
    'closed', true,
    'Daytime only',
    '(612) 555-0166',
    'Reopens 8am. Large capacity.'
  );
