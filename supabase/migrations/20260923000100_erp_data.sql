-- ERP data foundation. Firebase collection-shaped records are kept in JSONB so
-- the existing flexible documents can be imported without losing fields.
begin;

create table public.erp_records (
  id uuid primary key default gen_random_uuid(),
  collection_name text not null check (collection_name ~ '^[a-zA-Z][a-zA-Z0-9_-]{0,95}$'),
  record_key text not null check (length(record_key) between 1 and 200),
  organization_id uuid references public.organizations(id),
  owner_id uuid references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_name, record_key)
);
create index erp_records_collection_idx on public.erp_records (collection_name);
create index erp_records_org_collection_idx on public.erp_records (organization_id, collection_name);
create index erp_records_owner_collection_idx on public.erp_records (owner_id, collection_name);
create index erp_records_payload_gin_idx on public.erp_records using gin (payload);

alter table public.erp_records enable row level security;
revoke all on public.erp_records from anon, authenticated;
grant select, insert, update, delete on public.erp_records to authenticated;
grant all on public.erp_records to service_role;

create policy erp_records_read on public.erp_records for select to authenticated
using (
  owner_id = auth.uid() or organization_id is null or exists (
    select 1 from public.current_erp_identity() me
    where me.role = 'super_admin' or me.organization_id = erp_records.organization_id
  )
);
create policy erp_records_insert on public.erp_records for insert to authenticated
with check (
  owner_id = auth.uid() or exists (
    select 1 from public.current_erp_identity() me
    where me.role in ('super_admin', 'college_admin', 'faculty', 'placement_officer', 'recruiter')
      and (me.role = 'super_admin' or organization_id is null or me.organization_id = organization_id)
  )
);
create policy erp_records_update on public.erp_records for update to authenticated
using (
  owner_id = auth.uid() or exists (
    select 1 from public.current_erp_identity() me
    where me.role in ('super_admin', 'college_admin', 'faculty', 'placement_officer', 'recruiter')
      and (me.role = 'super_admin' or organization_id is null or me.organization_id = organization_id)
  )
)
with check (owner_id = auth.uid() or exists (
  select 1 from public.current_erp_identity() me
  where me.role = 'super_admin' or me.organization_id = organization_id
));
create policy erp_records_delete on public.erp_records for delete to authenticated
using (exists (
  select 1 from public.current_erp_identity() me
  where me.role in ('super_admin', 'college_admin')
    and (me.role = 'super_admin' or me.organization_id = organization_id)
));

create trigger erp_records_updated before update on public.erp_records
for each row execute function public.erp_touch_updated_at();

-- Collection names used by the ERP. These views give Supabase users and SQL
-- tooling a discoverable schema while records remain flexible during cutover.
create view public.erp_collection_catalog as
select collection_name, count(*)::bigint as record_count, max(updated_at) as last_updated
from public.erp_records group by collection_name;
grant select on public.erp_collection_catalog to authenticated, service_role;

do $$ begin
  alter publication supabase_realtime add table public.erp_records;
exception when duplicate_object then null;
end $$;

commit;
