-- Impact Beauty Studio booking platform.
-- public.profiles already belongs to another application in this database,
-- so studio staff accounts live in studio_profiles. No existing tables are altered.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  display_name text not null,
  tagline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 15 and 720),
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, day_of_week),
  check (
    is_closed
    or (
      open_time is not null
      and close_time is not null
      and close_time > open_time
    )
  )
);

create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id),
  service_id uuid references public.services (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (
    status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  service_name text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  manage_token text not null unique,
  source text not null default 'online' check (source in ('online', 'manual')),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'deposit_due', 'deposit_paid', 'paid', 'refunded', 'waived')
  ),
  deposit_cents integer check (deposit_cents is null or deposit_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp')),
  kind text not null check (kind in ('confirmation', 'reminder_24h', 'cancellation', 'reschedule')),
  status text not null check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index notification_logs_one_email_kind
  on public.notification_logs (appointment_id, kind)
  where channel = 'email' and status in ('queued', 'sending', 'sent');

create table public.booking_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  timezone text not null default 'Africa/Johannesburg',
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 180),
  min_notice_minutes integer not null default 60 check (min_notice_minutes between 0 and 10080),
  max_advance_days integer not null default 90 check (max_advance_days between 1 and 365),
  setup_key_hash text,
  cron_secret_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_business_idx on public.services (business_id, is_active, sort_order);
