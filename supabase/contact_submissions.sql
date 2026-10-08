create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null check (submission_type in ('general', 'report', 'suggest', 'feedback')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null check (char_length(subject) between 1 and 200),
  listing_url text,
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

revoke all on table public.contact_submissions from anon, authenticated;
grant insert on table public.contact_submissions to anon, authenticated;

drop policy if exists "Allow contact form submissions" on public.contact_submissions;
create policy "Allow contact form submissions"
  on public.contact_submissions
  for insert
  to anon, authenticated
  with check (
    submission_type in ('general', 'report', 'suggest', 'feedback')
    and char_length(name) between 1 and 120
    and char_length(email) between 3 and 254
    and char_length(subject) between 1 and 200
    and char_length(message) between 1 and 5000
  );
