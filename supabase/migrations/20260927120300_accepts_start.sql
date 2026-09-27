-- A valid opening on the booking grid can still be occupied.
-- Occupied starts return the taken message. Invalid starts stay unavailable.

create or replace function public.ibs_accepts_start(
  p_business_id uuid,
  p_duration_minutes integer,
  p_start timestamptz,
  p_respect_notice boolean,
  p_respect_advance boolean
)
returns boolean
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
  v_date date;
  v_today date;
  v_closed boolean;
  v_open time;
  v_close time;
  v_local timestamp;
  v_end_local timestamp;
  v_minutes integer;
begin
  if p_duration_minutes is null or p_duration_minutes <= 0 or p_start is null then
    return false;
  end if;

  select timezone, slot_interval_minutes, min_notice_minutes, max_advance_days
    into v_tz, v_interval, v_notice, v_advance
  from public.booking_settings
  where business_id = p_business_id;

  if v_tz is null or v_interval is null or v_interval <= 0 then
    return false;
  end if;

  v_local := p_start at time zone v_tz;
  v_end_local := (p_start + (p_duration_minutes * interval '1 minute')) at time zone v_tz;
  if v_local::date <> v_end_local::date then
    return false;
  end if;
  if date_trunc('minute', v_local) <> v_local then
    return false;
  end if;

  v_date := v_local::date;
  v_today := (now() at time zone v_tz)::date;
  if v_date < v_today then
    return false;
  end if;
  if p_respect_advance and v_date > v_today + v_advance then
    return false;
  end if;

  select is_closed, open_time, close_time
    into v_closed, v_open, v_close
  from public.business_hours
  where business_id = p_business_id
    and day_of_week = extract(dow from v_date)::int;

  if coalesce(v_closed, true) or v_open is null or v_close is null then
    return false;
  end if;
  if v_local::time < v_open or v_end_local::time > v_close then
    return false;
  end if;

  v_minutes := floor(extract(epoch from (v_local - (v_date + v_open))) / 60)::integer;
  if v_minutes < 0 or v_minutes % v_interval <> 0 then
    return false;
  end if;

  if p_respect_notice and p_start < now() + (v_notice * interval '1 minute') then
    return false;
  end if;
  if not p_respect_notice and (p_start + (p_duration_minutes * interval '1 minute')) <= now() then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.ibs_accepts_start(uuid, integer, timestamptz, boolean, boolean) from public, anon, authenticated;
