-- Run in the Supabase SQL Editor after the opportunities and saved-opportunities
-- tables have been created. This script replaces existing policies on both tables.

alter table public.opportunities enable row level security;
alter table public.user_saved_opportunities enable row level security;

revoke all on public.opportunities from public, anon, authenticated;
grant select on public.opportunities to anon, authenticated;
grant insert, update, delete on public.opportunities to authenticated;

revoke all on public.user_saved_opportunities from public, anon, authenticated;
grant select, insert, delete on public.user_saved_opportunities to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('opportunities', 'user_saved_opportunities')
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

create policy "Public can read published opportunities"
  on public.opportunities
  for select
  to anon, authenticated
  using (is_published = true);

create policy "Providers can read their own opportunities"
  on public.opportunities
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  );

create policy "Verified providers can insert opportunities"
  on public.opportunities
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
        and is_verified = true
        and organization_name = opportunities.organization_name
    )
  );

create policy "Providers can update their own opportunities"
  on public.opportunities
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  );

create policy "Providers can delete their own opportunities"
  on public.opportunities
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  );

create policy "Youth can read their own saved opportunities"
  on public.user_saved_opportunities
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role in ('high_school_student', 'youth_user')
    )
  );

create policy "Youth can save opportunities to their account"
  on public.user_saved_opportunities
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role in ('high_school_student', 'youth_user')
    )
  );

create policy "Youth can remove their own saved opportunities"
  on public.user_saved_opportunities
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role in ('high_school_student', 'youth_user')
    )
  );
