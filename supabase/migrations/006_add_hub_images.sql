-- Add images array to hubs and create the storage bucket
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- 1. Add images column
alter table hubs
  add column if not exists images text[] not null default '{}';

-- 2. Create the hub-images storage bucket (public reads, 5 MB limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hub-images',
  'hub-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 3. Storage RLS policies

-- Anyone can view hub images
create policy "hub images: public read"
  on storage.objects for select
  using (bucket_id = 'hub-images');

-- Authenticated users can upload into their own folder (uid is first path segment)
create policy "hub images: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hub-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own images
create policy "hub images: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hub-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
