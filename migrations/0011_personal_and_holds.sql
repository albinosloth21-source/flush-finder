alter table bathrooms add column if not exists visibility text;
update bathrooms set visibility = 'public' where visibility is null;
alter table bathrooms alter column visibility set default 'public';
alter table bathrooms alter column visibility set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bathrooms_visibility_check') then
    alter table bathrooms add constraint bathrooms_visibility_check
      check (visibility in ('public', 'pending', 'personal'));
  end if;
end $$;

create index if not exists bathrooms_visibility_idx on bathrooms (visibility);
create index if not exists bathrooms_created_by_idx on bathrooms (created_by);

create table if not exists add_holds (
  user_id text primary key,
  held_until timestamptz not null,
  created_at timestamptz not null default now()
);
