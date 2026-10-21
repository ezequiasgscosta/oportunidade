create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  artist text not null check (char_length(artist) between 1 and 120),
  category text not null check (char_length(category) between 1 and 40),
  audio_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index tracks_status_created_at_idx on public.tracks (status, created_at desc);
create index tracks_submitted_by_created_at_idx on public.tracks (submitted_by, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.user_roles enable row level security;
alter table public.tracks enable row level security;

create policy "Users can read their own role"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Approved and owned tracks are readable"
  on public.tracks for select to anon, authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select public.is_admin())
  );

create policy "Authenticated users can submit pending tracks"
  on public.tracks for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and (storage.foldername(audio_path))[1] = (select auth.uid())::text
  );

create policy "Admins can manage all tracks"
  on public.tracks for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.user_roles to authenticated;
grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-audio',
  'music-audio',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac', 'audio/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can listen to music audio"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'music-audio'
    and (
      exists (
        select 1
        from public.tracks
        where tracks.audio_path = objects.name
          and tracks.status = 'approved'
      )
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

create policy "Users can upload audio to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'music-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can remove unregistered uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'music-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.tracks where audio_path = name
    )
  );

create policy "Admins can delete music audio"
  on storage.objects for delete to authenticated
  using (bucket_id = 'music-audio' and (select public.is_admin()));