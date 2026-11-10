-- =============================================================================
-- Diriá — Daily cleanup of unused profile pictures
--
-- Changing or removing a picture deletes the old file right away, but only as
-- a best effort: if that fails (no connection), or a save fails after its
-- upload, the file stays. The daily purge-receipts job also deletes those:
-- files in `avatars` that no profile points to, a day after they were uploaded
-- (so a picture being saved right now is never touched). Files must be
-- deleted through the Storage API, so SQL only lists them.
-- =============================================================================

create function public.avatars_due_for_purge(
  p_grace interval default interval '1 day',
  p_limit integer default 500
)
returns table (path text)
language sql
stable
security definer
set search_path = ''
as $$
  select objects.name as path
  from storage.objects
  where objects.bucket_id = 'avatars'
    and objects.created_at < now() - p_grace
    and not exists (
      select 1 from public.profiles where profiles.photo_path = objects.name
    )
  limit p_limit
$$;

revoke execute on function public.avatars_due_for_purge(interval, integer) from public, anon, authenticated;
grant execute on function public.avatars_due_for_purge(interval, integer) to service_role;
