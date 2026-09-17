create table if not exists removed_venues (
  id text primary key,
  osm_id text,
  name text,
  lat double precision,
  lng double precision,
  reason text not null default 'gone',
  removed_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists removed_venues_osm_idx on removed_venues (osm_id);
create index if not exists removed_venues_geo_idx on removed_venues (lat, lng);
