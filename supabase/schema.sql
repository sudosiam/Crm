-- BISWAJIT POWER HUB sales assistant
-- Run once in the Supabase SQL editor (or as the initial migration).
-- Safe to re-run: tables use IF NOT EXISTS, policies are dropped and recreated.
--
-- Security:
-- * Row Level Security is enabled on every table.
-- * The browser may use only the anon key. Never ship the secret admin key.
-- * Writes that touch more than one row go through security-definer functions.
--   Those functions check auth.uid() and membership themselves because they bypass RLS.
-- * Staff see customers assigned to them. Owners, and staff with can_view_all, see the whole business.
-- * Business settings, products, export-level user management, and deletes are owner-only.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  ad_landing_url text not null default '',
  address text not null default '',
  business_hours text not null default '',
  google_review_url text not null default '',
  join_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('OWNER', 'STAFF')),
  can_view_all boolean not null default false,
  notify_followups boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('model', 'battery')),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, kind, name)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  phone text not null,
  phone_normalized text not null check (phone_normalized ~ '^[6-9][0-9]{9}$'),
  status text not null check (status in ('NEW', 'FOLLOW_UP', 'TEST_RIDE', 'SOLD', 'LOST')),
  enquiry_date date not null default current_date,
  model text,
  battery_configuration text,
  budget text,
  source text,
  notes text,
  follow_up_date date,
  follow_up_time time,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  test_ride_date date,
  test_ride_time time,
  sale_amount numeric(12, 2),
  delivery_date date,
  lost_reason text,
  status_changed_at timestamptz not null default now(),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  scheduled_date date not null,
  scheduled_time time,
  completed_at timestamptz,
  status text not null check (status in ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_rides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  scheduled_date date not null,
  scheduled_time time,
  status text not null check (status in ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  model text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  model text,
  battery_configuration text,
  sale_amount numeric(12, 2),
  delivery_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  activity_type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists customers_org_status_idx on public.customers (organization_id, status);
create index if not exists customers_org_follow_up_idx on public.customers (organization_id, follow_up_date);
create index if not exists customers_org_phone_idx on public.customers (organization_id, phone_normalized);
create index if not exists customers_assigned_idx on public.customers (assigned_to);
create index if not exists customers_name_trgm_idx on public.customers using gin (name gin_trgm_ops);
create index if not exists customers_notes_trgm_idx on public.customers using gin (notes gin_trgm_ops);
create index if not exists follow_ups_customer_idx on public.follow_ups (customer_id, scheduled_date);
create index if not exists follow_ups_org_status_idx on public.follow_ups (organization_id, status, scheduled_date);
create index if not exists test_rides_org_date_idx on public.test_rides (organization_id, scheduled_date);
create index if not exists sales_org_created_idx on public.sales (organization_id, created_at);
create index if not exists activity_customer_idx on public.activity_logs (customer_id, created_at desc);
create index if not exists members_user_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create or replace function public.protect_profile_email()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.email = old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_email on public.profiles;
create trigger profiles_protect_email before update on public.profiles
for each row execute function public.protect_profile_email();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(digits) = 12 and left(digits, 2) = '91' then
    digits := substr(digits, 3);
  elsif length(digits) = 11 and left(digits, 1) = '0' then
    digits := substr(digits, 2);
  end if;
  if digits ~ '^[6-9][0-9]{9}$' then
    return digits;
  end if;
  return null;
end;
$$;

create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members
    where organization_id = p_org
      and user_id = auth.uid()
      and role = 'OWNER'
  );
$$;

create or replace function public.can_access_customer(c public.customers)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_org_owner(c.organization_id)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = c.organization_id
        and m.user_id = auth.uid()
        and m.can_view_all
    )
    or c.assigned_to = auth.uid()
  );
$$;

create or replace function public.assert_member(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'BPH_PERMISSION: Please sign in again.';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = auth.uid()
  ) then
    raise exception 'BPH_PERMISSION: You do not have access to this business.';
  end if;
end;
$$;

