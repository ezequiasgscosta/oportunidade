create or replace function public.admin_dashboard_stats()
returns table (
  total_users bigint,
  total_tracks bigint,
  approved_tracks bigint,
  pending_tracks bigint,
  rejected_tracks bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    (select count(*) from auth.users),
    count(*)::bigint,
    count(*) filter (where tracks.status = 'approved')::bigint,
    count(*) filter (where tracks.status = 'pending')::bigint,
    count(*) filter (where tracks.status = 'rejected')::bigint
  from public.tracks;
end;
$$;

create or replace function public.admin_list_admins()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
  select roles.user_id, users.email::text, roles.created_at
  from public.user_roles as roles
  join auth.users as users on users.id = roles.user_id
  where roles.role = 'admin'
  order by roles.created_at asc;
end;
$$;

create or replace function public.admin_set_role(p_email text, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  admin_count bigint;
begin
  if not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required';
  end if;

  select users.id
  into target_user_id
  from auth.users as users
  where lower(users.email) = lower(trim(p_email));

  if target_user_id is null then
    raise exception 'No user exists with that email';
  end if;

  if p_is_admin then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id) do update set role = excluded.role;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('admin-role-management', 0));

  if exists (select 1 from public.user_roles where user_id = target_user_id) then
    select count(*)
    into admin_count
    from public.user_roles
    where role = 'admin';

    if admin_count <= 1 then
      raise exception 'Cannot remove the last administrator';
    end if;

    delete from public.user_roles where user_id = target_user_id;
  end if;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_list_admins() from public;
revoke all on function public.admin_set_role(text, boolean) from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_set_role(text, boolean) to authenticated;