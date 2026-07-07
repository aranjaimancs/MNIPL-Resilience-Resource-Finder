-- Allow mnipl_admin to delete any hub (verified or not)
create policy "hubs: mnipl_admin delete"
  on hubs for delete
  to authenticated
  using (is_mnipl_admin());
