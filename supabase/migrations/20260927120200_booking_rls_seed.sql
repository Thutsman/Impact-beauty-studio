-- RLS
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.studio_profiles enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;
alter table public.notification_logs enable row level security;
alter table public.booking_settings enable row level security;

create policy studio_profiles_select_self on public.studio_profiles
  for select to authenticated
  using (id = auth.uid());

create policy businesses_select_staff on public.businesses
  for select to authenticated
  using (id = public.ibs_current_business_id());

create policy businesses_update_staff on public.businesses
  for update to authenticated
  using (id = public.ibs_current_business_id())
  with check (id = public.ibs_current_business_id());

create policy services_staff on public.services
  for all to authenticated
  using (business_id = public.ibs_current_business_id())
  with check (business_id = public.ibs_current_business_id());

create policy business_hours_staff on public.business_hours
  for all to authenticated
  using (business_id = public.ibs_current_business_id())
  with check (business_id = public.ibs_current_business_id());

create policy blocked_times_staff on public.blocked_times
  for all to authenticated
  using (business_id = public.ibs_current_business_id())
  with check (business_id = public.ibs_current_business_id());

create policy customers_staff on public.customers
  for all to authenticated
  using (business_id = public.ibs_current_business_id())
  with check (business_id = public.ibs_current_business_id());

create policy appointments_select_staff on public.appointments
  for select to authenticated
  using (business_id = public.ibs_current_business_id());

create policy appointment_events_select_staff on public.appointment_events
  for select to authenticated
  using (business_id = public.ibs_current_business_id());

create policy notification_logs_select_staff on public.notification_logs
  for select to authenticated
  using (business_id = public.ibs_current_business_id());

create policy booking_settings_staff on public.booking_settings
  for select to authenticated
  using (business_id = public.ibs_current_business_id());

create policy booking_settings_update_staff on public.booking_settings
  for update to authenticated
  using (business_id = public.ibs_current_business_id())
  with check (business_id = public.ibs_current_business_id());

create view public.customer_summaries
with (security_invoker = true) as
select
  c.id,
  c.business_id,
  c.full_name,
  c.phone,
  c.email,
  c.notes,
  c.created_at,
  c.updated_at,
  count(a.id)::integer as appointment_count,
  max(a.starts_at) filter (
    where a.starts_at < now() and a.status <> 'cancelled'
  ) as last_appointment_at,
  min(a.starts_at) filter (
    where a.starts_at >= now() and a.status in ('pending', 'confirmed')
  ) as upcoming_appointment_at
from public.customers c
left join public.appointments a on a.customer_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Privileges: anon has no table access. Writes to appointments go through functions.
-- ---------------------------------------------------------------------------

revoke all on table
  public.businesses,
  public.studio_profiles,
  public.services,
  public.business_hours,
  public.blocked_times,
  public.customers,
  public.appointments,
  public.appointment_events,
  public.notification_logs,
  public.booking_settings
from public, anon, authenticated;

grant select, update on public.businesses to authenticated;
grant select on public.studio_profiles to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.business_hours to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select, update on public.customers to authenticated;
grant select on public.appointments to authenticated;
grant select on public.appointment_events to authenticated;
grant select on public.notification_logs to authenticated;
grant select, update on public.booking_settings to authenticated;
revoke all on public.customer_summaries from public, anon, authenticated;
grant select on public.customer_summaries to authenticated;

