-- Function to allow admin to delete users
create or replace function public.delete_user_by_admin(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Confirm the caller is the admin
  select auth.jwt()->>'email' = 'facundo.lobos90@gmail.com' into is_admin;
  
  if not is_admin then
    raise exception 'Unauthorized: Only admin can delete users.';
  end if;

  -- Delete the user from auth.users (this cascades to profiles, clubs, etc.)
  delete from auth.users where id = user_id;
end;
$$;
