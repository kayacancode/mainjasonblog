-- Allow public (anon) read + upload to the instagram-images bucket
-- NOTE: This makes the bucket writable by anyone holding the anon key.
-- If you want to restrict further, change the USING/CHECK expressions accordingly.

-- Ensure the bucket exists (no-op if it already exists)
insert into storage.buckets (id, name, public)
values ('instagram-images', 'instagram-images', true)
on conflict (id) do update set public = excluded.public;

-- Enable policies
alter table storage.objects enable row level security;

-- Public read
create policy "Public read instagram-images"
  on storage.objects for select
  using (bucket_id = 'instagram-images');

-- Public insert (uploads)
create policy "Public insert instagram-images"
  on storage.objects for insert
  with check (bucket_id = 'instagram-images');

-- Optional: allow updates (needed if you use upsert or overwrite)
create policy "Public update instagram-images"
  on storage.objects for update
  using (bucket_id = 'instagram-images')
  with check (bucket_id = 'instagram-images');

-- Optional: allow delete (comment out if you don't want this)
-- create policy "Public delete instagram-images"
--   on storage.objects for delete
--   using (bucket_id = 'instagram-images');

