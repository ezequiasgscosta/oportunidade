create table public.site_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewed')),
  created_at timestamptz not null default now()
);

create index site_suggestions_status_created_at_idx
  on public.site_suggestions (status, created_at desc);

alter table public.site_suggestions enable row level security;

create policy "Authenticated users can submit site suggestions"
  on public.site_suggestions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins can read site suggestions"
  on public.site_suggestions for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update site suggestions"
  on public.site_suggestions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.site_suggestions to authenticated;
