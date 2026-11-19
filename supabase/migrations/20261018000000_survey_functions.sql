-- =============================================================================
-- Diriá — Saving surveys and responses in one transaction
--
-- save_survey (admins): creates or edits a survey with its questions. Questions
--   keep their ids across edits, so answers already given stay attached to
--   them (the Firestore version gave every question a new id on each save,
--   which detached all earlier answers). Questions left out are deleted with
--   their answers; a question whose type changes comes back without an id and
--   starts with no answers.
-- submit_survey_response (students): the response and all its answers, or
--   nothing. The survey must be active, not expired and for one of the
--   student's courses; required questions must be answered and choices must be
--   one of the options. Errors reach the app as P0001 with these messages:
--   SURVEY_CLOSED, NOT_ENROLLED, MISSING_ANSWERS, INVALID_ANSWER;
--   answering twice is a unique_violation (23505).
--
-- App:
--   supabase.rpc('save_survey', { p_course_id, p_title, p_questions, p_survey_id?, p_description?, p_expires_at? })
--     p_questions: [{ id?, questionText, questionType, required, options? }] in display order
--   supabase.rpc('submit_survey_response', { p_survey_id, p_answers, p_completion_time_seconds })
--     p_answers: [{ questionId, value }] (value: 1-5 for rating, text otherwise)
-- =============================================================================

-- Reordering swaps positions inside one statement; check uniqueness at commit.
alter table public.survey_questions
  drop constraint survey_questions_survey_id_position_key,
  add constraint survey_questions_survey_id_position_key
    unique (survey_id, position) deferrable initially deferred;

create function public.save_survey(
  p_course_id   uuid,
  p_title       text,
  p_questions   jsonb,
  p_survey_id   uuid        default null,  -- null creates a new survey
  p_description text        default null,
  p_expires_at  timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_survey_id uuid := p_survey_id;
begin
  if not private.is_admin() then
    raise exception 'Only admins can save surveys' using errcode = '42501';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'A survey needs at least one question' using errcode = '22023';
  end if;

  if v_survey_id is null then
    insert into public.surveys (course_id, title, description, expires_at, created_by)
    values (p_course_id, trim(p_title), nullif(trim(p_description), ''), p_expires_at, auth.uid())
    returning id into v_survey_id;
  else
    -- The course of an existing survey doesn't change (its answers belong to it).
    update public.surveys
    set title = trim(p_title),
        description = nullif(trim(p_description), ''),
        expires_at = p_expires_at
    where id = v_survey_id;
    if not found then
      raise exception 'Survey not found' using errcode = 'P0002';
    end if;
  end if;

  -- Questions no longer in the survey (their answers go with them).
  delete from public.survey_questions q
  where q.survey_id = v_survey_id
    and q.id not in (
      select (x ->> 'id')::uuid
      from jsonb_array_elements(p_questions) x
      where nullif(x ->> 'id', '') is not null
    );

  -- Update kept questions in place, insert new ones; position = display order.
  insert into public.survey_questions as q
    (id, survey_id, position, question_text, question_type, required, options)
  select
    coalesce(nullif(x ->> 'id', '')::uuid, gen_random_uuid()),
    v_survey_id,
    (ord - 1)::integer,
    trim(x ->> 'questionText'),
    (x ->> 'questionType')::public.question_type,
    coalesce((x ->> 'required')::boolean, true),
    case
      when x ->> 'questionType' = 'multiple_choice'
        then array(select trim(o) from jsonb_array_elements_text(x -> 'options') o)
    end
  from jsonb_array_elements(p_questions) with ordinality as e(x, ord)
  on conflict (id) do update
    set position      = excluded.position,
        question_text = excluded.question_text,
        question_type = excluded.question_type,
        required      = excluded.required,
        options       = excluded.options
    where q.survey_id = excluded.survey_id;

  return v_survey_id;
end;
$$;

-- The answer given to each question of a survey (null when not answered or
-- blank), read from the app's [{ questionId, value }] list.
create function private.survey_answer_input(p_survey_id uuid, p_answers jsonb)
returns table (question_id uuid, question_type public.question_type, required boolean, options text[], value text)
language sql
stable
set search_path = ''
as $$
  select q.id, q.question_type, q.required, q.options, nullif(trim(a.value), '')
  from public.survey_questions q
  left join lateral (
    select x ->> 'value' as value
    from jsonb_array_elements(p_answers) x
    where (x ->> 'questionId')::uuid = q.id
    limit 1
  ) a on true
  where q.survey_id = p_survey_id
$$;

create function public.submit_survey_response(
  p_survey_id               uuid,
  p_answers                 jsonb,
  p_completion_time_seconds integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s           public.surveys;
  response_id uuid;
begin
  select * into s from public.surveys where id = p_survey_id;
  if not found or not s.is_active or s.is_deleted
     or (s.expires_at is not null and s.expires_at <= now()) then
    raise exception 'SURVEY_CLOSED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.course_members cm
    where cm.user_id = auth.uid() and cm.course_id = s.course_id and cm.active
  ) then
    raise exception 'NOT_ENROLLED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from private.survey_answer_input(s.id, p_answers)
    where required and value is null
  ) then
    raise exception 'MISSING_ANSWERS' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from private.survey_answer_input(s.id, p_answers)
    where value is not null
      and (
        (question_type = 'rating' and value !~ '^[1-5]$')
        or (question_type = 'multiple_choice' and not (value = any (options)))
      )
  ) then
    raise exception 'INVALID_ANSWER' using errcode = 'P0001';
  end if;

  insert into public.survey_responses (survey_id, user_id, completion_time_seconds)
  values (s.id, auth.uid(), p_completion_time_seconds)
  returning id into response_id;

  insert into public.survey_answers (response_id, question_id, rating, text_value)
  select
    response_id,
    question_id,
    case when question_type = 'rating' then value::smallint end,
    case when question_type <> 'rating' then value end
  from private.survey_answer_input(s.id, p_answers)
  where value is not null;

  return response_id;
end;
$$;

revoke execute on function public.save_survey(uuid, text, jsonb, uuid, text, timestamptz) from public, anon;
revoke execute on function public.submit_survey_response(uuid, jsonb, integer) from public, anon;
grant execute on function public.save_survey(uuid, text, jsonb, uuid, text, timestamptz) to authenticated;
grant execute on function public.submit_survey_response(uuid, jsonb, integer) to authenticated;
