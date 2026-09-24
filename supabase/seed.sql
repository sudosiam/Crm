-- DEVELOPMENT ONLY.
-- Inserts fictional sample customers into the first business and marks them is_sample = true.
-- Do not run this against a live showroom database.
-- Remove the rows with supabase/clear_seed.sql.

do $$
declare
  org uuid;
  owner uuid;
begin
  select id into org from public.organizations order by created_at limit 1;
  if org is null then
    raise exception 'Create the business in the app before seeding.';
  end if;
  select user_id into owner
  from public.organization_members
  where organization_id = org and role = 'OWNER'
  limit 1;
  if exists (select 1 from public.customers where organization_id = org and is_sample) then
    raise notice 'Sample customers already exist. Run clear_seed.sql first.';
    return;
  end if;

  insert into public.customers (
    organization_id, name, phone, phone_normalized, status, enquiry_date, model,
    battery_configuration, source, notes, follow_up_date, follow_up_time,
    assigned_to, created_by, is_sample
  ) values (
    org, 'Rahul Das', '9876543210', '9876543210', 'FOLLOW_UP', current_date, 'Zoom',
    'Lithium Battery', 'Google Ads', '[SAMPLE] Asked to visit after lunch', current_date, '11:00',
    owner, owner, true
  );
end;
$$;
