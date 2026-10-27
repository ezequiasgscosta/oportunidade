create policy "Admins can delete site suggestions"
  on public.site_suggestions for delete to authenticated
  using ((select public.is_admin()));

grant delete on public.site_suggestions to authenticated;
