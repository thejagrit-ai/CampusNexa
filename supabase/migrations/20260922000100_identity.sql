-- Phase 1: identities and organizations. Apply before switching application auth.
begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  full_name text not null default '',
  avatar_url text,
  role text not null default 'student' check (role in
    ('student', 'faculty', 'college_admin', 'placement_officer', 'recruiter', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_organization_role_idx on public.profiles (organization_id, role);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
revoke all on public.organizations, public.profiles from anon, authenticated;
grant select on public.organizations, public.profiles to authenticated;
-- Privileged fields may only be changed by trusted server-side administration.
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant all on public.organizations, public.profiles to service_role;

create function public.current_erp_identity()
returns table (organization_id uuid, role text)
language sql stable security definer set search_path = ''
as $$
  select p.organization_id, p.role from public.profiles p
  where p.id = auth.uid() and p.status = 'active';
$$;
revoke all on function public.current_erp_identity() from public;
grant execute on function public.current_erp_identity() to authenticated;

create policy profiles_read on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1 from public.current_erp_identity() me
    where me.role = 'super_admin' or
      (me.organization_id = profiles.organization_id and
       me.role in ('college_admin', 'faculty', 'placement_officer'))
  )
);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() and status = 'active')
with check (id = auth.uid() and status = 'active');
create policy organizations_read on public.organizations for select to authenticated
using (exists (
  select 1 from public.current_erp_identity() me
  where me.role = 'super_admin' or me.organization_id = organizations.id
));

create function public.erp_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles
for each row execute function public.erp_touch_updated_at();
create trigger organizations_updated before update on public.organizations
for each row execute function public.erp_touch_updated_at();

-- Never trust client-supplied role/organization metadata during signup.
create function public.erp_on_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200));
  return new;
end;
$$;
revoke all on function public.erp_on_signup() from public;
create trigger erp_auth_user_created after insert on auth.users
for each row execute function public.erp_on_signup();

-- Also handle accounts created before this migration.
insert into public.profiles (id, full_name)
select id, left(coalesce(raw_user_meta_data ->> 'full_name', ''), 200)
from auth.users on conflict (id) do nothing;

commit;
