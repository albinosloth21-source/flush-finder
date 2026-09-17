alter table bathrooms add column if not exists visibility text;
update bathrooms set visibility = 'public' where visibility is null;
alter table bathrooms alter column visibility set default 'public';
alter table bathrooms alter column visibility set not null;

create table if not exists add_holds (
  user_id text primary key,
  held_until timestamptz not null,
  created_at timestamptz not null default now()
);