revoke all on function public.ibs_set_updated_at() from public, anon, authenticated;
revoke all on function public.ibs_protect_settings() from public, anon, authenticated;
revoke all on function public.ibs_normalize_phone(text) from public, anon, authenticated;
revoke all on function public.ibs_log_event(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.ibs_upsert_customer(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.ibs_within_hours(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.ibs_has_conflict(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.ibs_available_slots(uuid, integer, date, uuid, boolean, boolean) from public, anon, authenticated;
revoke all on function public.ibs_slot_reason(uuid, date, boolean) from public, anon, authenticated;
revoke all on function public.ibs_queue_notice(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.ibs_appointment_json(uuid) from public, anon, authenticated;
revoke all on function public.ibs_require_staff() from public, anon, authenticated;

revoke all on function public.ibs_current_business_id() from public, anon;
grant execute on function public.ibs_current_business_id() to authenticated;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'ibs_public_context(text)',
    'ibs_public_slots(text, uuid, date)',
    'ibs_token_slots(text, date)',
    'ibs_book_appointment(text, uuid, timestamptz, text, text, text, text)',
    'ibs_get_appointment(text)',
    'ibs_cancel_appointment(text)',
    'ibs_reschedule_appointment(text, timestamptz)',
    'ibs_finish_notification(text, uuid, text, text)',
    'ibs_pull_notifications(text)',
    'ibs_finish_notification_secret(text, uuid, text, text)'
  ]
  loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to anon, authenticated', fn);
  end loop;

  foreach fn in array array[
    'ibs_claim_owner(text)',
    'ibs_staff_slots(uuid, date, uuid)',
    'ibs_admin_create_appointment(uuid, timestamptz, text, text, text, text)',
    'ibs_admin_set_status(uuid, text)',
    'ibs_admin_reschedule(uuid, timestamptz)',
    'ibs_admin_update_details(uuid, text, text, text, text)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Impact Beauty Studio seed. Prices are starter catalog values to edit in admin.
-- Sample appointments are marked in their notes and can be deleted.
-- ---------------------------------------------------------------------------

insert into public.businesses (slug, name, display_name, tagline)
values (
  'impact-beauty-studio',
  'Impact Beauty Studio',
  'Impact Beauty Studio by Yvonnie',
  'Beauty that makes an impact.'
);

insert into public.booking_settings (business_id, timezone, currency_code, slot_interval_minutes, min_notice_minutes, max_advance_days)
select id, 'Africa/Johannesburg', 'USD', 30, 60, 90
from public.businesses
where slug = 'impact-beauty-studio';

insert into public.services (business_id, name, description, duration_minutes, price_cents, sort_order)
select b.id, s.name, s.description, s.duration_minutes, s.price_cents, s.sort_order
from public.businesses b
cross join (
  values
    ('Wig Installation', 'Professional wig installation.', 120, 15000, 1),
    ('Makeup', 'Professional makeup service.', 90, 8000, 2),
    ('Wig Installation + Makeup', 'Combined wig installation and makeup appointment.', 210, 21000, 3)
) as s(name, description, duration_minutes, price_cents, sort_order)
where b.slug = 'impact-beauty-studio';

insert into public.business_hours (business_id, day_of_week, is_closed, open_time, close_time)
select b.id, d.day, d.closed, d.open_t, d.close_t
from public.businesses b
cross join (
  values
    (0, true, null::time, null::time),
    (1, true, null::time, null::time),
    (2, false, time '08:00', time '17:00'),
    (3, false, time '08:00', time '17:00'),
    (4, false, time '08:00', time '17:00'),
    (5, false, time '08:00', time '17:00'),
    (6, false, time '08:00', time '17:00')
) as d(day, closed, open_t, close_t)
where b.slug = 'impact-beauty-studio';

do $$
declare
  v_business uuid;
  v_tz text;
  v_today date;
  v_tue date;
  v_wed date;
  v_fri date;
  v_wig uuid;
  v_makeup uuid;
  v_combo uuid;
  v_sarah uuid;
  v_brenda uuid;
  v_amanda uuid;
  v_appt uuid;
begin
  select b.id, s.timezone into v_business, v_tz
  from public.businesses b
  join public.booking_settings s on s.business_id = b.id
  where b.slug = 'impact-beauty-studio';

  select id into v_wig from public.services where business_id = v_business and name = 'Wig Installation';
  select id into v_makeup from public.services where business_id = v_business and name = 'Makeup';
  select id into v_combo from public.services where business_id = v_business and name = 'Wig Installation + Makeup';

  v_today := (now() at time zone v_tz)::date;
  v_tue := v_today + ((2 - extract(dow from v_today)::int + 7) % 7);
  if ((v_tue::timestamp + time '09:00') at time zone v_tz) <= now() then
    v_tue := v_tue + 7;
  end if;
  v_wed := v_tue + 1;
  v_fri := v_tue + 3;

  insert into public.customers (business_id, full_name, phone, email, notes)
  values (v_business, 'Sarah Ncube', '+15555550101', 'sarah.sample@example.com', 'Sample customer')
  returning id into v_sarah;

  insert into public.customers (business_id, full_name, phone, email, notes)
  values (v_business, 'Brenda Moyo', '+15555550102', 'brenda.sample@example.com', 'Sample customer')
  returning id into v_brenda;

  insert into public.customers (business_id, full_name, phone, notes)
  values (v_business, 'Amanda Dube', '+15555550103', 'Sample customer')
  returning id into v_amanda;

  insert into public.appointments (
    business_id, customer_id, service_id, starts_at, ends_at, status,
    price_cents, duration_minutes, service_name, customer_name, customer_phone,
    customer_email, notes, manage_token, source
  ) values (
    v_business, v_sarah, v_wig,
    (v_tue::timestamp + time '09:00') at time zone v_tz,
    (v_tue::timestamp + time '11:00') at time zone v_tz,
    'confirmed', 15000, 120, 'Wig Installation', 'Sarah Ncube', '+15555550101',
    'sarah.sample@example.com', 'Sample appointment',
    encode(extensions.gen_random_bytes(32), 'hex'), 'manual'
  ) returning id into v_appt;
  perform public.ibs_log_event(v_business, v_appt, 'booked', jsonb_build_object('source', 'sample'));

  insert into public.appointments (
    business_id, customer_id, service_id, starts_at, ends_at, status,
    price_cents, duration_minutes, service_name, customer_name, customer_phone,
    customer_email, notes, manage_token, source
  ) values (
    v_business, v_brenda, v_makeup,
    (v_tue::timestamp + time '11:30') at time zone v_tz,
    (v_tue::timestamp + time '13:00') at time zone v_tz,
    'confirmed', 8000, 90, 'Makeup', 'Brenda Moyo', '+15555550102',
    'brenda.sample@example.com', 'Sample appointment',
    encode(extensions.gen_random_bytes(32), 'hex'), 'manual'
  ) returning id into v_appt;
  perform public.ibs_log_event(v_business, v_appt, 'booked', jsonb_build_object('source', 'sample'));

  insert into public.appointments (
    business_id, customer_id, service_id, starts_at, ends_at, status,
    price_cents, duration_minutes, service_name, customer_name, customer_phone,
    notes, manage_token, source
  ) values (
    v_business, v_amanda, v_combo,
    (v_wed::timestamp + time '10:00') at time zone v_tz,
    (v_wed::timestamp + time '13:30') at time zone v_tz,
    'confirmed', 21000, 210, 'Wig Installation + Makeup', 'Amanda Dube', '+15555550103',
    'Sample appointment',
    encode(extensions.gen_random_bytes(32), 'hex'), 'manual'
  ) returning id into v_appt;
  perform public.ibs_log_event(v_business, v_appt, 'booked', jsonb_build_object('source', 'sample'));

  insert into public.blocked_times (business_id, starts_at, ends_at, label, notes)
  values (
    v_business,
    (v_fri::timestamp + time '12:00') at time zone v_tz,
    (v_fri::timestamp + time '15:00') at time zone v_tz,
    'Personal',
    'Sample blocked period'
  );
end $$;