create or replace function public.assert_owner(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_member(p_org);
  if not public.is_org_owner(p_org) then
    raise exception 'BPH_PERMISSION: Only the owner can do that.';
  end if;
end;
$$;

create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    auth.uid(),
    coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), split_part(coalesce(auth.jwt() ->> 'email', 'owner'), '@', 1)),
    auth.jwt() ->> 'email'
  )
  on conflict (id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Business setup
-- ---------------------------------------------------------------------------

create or replace function public.create_business(
  p_name text,
  p_tagline text,
  p_phone text,
  p_email text,
  p_website text,
  p_ad_landing_url text,
  p_address text,
  p_business_hours text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  new_code text;
  model_names text[] := array[
    'Single Light', 'Dubbel Light', 'Dubbel Light Pro', 'GT-90 Ola', 'Activa Pro',
    'Zoom', 'Metrix 2.0', 'SPORTZ Pro', 'Blaze X'
  ];
  battery_names text[] := array['No Battery', 'Graphine (Acid)', 'Lithium Battery', 'Lithium Pro Battery'];
  i int;
begin
  if auth.uid() is null then
    raise exception 'BPH_PERMISSION: Please sign in again.';
  end if;
  perform public.ensure_profile();
  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'BPH_VALIDATION: You already belong to a business.';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'BPH_VALIDATION: Enter the business name.';
  end if;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.organizations where join_code = new_code);
  end loop;
  insert into public.organizations (
    id, name, tagline, phone, email, website, ad_landing_url, address, business_hours, join_code
  ) values (
    new_id, trim(p_name), coalesce(trim(p_tagline), ''), coalesce(trim(p_phone), ''),
    coalesce(trim(p_email), ''), coalesce(trim(p_website), ''), coalesce(trim(p_ad_landing_url), ''),
    coalesce(trim(p_address), ''), coalesce(trim(p_business_hours), ''), new_code
  );
  insert into public.organization_members (organization_id, user_id, role, can_view_all)
  values (new_id, auth.uid(), 'OWNER', true);
  for i in 1..array_length(model_names, 1) loop
    insert into public.products (organization_id, kind, name, sort_order)
    values (new_id, 'model', model_names[i], i - 1);
  end loop;
  for i in 1..array_length(battery_names, 1) loop
    insert into public.products (organization_id, kind, name, sort_order)
    values (new_id, 'battery', battery_names[i], i - 1);
  end loop;
  return new_id;
end;
$$;

create or replace function public.join_business(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'BPH_PERMISSION: Please sign in again.';
  end if;
  perform public.ensure_profile();
  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'BPH_VALIDATION: You already belong to a business.';
  end if;
  select id into org_id from public.organizations where join_code = upper(trim(coalesce(p_code, '')));
  if org_id is null then
    raise exception 'BPH_VALIDATION: That team code was not recognized.';
  end if;
  insert into public.organization_members (organization_id, user_id, role, can_view_all)
  values (org_id, auth.uid(), 'STAFF', false);
  return org_id;
end;
$$;

create or replace function public.update_business(
  p_name text,
  p_tagline text,
  p_phone text,
  p_email text,
  p_website text,
  p_ad_landing_url text,
  p_address text,
  p_business_hours text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_owner(org_id);
  if nullif(trim(p_name), '') is null then
    raise exception 'BPH_VALIDATION: Enter the business name.';
  end if;
  update public.organizations set
    name = trim(p_name),
    tagline = coalesce(trim(p_tagline), ''),
    phone = coalesce(trim(p_phone), ''),
    email = coalesce(trim(p_email), ''),
    website = coalesce(trim(p_website), ''),
    ad_landing_url = coalesce(trim(p_ad_landing_url), ''),
    address = coalesce(trim(p_address), ''),
    business_hours = coalesce(trim(p_business_hours), '')
  where id = org_id;
end;
$$;

create or replace function public.set_google_review_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  clean text := trim(coalesce(p_url, ''));
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_owner(org_id);
  if clean <> '' and clean !~* '^https://' then
    raise exception 'BPH_VALIDATION: The review link should start with https://';
  end if;
  update public.organizations set google_review_url = clean where id = org_id;
end;
$$;

create or replace function public.rotate_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  new_code text;
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_owner(org_id);
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.organizations where join_code = new_code);
  end loop;
  update public.organizations set join_code = new_code where id = org_id;
  return new_code;
end;
$$;

create or replace function public.update_member(p_member_id uuid, p_role text, p_can_view_all boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.organization_members;
  owner_count int;
begin
  select * into target from public.organization_members where id = p_member_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That teammate could not be found.';
  end if;
  perform public.assert_owner(target.organization_id);
  if p_role is not null and p_role not in ('OWNER', 'STAFF') then
    raise exception 'BPH_VALIDATION: Choose a valid role.';
  end if;
  select count(*) into owner_count from public.organization_members
  where organization_id = target.organization_id and role = 'OWNER';
  if target.role = 'OWNER' and coalesce(p_role, target.role) <> 'OWNER' and owner_count <= 1 then
    raise exception 'BPH_VALIDATION: The business needs at least one owner.';
  end if;
  update public.organization_members set
    role = coalesce(p_role, role),
    can_view_all = case when coalesce(p_role, role) = 'OWNER' then true else coalesce(p_can_view_all, can_view_all) end
  where id = p_member_id;
end;
$$;

create or replace function public.remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.organization_members;
  owner_count int;
begin
  select * into target from public.organization_members where id = p_member_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That teammate could not be found.';
  end if;
  perform public.assert_owner(target.organization_id);
  if target.user_id = auth.uid() then
    raise exception 'BPH_VALIDATION: You cannot remove yourself.';
  end if;
  select count(*) into owner_count from public.organization_members
  where organization_id = target.organization_id and role = 'OWNER';
  if target.role = 'OWNER' and owner_count <= 1 then
    raise exception 'BPH_VALIDATION: The business needs at least one owner.';
  end if;
  update public.customers set assigned_to = null
  where organization_id = target.organization_id and assigned_to = target.user_id;
  delete from public.organization_members where id = p_member_id;
end;
$$;

create or replace function public.set_my_notifications(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'BPH_PERMISSION: Please sign in again.';
  end if;
  update public.organization_members set notify_followups = coalesce(p_enabled, true)
  where user_id = auth.uid();
end;
$$;

create or replace function public.upsert_product(
  p_id uuid,
  p_kind text,
  p_name text,
  p_sort_order integer,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  clean text := trim(coalesce(p_name, ''));
  new_id uuid := coalesce(p_id, gen_random_uuid());
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_owner(org_id);
  if p_kind not in ('model', 'battery') then
    raise exception 'BPH_VALIDATION: Choose a product type.';
  end if;
  if clean = '' then
    raise exception 'BPH_VALIDATION: Enter a name.';
  end if;
  if exists (
    select 1 from public.products
    where organization_id = org_id and kind = p_kind and lower(name) = lower(clean) and id <> new_id
  ) then
    raise exception 'BPH_VALIDATION: That name is already in the list.';
  end if;
  insert into public.products (id, organization_id, kind, name, sort_order, active)
  values (new_id, org_id, p_kind, clean, coalesce(p_sort_order, 0), coalesce(p_active, true))
  on conflict (id) do update set
    name = excluded.name,
    active = excluded.active,
    sort_order = excluded.sort_order;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create or replace function public.find_customer_by_phone(p_phone text)
returns table (customer_id uuid, customer_name text, is_visible boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  normalized text;
  found public.customers;
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_member(org_id);
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    return;
  end if;
  select * into found from public.customers
  where organization_id = org_id and phone_normalized = normalized
  limit 1;
  if not found then
    return;
  end if;
  if public.can_access_customer(found) then
    customer_id := found.id;
    customer_name := found.name;
    is_visible := true;
    return next;
  else
    customer_id := null;
    customer_name := null;
    is_visible := false;
    return next;
  end if;
end;
$$;

create or replace function public.create_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_status text,
  p_enquiry_date date,
  p_model text,
  p_battery text,
  p_budget text,
  p_source text,
  p_notes text,
  p_follow_up_date date,
  p_follow_up_time time,
  p_assigned_to uuid,
  p_allow_duplicate boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  new_id uuid := coalesce(p_id, gen_random_uuid());
  normalized text;
  existing_id uuid;
  next_status text;
  assignee uuid;
begin
  select organization_id into org_id from public.organization_members where user_id = auth.uid() limit 1;
  perform public.assert_member(org_id);
  if exists (select 1 from public.customers where id = new_id) then
    return new_id;
  end if;
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    raise exception 'BPH_VALIDATION: Enter a valid 10-digit mobile number.';
  end if;
  if coalesce(p_status, 'NEW') not in ('NEW', 'FOLLOW_UP', 'TEST_RIDE') then
    raise exception 'BPH_VALIDATION: Save the customer first, then mark sold or lost.';
  end if;
  select id into existing_id from public.customers
  where organization_id = org_id and phone_normalized = normalized
  limit 1;
  if existing_id is not null and not coalesce(p_allow_duplicate, false) then
    if exists (select 1 from public.customers c where c.id = existing_id and public.can_access_customer(c)) then
      raise exception 'BPH_DUPLICATE: %', existing_id;
    end if;
    raise exception 'BPH_DUPLICATE:';
  end if;
  assignee := coalesce(p_assigned_to, auth.uid());
  if assignee is not null and not exists (
    select 1 from public.organization_members where organization_id = org_id and user_id = assignee
  ) then
    raise exception 'BPH_VALIDATION: Choose a salesperson from the team.';
  end if;
  next_status := coalesce(p_status, case when p_follow_up_date is not null then 'FOLLOW_UP' else 'NEW' end);
  if p_follow_up_date is not null and next_status = 'NEW' then
    next_status := 'FOLLOW_UP';
  end if;
  insert into public.customers (
    id, organization_id, name, phone, phone_normalized, status, enquiry_date, model,
    battery_configuration, budget, source, notes, follow_up_date, follow_up_time,
    assigned_to, created_by, status_changed_at
  ) values (
    new_id, org_id, trim(coalesce(p_name, '')), normalized, normalized, next_status,
    coalesce(p_enquiry_date, current_date), nullif(trim(coalesce(p_model, '')), ''),
    nullif(trim(coalesce(p_battery, '')), ''), nullif(trim(coalesce(p_budget, '')), ''),
    nullif(trim(coalesce(p_source, '')), ''), nullif(trim(coalesce(p_notes, '')), ''),
    p_follow_up_date, p_follow_up_time, assignee, auth.uid(), now()
  );
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (org_id, new_id, auth.uid(), 'CREATED', 'Customer added');
  if p_follow_up_date is not null then
    insert into public.follow_ups (
      organization_id, customer_id, assigned_to, scheduled_date, scheduled_time, status, created_by
    ) values (
      org_id, new_id, assignee, p_follow_up_date, p_follow_up_time, 'SCHEDULED', auth.uid()
    );
    insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
    values (org_id, new_id, auth.uid(), 'FOLLOW_UP_SCHEDULED', 'Follow-up scheduled');
  end if;
  return new_id;
end;
$$;

create or replace function public.update_customer(
  p_id uuid,
  p_name text,
  p_phone text,
  p_status text,
  p_enquiry_date date,
  p_model text,
  p_battery text,
  p_budget text,
  p_source text,
  p_notes text,
  p_assigned_to uuid,
  p_allow_duplicate boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  normalized text;
  existing_id uuid;
begin
  select * into current from public.customers where id = p_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  perform public.assert_member(current.organization_id);
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if p_status is not null and p_status not in ('NEW', 'FOLLOW_UP', 'TEST_RIDE') then
    raise exception 'BPH_VALIDATION: Use the sold or lost action for that status.';
  end if;
  normalized := public.normalize_phone(p_phone);
  if normalized is null then
    raise exception 'BPH_VALIDATION: Enter a valid 10-digit mobile number.';
  end if;
  select id into existing_id from public.customers
  where organization_id = current.organization_id and phone_normalized = normalized and id <> current.id
  limit 1;
  if existing_id is not null and not coalesce(p_allow_duplicate, false) then
    raise exception 'BPH_DUPLICATE: %', existing_id;
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.organization_members
    where organization_id = current.organization_id and user_id = p_assigned_to
  ) then
    raise exception 'BPH_VALIDATION: Choose a salesperson from the team.';
  end if;
  update public.customers set
    name = trim(coalesce(p_name, '')),
    phone = normalized,
    phone_normalized = normalized,
    status = coalesce(p_status, status),
    status_changed_at = case when p_status is not null and p_status <> status then now() else status_changed_at end,
    enquiry_date = coalesce(p_enquiry_date, enquiry_date),
    model = nullif(trim(coalesce(p_model, '')), ''),
    battery_configuration = nullif(trim(coalesce(p_battery, '')), ''),
    budget = nullif(trim(coalesce(p_budget, '')), ''),
    source = nullif(trim(coalesce(p_source, '')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    assigned_to = p_assigned_to
  where id = current.id;
  if p_status is not null and p_status <> current.status then
    insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
    values (current.organization_id, current.id, auth.uid(), 'STATUS', 'Status changed to ' || p_status);
  end if;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (current.organization_id, current.id, auth.uid(), 'UPDATED', 'Customer details updated');
end;
$$;

create or replace function public.schedule_follow_up(
  p_customer_id uuid,
  p_date date,
  p_time time,
  p_notes text,
  p_assigned_to uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  open_id uuid;
  assignee uuid;
begin
  select * into current from public.customers where id = p_customer_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if current.status in ('SOLD', 'LOST') then
    raise exception 'BPH_VALIDATION: Change the status before scheduling this.';
  end if;
  if p_date is null then
    raise exception 'BPH_VALIDATION: Choose a valid follow-up date.';
  end if;
  assignee := coalesce(p_assigned_to, current.assigned_to);
  select id into open_id from public.follow_ups
  where customer_id = current.id and status = 'SCHEDULED'
  order by created_at desc
  limit 1;
  if open_id is null then
    insert into public.follow_ups (
      organization_id, customer_id, assigned_to, scheduled_date, scheduled_time, status, notes, created_by
    ) values (
      current.organization_id, current.id, assignee, p_date, p_time, 'SCHEDULED', nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
    )
    returning id into open_id;
    insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
    values (current.organization_id, current.id, auth.uid(), 'FOLLOW_UP_SCHEDULED', 'Follow-up scheduled');
  else
    update public.follow_ups set
      scheduled_date = p_date,
      scheduled_time = p_time,
      assigned_to = assignee,
      notes = case when p_notes is null then notes else nullif(trim(p_notes), '') end
    where id = open_id;
    insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
    values (current.organization_id, current.id, auth.uid(), 'FOLLOW_UP_RESCHEDULED', 'Follow-up rescheduled');
  end if;
  update public.customers set
    status = case when status = 'NEW' then 'FOLLOW_UP' else status end,
    status_changed_at = case when status = 'NEW' then now() else status_changed_at end,
    follow_up_date = p_date,
    follow_up_time = p_time
  where id = current.id;
  return open_id;
end;
$$;

create or replace function public.complete_follow_up(p_customer_id uuid, p_follow_up_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  open_id uuid;
begin
  select * into current from public.customers where id = p_customer_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  select id into open_id from public.follow_ups
  where customer_id = current.id
    and status = 'SCHEDULED'
    and (p_follow_up_id is null or id = p_follow_up_id)
  order by created_at desc
  limit 1;
  if open_id is null then
    return;
  end if;
  update public.follow_ups set status = 'COMPLETED', completed_at = now() where id = open_id;
  update public.customers set follow_up_date = null, follow_up_time = null where id = current.id;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (current.organization_id, current.id, auth.uid(), 'FOLLOW_UP_COMPLETED', 'Follow-up completed');
end;
$$;

create or replace function public.schedule_test_ride(
  p_customer_id uuid,
  p_date date,
  p_time time,
  p_model text,
  p_notes text,
  p_assigned_to uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  open_id uuid;
  assignee uuid;
  model_name text;
begin
  select * into current from public.customers where id = p_customer_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if current.status in ('SOLD', 'LOST') then
    raise exception 'BPH_VALIDATION: Change the status before scheduling this.';
  end if;
  if p_date is null then
    raise exception 'BPH_VALIDATION: Choose a valid test ride date.';
  end if;
  assignee := coalesce(p_assigned_to, current.assigned_to, auth.uid());
  model_name := coalesce(nullif(trim(coalesce(p_model, '')), ''), current.model);
  select id into open_id from public.test_rides
  where customer_id = current.id and status = 'SCHEDULED'
  limit 1;
  if open_id is null then
    insert into public.test_rides (
      organization_id, customer_id, assigned_to, scheduled_date, scheduled_time, status, model, notes, created_by
    ) values (
      current.organization_id, current.id, assignee, p_date, p_time, 'SCHEDULED', model_name,
      nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
    ) returning id into open_id;
  else
    update public.test_rides set
      scheduled_date = p_date,
      scheduled_time = p_time,
      assigned_to = assignee,
      model = model_name,
      notes = case when p_notes is null then notes else nullif(trim(p_notes), '') end
    where id = open_id;
  end if;
  update public.customers set
    status = 'TEST_RIDE',
    status_changed_at = case when status = 'TEST_RIDE' then status_changed_at else now() end,
    test_ride_date = p_date,
    test_ride_time = p_time,
    model = coalesce(model_name, model)
  where id = current.id;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (current.organization_id, current.id, auth.uid(), 'TEST_RIDE_SCHEDULED', 'Test ride scheduled');
  return open_id;
end;
$$;

create or replace function public.set_test_ride_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ride public.test_rides;
  current public.customers;
begin
  if p_status not in ('COMPLETED', 'CANCELLED') then
    raise exception 'BPH_VALIDATION: Choose completed or cancelled.';
  end if;
  select * into ride from public.test_rides where id = p_id;
  if not found then
    return;
  end if;
  select * into current from public.customers where id = ride.customer_id;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if ride.status <> 'SCHEDULED' then
    return;
  end if;
  update public.test_rides set status = p_status where id = ride.id;
  if p_status = 'CANCELLED' then
    update public.customers set test_ride_date = null, test_ride_time = null where id = current.id;
  end if;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (
    current.organization_id,
    current.id,
    auth.uid(),
    case when p_status = 'COMPLETED' then 'TEST_RIDE_COMPLETED' else 'TEST_RIDE_CANCELLED' end,
    case when p_status = 'COMPLETED' then 'Test ride completed' else 'Test ride cancelled' end
  );
end;
$$;

create or replace function public.record_sale(
  p_sale_id uuid,
  p_customer_id uuid,
  p_model text,
  p_battery text,
  p_sale_amount numeric,
  p_delivery_date date,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  new_id uuid := coalesce(p_sale_id, gen_random_uuid());
  model_name text;
  battery_name text;
begin
  if exists (select 1 from public.sales where id = new_id) then
    return new_id;
  end if;
  select * into current from public.customers where id = p_customer_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if p_sale_amount is not null and p_sale_amount < 0 then
    raise exception 'BPH_VALIDATION: Enter a valid sale amount, or leave it blank.';
  end if;
  model_name := coalesce(nullif(trim(coalesce(p_model, '')), ''), current.model);
  battery_name := coalesce(nullif(trim(coalesce(p_battery, '')), ''), current.battery_configuration);
  insert into public.sales (
    id, organization_id, customer_id, model, battery_configuration, sale_amount, delivery_date, notes, created_by
  ) values (
    new_id, current.organization_id, current.id, model_name, battery_name, p_sale_amount, p_delivery_date,
    nullif(trim(coalesce(p_notes, '')), ''), auth.uid()
  );
  update public.follow_ups set status = 'COMPLETED', completed_at = now()
  where customer_id = current.id and status = 'SCHEDULED';
  update public.customers set
    status = 'SOLD',
    status_changed_at = now(),
    model = model_name,
    battery_configuration = battery_name,
    sale_amount = p_sale_amount,
    delivery_date = p_delivery_date,
    follow_up_date = null,
    follow_up_time = null,
    lost_reason = null
  where id = current.id;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (current.organization_id, current.id, auth.uid(), 'SOLD', 'Marked sold');
  return new_id;
end;
$$;

create or replace function public.mark_lost(p_customer_id uuid, p_reason text, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
  reason text := trim(coalesce(p_reason, ''));
begin
  select * into current from public.customers where id = p_customer_id;
  if not found then
    raise exception 'BPH_NOT_FOUND: That customer could not be found.';
  end if;
  if not public.can_access_customer(current) then
    raise exception 'BPH_PERMISSION: You do not have access to this customer.';
  end if;
  if current.status = 'LOST' then
    return;
  end if;
  if reason = '' then
    raise exception 'BPH_VALIDATION: Choose a reason.';
  end if;
  update public.follow_ups set status = 'COMPLETED', completed_at = now()
  where customer_id = current.id and status = 'SCHEDULED';
  update public.test_rides set status = 'CANCELLED'
  where customer_id = current.id and status = 'SCHEDULED';
  update public.customers set
    status = 'LOST',
    status_changed_at = now(),
    lost_reason = reason,
    notes = case
      when nullif(trim(coalesce(p_notes, '')), '') is null then notes
      when notes is null then trim(p_notes)
      else notes || E'\n' || trim(p_notes)
    end,
    follow_up_date = null,
    follow_up_time = null,
    test_ride_date = null,
    test_ride_time = null
  where id = current.id;
  insert into public.activity_logs (organization_id, customer_id, user_id, activity_type, description)
  values (current.organization_id, current.id, auth.uid(), 'LOST', 'Marked lost · ' || reason);
end;
$$;

create or replace function public.delete_customer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current public.customers;
begin
  select * into current from public.customers where id = p_id;
  if not found then
    return;
  end if;
  perform public.assert_owner(current.organization_id);
  delete from public.customers where id = current.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.follow_ups enable row level security;
alter table public.test_rides enable row level security;
alter table public.sales enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (id in (select public.current_user_org_ids()));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update to authenticated
using (public.is_org_owner(id))
with check (public.is_org_owner(id));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or id in (
    select m.user_id from public.organization_members m
    where m.organization_id in (select public.current_user_org_ids())
  )
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members
for select to authenticated
using (
  user_id = auth.uid()
  or organization_id in (select public.current_user_org_ids())
);

drop policy if exists products_select on public.products;
create policy products_select on public.products
for select to authenticated
using (organization_id in (select public.current_user_org_ids()));

drop policy if exists products_write on public.products;
create policy products_write on public.products
for all to authenticated
using (public.is_org_owner(organization_id))
with check (public.is_org_owner(organization_id));

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
for select to authenticated
using (public.can_access_customer(customers));

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
for insert to authenticated
with check (
  created_by = auth.uid()
  and organization_id in (select public.current_user_org_ids())
);

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
for update to authenticated
using (public.can_access_customer(customers))
with check (
  organization_id in (select public.current_user_org_ids())
  and public.can_access_customer(customers)
);

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
for delete to authenticated
using (public.is_org_owner(organization_id));

drop policy if exists follow_ups_select on public.follow_ups;
create policy follow_ups_select on public.follow_ups
for select to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = follow_ups.customer_id
  )
);

drop policy if exists follow_ups_write on public.follow_ups;
create policy follow_ups_write on public.follow_ups
for all to authenticated
using (
  exists (select 1 from public.customers c where c.id = follow_ups.customer_id)
)
with check (
  organization_id in (select public.current_user_org_ids())
  and exists (
    select 1 from public.customers c
    where c.id = customer_id and c.organization_id = follow_ups.organization_id
  )
);

drop policy if exists test_rides_select on public.test_rides;
create policy test_rides_select on public.test_rides
for select to authenticated
using (exists (select 1 from public.customers c where c.id = test_rides.customer_id));

drop policy if exists test_rides_write on public.test_rides;
create policy test_rides_write on public.test_rides
for all to authenticated
using (exists (select 1 from public.customers c where c.id = test_rides.customer_id))
with check (
  organization_id in (select public.current_user_org_ids())
  and exists (
    select 1 from public.customers c
    where c.id = customer_id and c.organization_id = test_rides.organization_id
  )
);

drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
for select to authenticated
using (exists (select 1 from public.customers c where c.id = sales.customer_id));

drop policy if exists sales_write on public.sales;
create policy sales_write on public.sales
for all to authenticated
using (exists (select 1 from public.customers c where c.id = sales.customer_id))
with check (
  organization_id in (select public.current_user_org_ids())
  and exists (
    select 1 from public.customers c
    where c.id = customer_id and c.organization_id = sales.organization_id
  )
);

drop policy if exists activity_select on public.activity_logs;
create policy activity_select on public.activity_logs
for select to authenticated
using (exists (select 1 from public.customers c where c.id = activity_logs.customer_id));

drop policy if exists activity_insert on public.activity_logs;
create policy activity_insert on public.activity_logs
for insert to authenticated
with check (
  user_id = auth.uid()
  and organization_id in (select public.current_user_org_ids())
  and exists (
    select 1 from public.customers c
    where c.id = customer_id and c.organization_id = activity_logs.organization_id
  )
);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.customers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.follow_ups;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.test_rides;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sales;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.activity_logs;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.organizations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.organization_members;
  exception when duplicate_object then null;
  end;
end;
$$;
