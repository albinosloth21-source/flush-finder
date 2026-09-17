insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source) values
  ('seed-nyc-bryant', 'Bryant Park Restrooms', 40.7536, -73.9832, 'public', false, true, 'Bryant Park, New York', 'seed'),
  ('seed-nyc-library', 'New York Public Library', 40.7532, -73.9822, 'public', false, true, '476 5th Ave, New York', 'seed'),
  ('seed-nyc-grand-central', 'Grand Central Terminal', 40.7527, -73.9772, 'public', false, true, '89 E 42nd St, New York', 'seed'),
  ('seed-nyc-wsp', 'Washington Square Park', 40.7308, -73.9973, 'public', false, true, 'Washington Square, New York', 'seed'),
  ('seed-chi-millennium', 'Millennium Park', 41.8827, -87.6233, 'public', false, true, '201 E Randolph St, Chicago', 'seed'),
  ('seed-chi-cultural', 'Chicago Cultural Center', 41.8837, -87.6247, 'public', false, true, '78 E Washington St, Chicago', 'seed'),
  ('seed-atx-cityhall', 'Austin City Hall', 30.2648, -97.7472, 'public', false, true, '301 W 2nd St, Austin', 'seed'),
  ('seed-atx-republic', 'Republic Square', 30.2676, -97.7472, 'public', false, true, '422 Guadalupe St, Austin', 'seed'),
  ('seed-lon-trafalgar', 'Trafalgar Square', 51.5080, -0.1281, 'public', true, true, 'Trafalgar Square, London', 'seed'),
  ('seed-lon-library', 'British Library', 51.5299, -0.1277, 'public', false, true, '96 Euston Rd, London', 'seed'),
  ('seed-tyo-shibuya', 'Shibuya Public Restroom', 35.6595, 139.7004, 'public', false, true, 'Shibuya Crossing, Tokyo', 'seed'),
  ('seed-tyo-shinjuku', 'Shinjuku Station', 35.6896, 139.7006, 'public', false, true, 'Shinjuku Station, Tokyo', 'seed')
on conflict (id) do nothing;

insert into reviews (id, bathroom_id, rating, cleanliness, availability, access_type, critique, created_at) values
  ('rev-nyc-bp-1', 'seed-nyc-bryant', 5, 5, 'hours', 'public', 'The gold standard. Attended, stocked, and somehow elegant for a park restroom.', now() - interval '1 day'),
  ('rev-nyc-bp-2', 'seed-nyc-bryant', 4, 5, 'hours', 'public', 'Line at lunch. Worth it. Closes with the park.', now() - interval '6 hours'),
  ('rev-nyc-lib-1', 'seed-nyc-library', 5, 5, 'hours', 'public', 'Quiet, marble, and actually private. Go downstairs.', now() - interval '3 days'),
  ('rev-nyc-gc-1', 'seed-nyc-grand-central', 4, 4, 'always', 'public', 'Busy but orderly. Follow signs past the food hall.', now() - interval '2 days'),
  ('rev-nyc-wsp-1', 'seed-nyc-wsp', 3, 3, 'always', 'public', 'Park restroom: functional, a little chaotic on weekends.', now() - interval '8 hours'),
  ('rev-chi-1', 'seed-chi-millennium', 4, 4, 'hours', 'public', 'Cleaner than the Bean crowds would suggest. Seasonal hours.', now() - interval '2 days'),
  ('rev-chi-2', 'seed-chi-cultural', 5, 5, 'hours', 'public', 'Building restrooms are a refuge from the Loop. Free and gorgeous.', now() - interval '5 hours'),
  ('rev-atx-1', 'seed-atx-cityhall', 4, 4, 'hours', 'public', 'Open during city hours. Quiet and reliable downtown.', now() - interval '4 days'),
  ('rev-lon-1', 'seed-lon-trafalgar', 3, 3, 'always', 'public', 'Pay kiosk, then decent facilities. Fine after a gallery hop.', now() - interval '1 day'),
  ('rev-lon-2', 'seed-lon-library', 5, 5, 'hours', 'public', 'Free with the building. Best stop near Kings Cross.', now() - interval '12 hours'),
  ('rev-tyo-1', 'seed-tyo-shibuya', 5, 5, 'always', 'public', 'The famous one. Spotless, well designed, and easy to find from the crossing.', now() - interval '2 days'),
  ('rev-tyo-2', 'seed-tyo-shinjuku', 4, 4, 'always', 'public', 'Station standard: clean, signed, and everywhere once you are inside.', now() - interval '9 hours')
on conflict (id) do nothing;
