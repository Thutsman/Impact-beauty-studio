-- Bring the seeded service catalog in line with the studio's current menu.

update public.services
set price_cents = 2000
where business_id = (select id from public.businesses where slug = 'impact-beauty-studio')
  and name = 'Wig Installation';

-- Retarget the old single "Makeup" service into the "Full Glam" tier.
update public.services
set name = 'Full Glam',
    description = 'Full glam makeup application.',
    duration_minutes = 90,
    price_cents = 2500,
    sort_order = 3
where business_id = (select id from public.businesses where slug = 'impact-beauty-studio')
  and name = 'Makeup';

-- The bundled combo is not part of the current menu.
delete from public.services
where business_id = (select id from public.businesses where slug = 'impact-beauty-studio')
  and name = 'Wig Installation + Makeup';

insert into public.services (business_id, name, description, duration_minutes, price_cents, sort_order)
select b.id, s.name, s.description, s.duration_minutes, s.price_cents, s.sort_order
from public.businesses b
cross join (
  values
    ('Wig Revamp', 'Refresh and restyle an existing wig install.', 60, 1000, 2),
    ('Soft Glam', 'Soft glam makeup application.', 75, 2000, 4),
    ('Natural Look', 'Natural, everyday makeup look.', 45, 1500, 5)
) as s(name, description, duration_minutes, price_cents, sort_order)
where b.slug = 'impact-beauty-studio'
  and not exists (
    select 1 from public.services sv
    where sv.business_id = b.id and sv.name = s.name
  );
