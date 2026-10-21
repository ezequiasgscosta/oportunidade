do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where lower(email) = 'bieldotor@gmail.com';

  if admin_user_id is null then
    raise exception 'Create and confirm the admin account before running this script.';
  end if;

  insert into public.user_roles (user_id, role)
  values (admin_user_id, 'admin')
  on conflict (user_id) do update set role = excluded.role;
end;
$$;