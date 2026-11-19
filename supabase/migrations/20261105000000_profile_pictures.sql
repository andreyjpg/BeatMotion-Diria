-- =============================================================================
-- Diriá — Profile pictures
--
-- avatars  (private) Path convention: `{user_id}/{timestamp}-{random}.jpg`.
--          Users upload and delete only in their own folder; admins can also
--          remove a picture that isn't appropriate. The app shows pictures
--          through signed URLs (createSignedUrls) that last an hour, and only
--          the owner and staff can get one. `profiles.photo_path` stores the
--          object path.
--
-- Pictures are resized on the device (512px, JPEG), which keeps them well under
-- the size limit. The delete-account function removes the user's folder.
-- =============================================================================

alter table public.profiles
  add column photo_path text,
  add constraint profiles_photo_path_own_folder
    check (photo_path is null or photo_path like id::text || '/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1024 * 1024, array['image/jpeg']);

create policy "avatars: users upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: owner and staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_staff())
  );

create policy "avatars: owner and admins delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  );
