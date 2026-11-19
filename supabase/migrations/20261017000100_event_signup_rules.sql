-- =============================================================================
-- Diriá — Event signups: the database decides price, status and capacity
--
-- Students can only read their own signups, so the app could never count the
-- spots taken by others (its capacity check always saw 0), and the insert
-- policy let a student send a signup for a paid event as 'autoApproved', with
-- any price. Now a trigger fills those in when a signup is created:
--   * the event must be published, not deleted and not started yet;
--   * price comes from the event (members-only events take no guests);
--   * free events are confirmed right away, paid ones wait for review and
--     need a receipt;
--   * the signup must fit in the event's remaining capacity.
-- Errors reach the app as P0001 with the codes below as the message:
--   EVENT_NOT_AVAILABLE, EVENT_STARTED, RECEIPT_REQUIRED, NO_AVAILABLE_SLOTS
--
-- App: supabase.rpc('event_spots_taken', { p_event_id })  -- people signed up
-- =============================================================================

-- One live signup (pending/approved/autoApproved) per student and event. Older
-- duplicates, if any, are canceled first so the index can be built.
with ranked as (
  select id,
         row_number() over (partition by event_id, user_id order by created_at desc, id) as n
  from public.event_signups
  where status in ('pending', 'approved', 'autoApproved')
)
update public.event_signups s
set status = 'canceled'
from ranked r
where r.id = s.id and r.n > 1;

create unique index event_signups_one_live
  on public.event_signups (event_id, user_id)
  where status in ('pending', 'approved', 'autoApproved');

-- People (signups + guests) holding a spot, readable by every student.
create function public.event_spots_taken(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(s.total_attendees), 0)::integer
  from public.event_signups s
  where s.event_id = p_event_id
    and s.status in ('pending', 'approved', 'autoApproved')
$$;

revoke execute on function public.event_spots_taken(uuid) from public, anon;
grant execute on function public.event_spots_taken(uuid) to authenticated;

create function private.prepare_event_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e     public.events;
  taken integer;
begin
  -- Locking the event makes simultaneous signups wait for each other, so two
  -- people can't both take the last spot.
  select * into e from public.events where id = new.event_id for update;

  if not found or e.is_deleted or e.status <> 'published' then
    raise exception 'EVENT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;
  if e.starts_at <= now() then
    raise exception 'EVENT_STARTED' using errcode = 'P0001';
  end if;

  if not e.is_public then
    new.invitee_count := 0;
  end if;

  new.price_per_head := coalesce(e.price, 0);
  new.total_price    := new.price_per_head * (new.invitee_count + 1);
  new.is_free        := new.price_per_head = 0;

  if not private.is_admin() then
    new.status      := case when new.is_free then 'autoApproved'::public.signup_status else 'pending' end;
    new.reviewed_by := null;
    new.reviewed_at := null;
    if not new.is_free and new.receipt_path is null then
      raise exception 'RECEIPT_REQUIRED' using errcode = 'P0001';
    end if;
  end if;

  if e.capacity is not null then
    select coalesce(sum(s.total_attendees), 0) into taken
    from public.event_signups s
    where s.event_id = e.id
      and s.status in ('pending', 'approved', 'autoApproved');

    if taken + new.invitee_count + 1 > e.capacity then
      raise exception 'NO_AVAILABLE_SLOTS' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger prepare_event_signup
  before insert on public.event_signups
  for each row execute function private.prepare_event_signup();
