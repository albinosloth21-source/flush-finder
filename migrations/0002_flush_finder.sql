create table if not exists bathrooms (
  id            text primary key,
  osm_id        text unique,
  name          text not null,
  lat           double precision not null,
  lng           double precision not null,
  access_type   text not null default 'unknown'
                check (access_type in ('public', 'customers', 'unknown')),
  fee           boolean,
  wheelchair    boolean,
  address       text,
  source        text not null default 'user'
                check (source in ('osm', 'user', 'seed')),
  created_at    timestamptz not null default now()
);

create index if not exists bathrooms_bbox_idx on bathrooms (lat, lng);
create index if not exists bathrooms_osm_id_idx on bathrooms (osm_id);

create table if not exists reviews (
  id              text primary key,
  bathroom_id     text not null references bathrooms (id) on delete cascade,
  rating          integer not null check (rating between 1 and 5),
  cleanliness     integer not null check (cleanliness between 1 and 5),
  availability    text not null,
  access_type     text not null check (access_type in ('public', 'customers')),
  critique        text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists reviews_bathroom_id_idx on reviews (bathroom_id);
