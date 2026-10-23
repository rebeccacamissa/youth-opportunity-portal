-- Provider dashboard data and reporting. Run after auth_roles_and_saved.sql.

create table if not exists public.provider_business_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sponsorship_budget numeric(14, 2) check (sponsorship_budget is null or sponsorship_budget >= 0),
  available_slots integer check (available_slots is null or available_slots >= 0),
  funding_criteria text not null default '',
  eligibility_rules text not null default '',
  business_bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop policy if exists "Providers can read their own opportunities"
  on public.opportunities;
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

alter table public.provider_business_profiles enable row level security;
revoke all on public.provider_business_profiles from public, anon, authenticated;
grant select, insert, update on public.provider_business_profiles to authenticated;

drop policy if exists "Providers manage their own dashboard profile"
  on public.provider_business_profiles;
create policy "Providers manage their own dashboard profile"
  on public.provider_business_profiles
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'community_provider'
    )
  );

create or replace function public.provider_dashboard_metrics()
returns table(active_listings bigint, student_engagement bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.opportunities o
      where o.owner_id = (select auth.uid())
        and o.is_published = true 
        and o.closingdate >= current_date
    ),
    (
      select count(*)
      from public.user_saved_opportunities s
      join public.opportunities o on o.id::text = s.opportunity_id
      where o.owner_id = (select auth.uid())
        and o.is_published = true 
    )
  where exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'community_provider'
  );
$$;

revoke all on function public.provider_dashboard_metrics() from public, anon;
grant execute on function public.provider_dashboard_metrics() to authenticated;
