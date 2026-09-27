-- Public booking API
-- ---------------------------------------------------------------------------

create or replace function public.ibs_public_context(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  select jsonb_build_object(
    'business', jsonb_build_object(
      'name', b.name,
      'display_name', b.display_name,
      'tagline', b.tagline,
      'slug', b.slug,
      'whatsapp_phone', b.whatsapp_phone
    ),
    'settings', jsonb_build_object(
      'timezone', s.timezone,
      'currency_code', s.currency_code,
      'slot_interval_minutes', s.slot_interval_minutes,
      'min_notice_minutes', s.min_notice_minutes,
      'max_advance_days', s.max_advance_days
    ),
    'services', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sv.id,
          'name', sv.name,
          'description', sv.description,
          'duration_minutes', sv.duration_minutes,
          'price_cents', sv.price_cents
        )
        order by sv.sort_order, sv.name
      )
      from public.services sv
      where sv.business_id = b.id and sv.is_active
    ), '[]'::jsonb)
  )
  into v_row
  from public.businesses b
  join public.booking_settings s on s.business_id = b.id
  where b.slug = p_slug;

  return v_row;
end;
$$;

create or replace function public.ibs_public_slots(
  p_slug text,
  p_service_id uuid,
  p_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_duration integer;
  v_slots jsonb;
begin
  select b.id, sv.duration_minutes
    into v_business, v_duration
  from public.businesses b
  join public.services sv on sv.business_id = b.id
  where b.slug = p_slug
    and sv.id = p_service_id
    and sv.is_active;

  if v_business is null then
    return jsonb_build_object('slots', '[]'::jsonb, 'reason', 'unavailable');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end)
      order by slot_start
    ),
    '[]'::jsonb
  )
  into v_slots
  from public.ibs_available_slots(v_business, v_duration, p_date, null, true, true);

  return jsonb_build_object(
    'slots', v_slots,
    'reason', case when jsonb_array_length(v_slots) = 0
      then public.ibs_slot_reason(v_business, p_date, true)
      else null end
  );
end;
$$;

create or replace function public.ibs_token_slots(p_token text, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_slots jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('slots', '[]'::jsonb, 'reason', 'unavailable');
  end if;

  select * into v_appt from public.appointments where manage_token = p_token;
  if not found or v_appt.status not in ('pending', 'confirmed') then
    return jsonb_build_object('slots', '[]'::jsonb, 'reason', 'unavailable');
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end) order by slot_start),
    '[]'::jsonb
  )
  into v_slots
  from public.ibs_available_slots(
    v_appt.business_id, v_appt.duration_minutes, p_date, v_appt.id, true, true
  );

  return jsonb_build_object(
    'slots', v_slots,
    'reason', case when jsonb_array_length(v_slots) = 0
      then public.ibs_slot_reason(v_appt.business_id, p_date, true)
      else null end
  );
end;
$$;

