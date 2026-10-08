-- Run in the Supabase SQL Editor. Provider verification is deliberately an
-- administrator-only database action; users cannot update their own role or
-- verification flag through the browser client.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'youth_user'
    check (role in ('youth_user', 'community_provider')),
  organization_name text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists role text default 'youth_user',
  add column if not exists organization_name text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

update public.profiles p
set full_name = coalesce(
      nullif(btrim(p.full_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'Portal user'
    ),
    email = coalesce(nullif(p.email, ''), u.email, ''),
    role = case
      when p.role in ('youth_user', 'community_provider') then p.role
      else 'youth_user'
    end
from auth.users u
where p.id = u.id;

alter table public.profiles
  alter column full_name set not null,
  alter column email set not null,
  alter column role set default 'youth_user',
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists provider_requires_organization;
alter table public.profiles
  add constraint profiles_role_check
    check (role in ('youth_user', 'community_provider'));

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

do $$
declare
  existing_policy text;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', existing_policy);
  end loop;
end;
$$;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  requested_organization text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  requested_organization := nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), '');

  if requested_role is null or requested_role not in ('youth_user', 'community_provider') then
    requested_role := 'youth_user';
  end if;

  insert into public.profiles (id, full_name, email, role, organization_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    requested_role,
    case when requested_role = 'community_provider' then requested_organization else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_portal_profile on auth.users;
create trigger on_auth_user_created_portal_profile
  after insert on auth.users
  for each row execute function public.handle_new_portal_user();

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  organization_name text not null,
  category text not null,
  location text not null,
  closing_date date not null,
  experience_level text,
  stipend text,
  short_description text,
  description text not null,
  requirements jsonb not null default '[]'::jsonb,
  application_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The portal may already have an older opportunities table. Keep its existing
-- IDs and data, while adding the fields used by the provider posting form.
alter table public.opportunities
  add column if not exists organization_name text,
  add column if not exists closing_date date,
  add column if not exists experience_level text,
  add column if not exists short_description text,
  add column if not exists application_url text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'opportunities'
      and column_name = 'organization'
  ) then
    execute $migration$
      update public.opportunities
      set organization_name = organization
      where organization_name is null
        and nullif(btrim(organization), '') is not null
    $migration$;
  end if;
end;
$$;

alter table public.opportunities
  drop constraint if exists opportunities_post_fields_check;
alter table public.opportunities
  add constraint opportunities_post_fields_check
    check (
      nullif(btrim(title), '') is not null
      and nullif(btrim(category), '') is not null
      and nullif(btrim(organization_name), '') is not null
      and nullif(btrim(location), '') is not null
      and nullif(btrim(description), '') is not null
      and requirements is not null
      and closing_date is not null
      and application_url ~ '^https://'
    ) not valid;

alter table public.opportunities enable row level security;
revoke all on public.opportunities from public, anon, authenticated;
grant select on public.opportunities to anon, authenticated;
grant insert, update, delete on public.opportunities to authenticated;

-- Remove legacy permissive policies so they cannot OR-bypass these verified
-- provider policies after this migration is applied.
do $$
declare
  existing_policy text;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
  loop
    execute format('drop policy %I on public.opportunities', existing_policy);
  end loop;
end;
$$;

drop policy if exists "Anyone can read opportunities" on public.opportunities;
create policy "Anyone can read opportunities"
  on public.opportunities
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Verified providers can publish opportunities" on public.opportunities;
create policy "Verified providers can publish opportunities"
  on public.opportunities
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and nullif(btrim(title), '') is not null
    and nullif(btrim(category), '') is not null
    and nullif(btrim(location), '') is not null
    and nullif(btrim(description), '') is not null
    and requirements is not null
    and closing_date is not null
    and application_url ~ '^https://'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'community_provider'
        and p.is_verified
        and p.organization_name = opportunities.organization_name
    )
  );

drop policy if exists "Verified providers can edit their opportunities" on public.opportunities;
create policy "Verified providers can edit their opportunities"
  on public.opportunities
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'community_provider'
        and p.is_verified
        and p.organization_name = opportunities.organization_name
    )
  )
  with check (
    owner_id = (select auth.uid())
    and nullif(btrim(title), '') is not null
    and nullif(btrim(category), '') is not null
    and nullif(btrim(location), '') is not null
    and nullif(btrim(description), '') is not null
    and requirements is not null
    and closing_date is not null
    and application_url ~ '^https://'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'community_provider'
        and p.is_verified
        and p.organization_name = opportunities.organization_name
    )
  );

drop policy if exists "Verified providers can remove their opportunities" on public.opportunities;
create policy "Verified providers can remove their opportunities"
  on public.opportunities
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'community_provider'
        and p.is_verified
        and p.organization_name = opportunities.organization_name
    )
  );

create table if not exists public.user_saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

alter table public.user_saved_opportunities enable row level security;
revoke all on public.user_saved_opportunities from public, anon, authenticated;
grant select, insert, update, delete on public.user_saved_opportunities to authenticated;

do $$
declare
  existing_policy text;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_saved_opportunities'
  loop
    execute format('drop policy %I on public.user_saved_opportunities', existing_policy);
  end loop;
end;
$$;

drop policy if exists "Youth can read their own saved opportunities" on public.user_saved_opportunities;
create policy "Youth can read their own saved opportunities"
  on public.user_saved_opportunities
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'youth_user'
    )
  );

drop policy if exists "Youth can save opportunities to their account" on public.user_saved_opportunities;
create policy "Youth can save opportunities to their account"
  on public.user_saved_opportunities
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'youth_user'
    )
  );

drop policy if exists "Youth can remove their own saved opportunities" on public.user_saved_opportunities;
create policy "Youth can remove their own saved opportunities"
  on public.user_saved_opportunities
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'youth_user'
    )
  );

drop policy if exists "Youth can update their own saved opportunities" on public.user_saved_opportunities;
create policy "Youth can update their own saved opportunities"
  on public.user_saved_opportunities
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'youth_user'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'youth_user'
    )
  );

-- Verify a provider manually in the Supabase SQL Editor after review:
-- update public.profiles
-- set is_verified = true
-- where email = 'provider@example.org'
--   and role = 'community_provider';
