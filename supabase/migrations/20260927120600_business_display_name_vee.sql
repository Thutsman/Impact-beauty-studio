-- The studio goes by "Vee", not "Yvonnie".
update public.businesses
set display_name = 'Impact Beauty Studio by Vee'
where slug = 'impact-beauty-studio'
  and display_name = 'Impact Beauty Studio by Yvonnie';
