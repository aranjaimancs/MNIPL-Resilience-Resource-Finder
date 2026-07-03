-- Stores the congregation profile questions shown in the hub admin form.
-- MNIPL admins can edit question text and placeholders from the admin UI.
-- The four keys (about, experience, languages, accessibility) map 1:1 to
-- columns in the hubs table and cannot be added/removed without a migration.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists profile_questions (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique,   -- maps to hubs column name
  question       text not null,          -- what hub admins see in the form
  placeholder    text not null default '',
  display_order  int  not null default 0
);

alter table profile_questions enable row level security;

-- Anyone (including anon) can read questions — needed for the public admin form
create policy "profile_questions: public read"
  on profile_questions for select
  using (true);

-- Only mnipl_admin can modify question wording
create policy "profile_questions: mnipl_admin write"
  on profile_questions for all
  to authenticated
  using  (is_mnipl_admin())
  with check (is_mnipl_admin());

-- Seed the four default questions
insert into profile_questions (key, question, placeholder, display_order) values
  ('about',
   'What is your congregation''s mission and values?',
   'Share your guiding principles and what makes your community unique…',
   1),
  ('experience',
   'What experience does your congregation have serving the community during emergencies?',
   'Past events, volunteer capacity, relationships with local emergency services…',
   2),
  ('languages',
   'What languages are spoken here, and who do you especially welcome?',
   'e.g. English and Spanish spoken; Somali interpreter available on request…',
   3),
  ('accessibility',
   'What accessibility features or accommodations can visitors expect?',
   'e.g. Wheelchair ramp at main entrance, accessible restrooms, hearing loop…',
   4)
on conflict (key) do nothing;