create or replace function public.ibs_queue_notice(
  p_business_id uuid,
  p_appointment_id uuid,
  p_kind text,
  p_email text,
  p_phone text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log uuid;
begin
  insert into public.notification_logs (
    business_id, appointment_id, channel, kind, status, recipient, payload, error
  ) values (
    p_business_id,
    p_appointment_id,
    'email',
    p_kind,
    case when p_email is null then 'skipped' else 'queued' end,
    p_email,
    coalesce(p_payload, '{}'::jsonb),
    case when p_email is null then 'No email address was provided.' else null end
  )
  returning id into v_log;

  insert into public.notification_logs (
    business_id, appointment_id, channel, kind, status, recipient, payload, error
  ) values (
    p_business_id,
    p_appointment_id,
    'whatsapp',
    p_kind,
    'skipped',
    p_phone,
    '{}'::jsonb,
    'WhatsApp delivery is not enabled yet.'
  );

  return v_log;
end;
$$;

create or replace function public.ibs_book_appointment(
  p_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_display text;
  v_service public.services%rowtype;
  v_settings public.booking_settings%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_notes text;
  v_local_date date;
  v_end timestamptz;
  v_customer uuid;
  v_token text;
  v_id uuid;
  v_log uuid;
begin
  select id, display_name into v_business, v_display
  from public.businesses where slug = p_slug;
  if v_business is null then
    return jsonb_build_object('ok', false, 'error', 'This studio is not available for booking.');
  end if;

  select * into v_service
  from public.services
  where id = p_service_id and business_id = v_business and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'That service is not available.');
  end if;

  select * into v_settings from public.booking_settings where business_id = v_business;

  v_name := trim(coalesce(p_full_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'Please enter your full name.');
  end if;

  v_phone := public.ibs_normalize_phone(p_phone);
  if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or char_length(v_phone) > 20 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid mobile number.');
  end if;

  v_email := nullif(trim(coalesce(p_email, '')), '');
  if v_email is not null and (
    char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid email address.');
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'Notes must be 1000 characters or fewer.');
  end if;

  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Please select an appointment time.');
  end if;

  v_local_date := (p_starts_at at time zone v_settings.timezone)::date;
  v_end := p_starts_at + (v_service.duration_minutes * interval '1 minute');

  if not public.ibs_accepts_start(v_business, v_service.duration_minutes, p_starts_at, true, true) then
    return jsonb_build_object('ok', false, 'error', 'That time is no longer available. Please select another time.');
  end if;
  if public.ibs_has_conflict(v_business, p_starts_at, v_end, null) then
    return jsonb_build_object('ok', false, 'error', 'Sorry, that appointment time was just taken. Please select another time.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  begin
    v_customer := public.ibs_upsert_customer(v_business, v_name, v_phone, v_email);

    insert into public.appointments (
      business_id, customer_id, service_id, starts_at, ends_at, status,
      price_cents, duration_minutes, service_name, customer_name, customer_phone,
      customer_email, notes, manage_token, source
    ) values (
      v_business, v_customer, v_service.id, p_starts_at, v_end, 'confirmed',
      v_service.price_cents, v_service.duration_minutes, v_service.name,
      v_name, v_phone, v_email, v_notes, v_token, 'online'
    )
    returning id into v_id;

    perform public.ibs_log_event(v_business, v_id, 'booked', jsonb_build_object('source', 'online'));

    v_log := public.ibs_queue_notice(
      v_business,
      v_id,
      'confirmation',
      v_email,
      v_phone,
      jsonb_build_object(
        'service_name', v_service.name,
        'starts_at', p_starts_at,
        'ends_at', v_end,
        'customer_name', v_name,
        'timezone', v_settings.timezone,
        'display_name', v_display,
        'currency_code', v_settings.currency_code,
        'price_cents', v_service.price_cents
      )
    );
  exception
    when exclusion_violation then
      return jsonb_build_object(
        'ok', false,
        'error', 'Sorry, that appointment time was just taken. Please select another time.'
      );
  end;

  return jsonb_build_object(
    'ok', true,
    'notification_id', v_log,
    'appointment', jsonb_build_object(
      'manage_token', v_token,
      'service_name', v_service.name,
      'starts_at', p_starts_at,
      'ends_at', v_end,
      'price_cents', v_service.price_cents,
      'duration_minutes', v_service.duration_minutes,
      'customer_name', v_name,
      'customer_email', v_email,
      'timezone', v_settings.timezone,
      'display_name', v_display,
      'currency_code', v_settings.currency_code
    )
  );
end;
$$;

create or replace function public.ibs_appointment_json(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_json jsonb;
begin
  select jsonb_build_object(
    'service_name', a.service_name,
    'service_id', a.service_id,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'status', a.status,
    'price_cents', a.price_cents,
    'duration_minutes', a.duration_minutes,
    'customer_name', a.customer_name,
    'customer_email', a.customer_email,
    'notes', a.notes,
    'timezone', s.timezone,
    'display_name', b.display_name,
    'currency_code', s.currency_code,
    'payment_status', a.payment_status,
    'whatsapp_phone', b.whatsapp_phone
  )
  into v_json
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  join public.booking_settings s on s.business_id = b.id
  where a.id = p_id;
  return v_json;
end;
$$;

create or replace function public.ibs_get_appointment(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;
  select * into v_appt from public.appointments where manage_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;
  return jsonb_build_object('ok', true, 'appointment', public.ibs_appointment_json(v_appt.id));
end;
$$;

create or replace function public.ibs_cancel_appointment(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_log uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;

  select * into v_appt from public.appointments where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;

  if v_appt.status in ('cancelled') then
    return jsonb_build_object('ok', true, 'appointment', public.ibs_appointment_json(v_appt.id));
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'This appointment can no longer be cancelled.');
  end if;

  update public.appointments
  set status = 'cancelled'
  where id = v_appt.id
  returning * into v_appt;

  perform public.ibs_log_event(v_appt.business_id, v_appt.id, 'cancelled', jsonb_build_object('by', 'customer'));
  v_log := public.ibs_queue_notice(
    v_appt.business_id, v_appt.id, 'cancellation', v_appt.customer_email, v_appt.customer_phone,
    jsonb_build_object(
      'service_name', v_appt.service_name,
      'starts_at', v_appt.starts_at,
      'ends_at', v_appt.ends_at,
      'customer_name', v_appt.customer_name
    )
  );

  return jsonb_build_object(
    'ok', true,
    'notification_id', v_log,
    'appointment', public.ibs_appointment_json(v_appt.id)
  );
end;
$$;

create or replace function public.ibs_reschedule_appointment(p_token text, p_starts_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_settings public.booking_settings%rowtype;
  v_local_date date;
  v_end timestamptz;
  v_log uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Please select an appointment time.');
  end if;

  select * into v_appt from public.appointments where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'This appointment can no longer be rescheduled.');
  end if;

  select * into v_settings from public.booking_settings where business_id = v_appt.business_id;
  v_local_date := (p_starts_at at time zone v_settings.timezone)::date;
  v_end := p_starts_at + (v_appt.duration_minutes * interval '1 minute');

  if not public.ibs_accepts_start(v_appt.business_id, v_appt.duration_minutes, p_starts_at, true, true) then
    return jsonb_build_object('ok', false, 'error', 'That time is no longer available. Please select another time.');
  end if;
  if public.ibs_has_conflict(v_appt.business_id, p_starts_at, v_end, v_appt.id) then
    return jsonb_build_object('ok', false, 'error', 'Sorry, that appointment time was just taken. Please select another time.');
  end if;

  begin
    update public.appointments
    set starts_at = p_starts_at, ends_at = v_end
    where id = v_appt.id
    returning * into v_appt;
  exception
    when exclusion_violation then
      return jsonb_build_object(
        'ok', false,
        'error', 'Sorry, that appointment time was just taken. Please select another time.'
      );
  end;

  perform public.ibs_log_event(
    v_appt.business_id, v_appt.id, 'rescheduled',
    jsonb_build_object('by', 'customer', 'starts_at', p_starts_at)
  );
  v_log := public.ibs_queue_notice(
    v_appt.business_id, v_appt.id, 'reschedule', v_appt.customer_email, v_appt.customer_phone,
    jsonb_build_object(
      'service_name', v_appt.service_name,
      'starts_at', v_appt.starts_at,
      'ends_at', v_appt.ends_at,
      'customer_name', v_appt.customer_name,
      'timezone', v_settings.timezone,
      'display_name', (select display_name from public.businesses where id = v_appt.business_id)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'notification_id', v_log,
    'appointment', public.ibs_appointment_json(v_appt.id)
  );
end;
$$;

create or replace function public.ibs_finish_notification(
  p_token text,
  p_log_id uuid,
  p_status text,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    return jsonb_build_object('ok', false, 'error', 'Invalid notification status.');
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'This appointment link is not valid.');
  end if;

  update public.notification_logs n
  set status = p_status,
      error = nullif(trim(coalesce(p_error, '')), '')
  from public.appointments a
  where n.id = p_log_id
    and n.appointment_id = a.id
    and a.manage_token = p_token
    and n.channel = 'email';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'Notification could not be updated.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff API
-- ---------------------------------------------------------------------------

create or replace function public.ibs_require_staff()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business uuid;
begin
  v_business := public.ibs_current_business_id();
  if v_business is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return v_business;
end;
$$;

create or replace function public.ibs_claim_owner(p_setup_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_hash text;
  v_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in before linking this account.');
  end if;

  select b.id, s.setup_key_hash
    into v_business, v_hash
  from public.businesses b
  join public.booking_settings s on s.business_id = b.id
  where b.slug = 'impact-beauty-studio';

  if v_hash is null
    or p_setup_key is null
    or encode(extensions.digest(p_setup_key, 'sha256'), 'hex') <> v_hash
  then
    return jsonb_build_object('ok', false, 'error', 'That setup key is not valid.');
  end if;

  if exists (
    select 1 from public.studio_profiles
    where business_id = v_business and role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'error', 'An owner already exists for this studio.');
  end if;

  v_email := coalesce(auth.jwt() ->> 'email', 'Studio owner');
  insert into public.studio_profiles (id, business_id, full_name, role)
  values (v_uid, v_business, v_email, 'owner')
  on conflict (id) do update
    set business_id = excluded.business_id, role = 'owner', full_name = excluded.full_name;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ibs_staff_slots(
  p_service_id uuid,
  p_date date,
  p_exclude uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_duration integer;
  v_slots jsonb;
begin
  v_business := public.ibs_require_staff();
  if p_exclude is not null then
    select duration_minutes into v_duration
    from public.appointments
    where id = p_exclude and business_id = v_business;
  else
    select duration_minutes into v_duration
    from public.services
    where id = p_service_id and business_id = v_business and is_active;
  end if;
  if v_duration is null then
    return jsonb_build_object('slots', '[]'::jsonb, 'reason', 'unavailable');
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('starts_at', slot_start, 'ends_at', slot_end) order by slot_start),
    '[]'::jsonb
  )
  into v_slots
  from public.ibs_available_slots(v_business, v_duration, p_date, p_exclude, false, false);

  return jsonb_build_object(
    'slots', v_slots,
    'reason', case when jsonb_array_length(v_slots) = 0
      then public.ibs_slot_reason(v_business, p_date, false)
      else null end
  );
end;
$$;

create or replace function public.ibs_admin_create_appointment(
  p_service_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_service public.services%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_notes text;
  v_end timestamptz;
  v_customer uuid;
  v_token text;
  v_id uuid;
begin
  v_business := public.ibs_require_staff();

  select * into v_service
  from public.services
  where id = p_service_id and business_id = v_business and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'That service is not available.');
  end if;

  v_name := trim(coalesce(p_full_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'Please enter the customer name.');
  end if;

  v_phone := public.ibs_normalize_phone(p_phone);
  if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or char_length(v_phone) > 20 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid mobile number.');
  end if;

  v_email := nullif(trim(coalesce(p_email, '')), '');
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid email address.');
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'Notes must be 1000 characters or fewer.');
  end if;

  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Please select an appointment time.');
  end if;

  v_end := p_starts_at + (v_service.duration_minutes * interval '1 minute');
  if v_end <= now() then
    return jsonb_build_object('ok', false, 'error', 'Choose a current or future time.');
  end if;
  if not public.ibs_within_hours(v_business, p_starts_at, v_end) then
    return jsonb_build_object('ok', false, 'error', 'This time is outside business hours.');
  end if;
  if public.ibs_has_conflict(v_business, p_starts_at, v_end, null) then
    return jsonb_build_object('ok', false, 'error', 'This time is already occupied.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  begin
    v_customer := public.ibs_upsert_customer(v_business, v_name, v_phone, v_email);
    insert into public.appointments (
      business_id, customer_id, service_id, starts_at, ends_at, status,
      price_cents, duration_minutes, service_name, customer_name, customer_phone,
      customer_email, notes, manage_token, source
    ) values (
      v_business, v_customer, v_service.id, p_starts_at, v_end, 'confirmed',
      v_service.price_cents, v_service.duration_minutes, v_service.name,
      v_name, v_phone, v_email, v_notes, v_token, 'manual'
    )
    returning id into v_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'error', 'This time is already occupied.');
  end;

  perform public.ibs_log_event(v_business, v_id, 'booked', jsonb_build_object('source', 'manual'));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.ibs_admin_set_status(p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_appt public.appointments%rowtype;
begin
  v_business := public.ibs_require_staff();
  if p_status not in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') then
    return jsonb_build_object('ok', false, 'error', 'That status is not valid.');
  end if;

  update public.appointments
  set status = p_status
  where id = p_id and business_id = v_business
  returning * into v_appt;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Appointment not found.');
  end if;

  perform public.ibs_log_event(
    v_business, v_appt.id, 'status_changed', jsonb_build_object('status', p_status)
  );
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ibs_admin_reschedule(p_id uuid, p_starts_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_appt public.appointments%rowtype;
  v_end timestamptz;
begin
  v_business := public.ibs_require_staff();
  select * into v_appt
  from public.appointments
  where id = p_id and business_id = v_business
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Appointment not found.');
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'Only active appointments can be rescheduled.');
  end if;
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'error', 'Please select an appointment time.');
  end if;

  v_end := p_starts_at + (v_appt.duration_minutes * interval '1 minute');
  if v_end <= now() then
    return jsonb_build_object('ok', false, 'error', 'Choose a current or future time.');
  end if;
  if not public.ibs_within_hours(v_business, p_starts_at, v_end) then
    return jsonb_build_object('ok', false, 'error', 'This time is outside business hours.');
  end if;
  if public.ibs_has_conflict(v_business, p_starts_at, v_end, v_appt.id) then
    return jsonb_build_object('ok', false, 'error', 'This time is already occupied.');
  end if;

  begin
    update public.appointments
    set starts_at = p_starts_at, ends_at = v_end
    where id = v_appt.id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'error', 'This time is already occupied.');
  end;

  perform public.ibs_log_event(
    v_business, v_appt.id, 'rescheduled', jsonb_build_object('by', 'staff', 'starts_at', p_starts_at)
  );
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ibs_admin_update_details(
  p_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_appt public.appointments%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_notes text;
  v_customer uuid;
begin
  v_business := public.ibs_require_staff();
  select * into v_appt from public.appointments where id = p_id and business_id = v_business for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Appointment not found.');
  end if;

  v_name := trim(coalesce(p_full_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'error', 'Please enter the customer name.');
  end if;
  v_phone := public.ibs_normalize_phone(p_phone);
  if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or char_length(v_phone) > 20 then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid mobile number.');
  end if;
  v_email := nullif(trim(coalesce(p_email, '')), '');
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'Please enter a valid email address.');
  end if;
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'Notes must be 1000 characters or fewer.');
  end if;

  begin
    v_customer := public.ibs_upsert_customer(v_business, v_name, v_phone, v_email);
    update public.appointments
    set customer_id = v_customer,
        customer_name = v_name,
        customer_phone = v_phone,
        customer_email = v_email,
        notes = v_notes
    where id = v_appt.id;
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'error', 'Another customer already uses that mobile number.');
  end;

  perform public.ibs_log_event(v_business, v_appt.id, 'details_updated', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ibs_pull_notifications(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_rows jsonb;
begin
  select cron_secret_hash into v_hash
  from public.booking_settings
  where business_id = (select id from public.businesses where slug = 'impact-beauty-studio');

  if v_hash is null
    or p_secret is null
    or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> v_hash
  then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  update public.notification_logs
  set status = 'queued'
  where status = 'sending' and updated_at < now() - interval '15 minutes';

  insert into public.notification_logs (
    business_id, appointment_id, channel, kind, status, recipient, payload
  )
  select
    a.business_id,
    a.id,
    'email',
    'reminder_24h',
    'queued',
    a.customer_email,
    jsonb_build_object(
      'service_name', a.service_name,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'customer_name', a.customer_name,
      'timezone', s.timezone,
      'display_name', b.display_name
    )
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  join public.booking_settings s on s.business_id = a.business_id
  where a.status in ('pending', 'confirmed')
    and a.customer_email is not null
    and a.starts_at > now() + interval '1 hour'
    and a.starts_at <= now() + interval '24 hours'
    and not exists (
      select 1 from public.notification_logs n
      where n.appointment_id = a.id
        and n.kind = 'reminder_24h'
        and n.channel = 'email'
    );

  with claimed as (
    update public.notification_logs
    set status = 'sending'
    where id in (
      select id from public.notification_logs
      where channel = 'email' and status = 'queued'
      order by created_at
      limit 50
    )
    returning id, appointment_id, kind, recipient, payload
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'appointment_id', c.appointment_id,
    'kind', c.kind,
    'recipient', c.recipient,
    'payload', c.payload,
    'manage_token', a.manage_token
  )), '[]'::jsonb)
  into v_rows
  from claimed c
  join public.appointments a on a.id = c.appointment_id;

  return jsonb_build_object('ok', true, 'notifications', v_rows);
end;
$$;

create or replace function public.ibs_finish_notification_secret(
  p_secret text,
  p_log_id uuid,
  p_status text,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if p_status not in ('sent', 'failed', 'skipped', 'queued') then
    return jsonb_build_object('ok', false, 'error', 'Invalid notification status.');
  end if;

  select cron_secret_hash into v_hash
  from public.booking_settings
  where business_id = (select id from public.businesses where slug = 'impact-beauty-studio');

  if v_hash is null
    or p_secret is null
    or encode(extensions.digest(p_secret, 'sha256'), 'hex') <> v_hash
  then
    return jsonb_build_object('ok', false, 'error', 'Unauthorized');
  end if;

  update public.notification_logs
  set status = p_status,
      error = nullif(trim(coalesce(p_error, '')), '')
  where id = p_log_id and channel = 'email';

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
