alter table public.businesses
  add column if not exists whatsapp_phone text;

update public.businesses
set whatsapp_phone = '+263778668058'
where slug = 'impact-beauty-studio';

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