create index business_hours_business_idx on public.business_hours (business_id, day_of_week);
create index blocked_times_range_idx on public.blocked_times (business_id, starts_at, ends_at);
create index customers_business_idx on public.customers (business_id, full_name);
create index appointments_schedule_idx on public.appointments (business_id, starts_at);
create index appointments_customer_idx on public.appointments (customer_id, starts_at);
create index appointments_status_idx on public.appointments (business_id, status, starts_at);
create index notification_logs_status_idx on public.notification_logs (status, kind);
create index studio_profiles_business_idx on public.studio_profiles (business_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.ibs_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated before update on public.businesses
  for each row execute function public.ibs_set_updated_at();
create trigger studio_profiles_updated before update on public.studio_profiles
  for each row execute function public.ibs_set_updated_at();
create trigger services_updated before update on public.services
  for each row execute function public.ibs_set_updated_at();
create trigger business_hours_updated before update on public.business_hours
  for each row execute function public.ibs_set_updated_at();
create trigger blocked_times_updated before update on public.blocked_times
  for each row execute function public.ibs_set_updated_at();
create trigger customers_updated before update on public.customers
  for each row execute function public.ibs_set_updated_at();
create trigger appointments_updated before update on public.appointments
  for each row execute function public.ibs_set_updated_at();
create trigger appointment_events_updated before update on public.appointment_events
  for each row execute function public.ibs_set_updated_at();
create trigger notification_logs_updated before update on public.notification_logs
  for each row execute function public.ibs_set_updated_at();
create trigger booking_settings_updated before update on public.booking_settings
  for each row execute function public.ibs_set_updated_at();

create or replace function public.ibs_protect_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    new.setup_key_hash := old.setup_key_hash;
    new.cron_secret_hash := old.cron_secret_hash;
    new.business_id := old.business_id;
  end if;
  begin
    perform now() at time zone new.timezone;
  exception
    when invalid_parameter_value then
      raise exception 'Invalid timezone';
  end;
  return new;
end;
$$;

create trigger booking_settings_protect before update on public.booking_settings
  for each row execute function public.ibs_protect_settings();

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.ibs_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.studio_profiles where id = auth.uid() limit 1;
$$;

create or replace function public.ibs_normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g');
$$;

create or replace function public.ibs_log_event(
  p_business_id uuid,
  p_appointment_id uuid,
  p_type text,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.appointment_events (business_id, appointment_id, event_type, payload)
  values (p_business_id, p_appointment_id, p_type, coalesce(p_payload, '{}'::jsonb));
$$;

create or replace function public.ibs_upsert_customer(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.customers (business_id, full_name, phone, email)
  values (p_business_id, p_name, p_phone, p_email)
  on conflict (business_id, phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.ibs_within_hours(
  p_business_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_start_local timestamp;
  v_end_local timestamp;
  v_closed boolean;
  v_open time;
  v_close time;
begin
  select timezone into v_tz from public.booking_settings where business_id = p_business_id;
  if v_tz is null or p_end <= p_start then
    return false;
  end if;

  v_start_local := p_start at time zone v_tz;
  v_end_local := p_end at time zone v_tz;
  if v_start_local::date <> v_end_local::date then
    return false;
  end if;

  select is_closed, open_time, close_time
    into v_closed, v_open, v_close
  from public.business_hours
  where business_id = p_business_id
    and day_of_week = extract(dow from v_start_local)::int;

  if coalesce(v_closed, true) or v_open is null or v_close is null then
    return false;
  end if;

  return v_start_local::time >= v_open and v_end_local::time <= v_close;
end;
$$;

create or replace function public.ibs_has_conflict(
  p_business_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.business_id = p_business_id
      and a.status in ('pending', 'confirmed')
      and (p_exclude is null or a.id <> p_exclude)
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_start, p_end, '[)')
  )
  or exists (
    select 1
    from public.blocked_times b
    where b.business_id = p_business_id
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_start, p_end, '[)')
  );
$$;

-- Keep in sync with src/lib/availability.ts
create or replace function public.ibs_available_slots(
  p_business_id uuid,
  p_duration_minutes integer,
  p_date date,
  p_exclude uuid default null,
  p_respect_notice boolean default true,
  p_respect_advance boolean default true
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_interval integer;
  v_notice integer;
  v_advance integer;
  v_closed boolean;
  v_open time;
  v_close time;
  v_today date;
  v_cursor timestamptz;
  v_day_end timestamptz;
  v_slot_end timestamptz;
  v_guard integer := 0;
begin
  if p_duration_minutes is null or p_duration_minutes <= 0 or p_date is null then
    return;
  end if;

  select timezone, slot_interval_minutes, min_notice_minutes, max_advance_days
    into v_tz, v_interval, v_notice, v_advance
  from public.booking_settings
  where business_id = p_business_id;

  if v_tz is null or v_interval is null or v_interval <= 0 then
    return;
  end if;

  v_today := (now() at time zone v_tz)::date;
  if p_date < v_today then
    return;
  end if;
  if p_respect_advance and p_date > v_today + v_advance then
    return;
  end if;

  select is_closed, open_time, close_time
    into v_closed, v_open, v_close
  from public.business_hours
  where business_id = p_business_id
    and day_of_week = extract(dow from p_date)::int;

  if coalesce(v_closed, true) or v_open is null or v_close is null then
    return;
  end if;

  v_cursor := (p_date + v_open) at time zone v_tz;
  v_day_end := (p_date + v_close) at time zone v_tz;

  while v_cursor + (p_duration_minutes * interval '1 minute') <= v_day_end and v_guard < 300 loop
    v_guard := v_guard + 1;
    v_slot_end := v_cursor + (p_duration_minutes * interval '1 minute');
    if (
      (p_respect_notice and v_cursor >= now() + (v_notice * interval '1 minute'))
      or (not p_respect_notice and v_slot_end > now())
    )
    and not public.ibs_has_conflict(p_business_id, v_cursor, v_slot_end, p_exclude)
    then
      slot_start := v_cursor;
      slot_end := v_slot_end;
      return next;
    end if;
    v_cursor := v_cursor + (v_interval * interval '1 minute');
  end loop;
end;
$$;

create or replace function public.ibs_slot_reason(
  p_business_id uuid,
  p_date date,
  p_respect_advance boolean
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_advance integer;
  v_today date;
  v_closed boolean;
begin
  select timezone, max_advance_days into v_tz, v_advance
  from public.booking_settings where business_id = p_business_id;
  if v_tz is null then
    return 'unavailable';
  end if;
  v_today := (now() at time zone v_tz)::date;
  if p_date < v_today then
    return 'past';
  end if;
  if p_respect_advance and p_date > v_today + v_advance then
    return 'beyond';
  end if;
  select is_closed into v_closed
  from public.business_hours
  where business_id = p_business_id and day_of_week = extract(dow from p_date)::int;
  if coalesce(v_closed, true) then
    return 'closed';
  end if;
  return 'unavailable';
end;
$$;

-- ---------------------------------------------------------------------------
