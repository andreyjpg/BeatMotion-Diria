-- =============================================================================
-- Diriá — Storage buckets and access rules
--
-- receipts  (private) payment, enrollment and event-signup receipts.
--           Path convention: `{user_id}/{uuid}.jpg`. Students upload only into
--           their own folder and can't overwrite a receipt once submitted.
--           The app shows them through signed URLs (createSignedUrl).
--           Files are removed 6 months after review by the retention job; the
--           database rows keep their amounts and get `*_deleted_at` set.
--
-- media     (public) event banners and marketplace photos. Anyone can view
--           them through public URLs; only admins upload or delete.
--
-- Images are resized on the device before upload (~1280px, JPEG), which keeps
-- a receipt around 200 KB; the size limits below are a safety net.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('media',    'media',    true,  5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

-- -----------------------------------------------------------------------------
-- receipts
-- -----------------------------------------------------------------------------
create policy "receipts: students upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "receipts: owner and admins read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  );

create policy "receipts: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and private.is_admin());

-- -----------------------------------------------------------------------------
-- media
-- -----------------------------------------------------------------------------
create policy "media: admins manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and private.is_admin())
  with check (bucket_id = 'media' and private.is_admin());
