create table public.site_visits (
  visitor_id uuid not null,
  visited_on date not null,
  primary key (visitor_id, visited_on)
);

alter table public.site_visits enable row level security;
revoke all on table public.site_visits from anon, authenticated;

create or replace function public.record_site_visit(p_visitor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor_id is null then
    raise exception 'Visitor ID is required';
  end if;

  insert into public.site_visits (visitor_id, visited_on)
  values (p_visitor_id, (pg_catalog.now() at time zone 'America/Sao_Paulo')::date)
  on conflict (visitor_id, visited_on) do nothing;
end;
$$;

create or replace function public.admin_site_visit_stats()
returns table (
  visit_date date,
  unique_visitors bigint,
  period_unique_visitors bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (pg_catalog.now() at time zone 'America/Sao_Paulo')::date;
begin
  if not (select public.is_admin()) then
    raise exception 'Not authorized';
  end if;

  return query
  with dates as (
    select generate_series(today - 29, today, interval '1 day')::date as visit_date
  ),
  daily_visitors as (
    select visits.visited_on, count(*)::bigint as visitor_count
    from public.site_visits as visits
    where visits.visited_on between today - 29 and today
    group by visits.visited_on
  ),
  period_visitors as (
    select count(distinct visits.visitor_id)::bigint as visitor_count
    from public.site_visits as visits
    where visits.visited_on between today - 29 and today
  )
  select
    dates.visit_date,
    coalesce(daily_visitors.visitor_count, 0)::bigint,
    period_visitors.visitor_count
  from dates
  cross join period_visitors
  left join daily_visitors on daily_visitors.visited_on = dates.visit_date
  order by dates.visit_date;
end;
$$;

revoke all on function public.record_site_visit(uuid) from public;
revoke all on function public.admin_site_visit_stats() from public;
grant execute on function public.record_site_visit(uuid) to anon, authenticated;
grant execute on function public.admin_site_visit_stats() to authenticated;
