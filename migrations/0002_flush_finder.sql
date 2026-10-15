-- Flush Finder: unowned restrooms + reviews (auth off — world readable/writable)

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
  availability    text not null
                  check (availability in ('always', 'hours', 'unpredictable', 'locked')),
  access_type     text not null
                  check (access_type in ('public', 'customers')),
  critique        text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists reviews_bathroom_id_idx on reviews (bathroom_id);
create index if not exists reviews_created_at_idx on reviews (created_at desc);

insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source) values
  ('seed-union-square', 'Union Square Restroom', 37.7879, -122.4075, 'public', false, true, '333 Post St, San Francisco', 'seed'),
  ('seed-main-library', 'San Francisco Main Library', 37.7790, -122.4156, 'public', false, true, '100 Larkin St, San Francisco', 'seed'),
  ('seed-ferry-building', 'Ferry Building Restrooms', 37.7955, -122.3937, 'public', false, true, '1 Ferry Building, San Francisco', 'seed'),
  ('seed-salesforce-park', 'Salesforce Park', 37.7898, -122.3969, 'public', false, true, '425 Mission St, San Francisco', 'seed'),
  ('seed-civic-center', 'Civic Center Plaza', 37.7793, -122.4167, 'public', false, true, 'Civic Center, San Francisco', 'seed'),
  ('seed-dolores-park', 'Mission Dolores Park', 37.7597, -122.4269, 'public', false, true, 'Dolores St & 18th St, San Francisco', 'seed'),
  ('seed-gg-park', 'Golden Gate Park — JFK Drive', 37.7716, -122.4546, 'public', false, true, 'John F Kennedy Dr, San Francisco', 'seed'),
  ('seed-embarcadero', 'Embarcadero Plaza', 37.7946, -122.3990, 'public', false, false, 'Market St & Steuart St, San Francisco', 'seed'),
  ('seed-wharf', 'Pier 39 Public Restroom', 37.8087, -122.4098, 'public', false, true, 'Pier 39, San Francisco', 'seed'),
  ('seed-westfield', 'Westfield Centre', 37.7840, -122.4069, 'customers', false, true, '865 Market St, San Francisco', 'seed')
on conflict (id) do nothing;

insert into reviews (id, bathroom_id, rating, cleanliness, availability, access_type, critique, created_at) values
  ('rev-us-1', 'seed-union-square', 4, 4, 'always', 'public', 'Busy but well kept. Attendant on weekends, soap in every dispenser, and the line moves.', now() - interval '2 days'),
  ('rev-us-2', 'seed-union-square', 3, 3, 'always', 'public', 'Fine in a pinch. Floor gets slick after the morning rush. Still the most reliable stop near Powell.', now() - interval '14 hours'),
  ('rev-lib-1', 'seed-main-library', 5, 5, 'hours', 'public', 'Quiet, stocked, and actually clean. Best restroom in the Civic Center if you can go during library hours.', now() - interval '5 days'),
  ('rev-lib-2', 'seed-main-library', 5, 4, 'hours', 'public', 'Ground floor is easy to find. Closes with the building — do not count on it after 6.', now() - interval '1 day'),
  ('rev-ferry-1', 'seed-ferry-building', 4, 4, 'hours', 'public', 'Touristy but orderly. Downstairs near the marketplace. Paper towels, not just air.', now() - interval '3 days'),
  ('rev-ferry-2', 'seed-ferry-building', 3, 3, 'hours', 'public', 'Weekend queue at lunch. Stall doors all latched, which is more than I can say for the Wharf.', now() - interval '8 hours'),
  ('rev-sf-1', 'seed-salesforce-park', 5, 5, 'hours', 'public', 'Rooftop park restrooms feel almost private. Spotless tile, no line at 10am. Take the gondola.', now() - interval '6 days'),
  ('rev-sf-2', 'seed-salesforce-park', 4, 5, 'hours', 'public', 'Park hours only. Worth the elevator. Bring a badge smile if security is posted.', now() - interval '22 hours'),
  ('rev-cc-1', 'seed-civic-center', 2, 2, 'unpredictable', 'public', 'Open when the plaza is busy, locked when it is not. Bring your own tissue.', now() - interval '4 days'),
  ('rev-cc-2', 'seed-civic-center', 1, 1, 'locked', 'public', 'Found it chained at 8pm. Use the library instead if it is still open.', now() - interval '11 hours'),
  ('rev-dp-1', 'seed-dolores-park', 3, 3, 'always', 'public', 'Park restroom energy: functional, a little chaotic on sunny Saturdays, never a surprise.', now() - interval '7 days'),
  ('rev-dp-2', 'seed-dolores-park', 4, 4, 'always', 'public', 'Recently refreshed. Still a line after yoga in the park. Go to the upper one by the tennis courts.', now() - interval '16 hours'),
  ('rev-gg-1', 'seed-gg-park', 4, 4, 'always', 'public', 'Classic park facilities. Cleaner than expected. Bike parking right outside.', now() - interval '9 days'),
  ('rev-gg-2', 'seed-gg-park', 5, 4, 'always', 'public', 'After a long loop on JFK this was a relief. Unlocked at dusk, lights on.', now() - interval '3 hours'),
  ('rev-em-1', 'seed-embarcadero', 2, 2, 'unpredictable', 'public', 'Hits the basics and not much else. Fine if you are already on the streetcar.', now() - interval '12 days'),
  ('rev-wh-1', 'seed-wharf', 3, 3, 'always', 'public', 'Crowded, as advertised. Stall 3 had a working lock. Wash your hands downstairs.', now() - interval '1 day'),
  ('rev-wh-2', 'seed-wharf', 2, 2, 'hours', 'public', 'Smells like the sea in a bad way after 4pm. Go to the Ferry Building if you can walk it.', now() - interval '6 hours'),
  ('rev-wf-1', 'seed-westfield', 5, 5, 'hours', 'customers', 'Mall standard: bright, private, and the soap is actually soap. Need a store visit or a receipt wave.', now() - interval '2 days'),
  ('rev-wf-2', 'seed-westfield', 4, 5, 'hours', 'customers', 'Fourth floor is quieter than the food court level. Closes with the mall.', now() - interval '20 hours')
on conflict (id) do nothing;
