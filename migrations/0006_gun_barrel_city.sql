-- Gun Barrel City, Texas: restrooms at local businesses, parks, and the Main Street corridor.

insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source, kind) values
  ('seed-gbc-walmart', 'Walmart Supercenter', 32.33299, -96.13528, 'customers', false, true, '1200 W Main St, Gun Barrel City', 'seed', 'grocery'),
  ('seed-gbc-chilis', 'Chili''s', 32.33042, -96.13490, 'customers', false, true, '1261 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-mcdonalds', 'McDonald''s', 32.33128, -96.11347, 'customers', false, true, '104 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-lowes', 'Lowe''s', 32.32853, -96.11410, 'customers', false, true, '201 W Main St, Gun Barrel City', 'seed', 'business'),
  ('seed-gbc-huddle', 'Huddle House', 32.33054, -96.11209, 'customers', false, true, '100 Old Gun Barrel Ln, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-murphy', 'Murphy USA', 32.33164, -96.13412, 'customers', false, true, '1190 W Main St, Gun Barrel City', 'seed', 'gas'),
  ('seed-gbc-exxon', 'Exxon', 32.33052, -96.11301, 'customers', false, true, '103 W Main St, Gun Barrel City', 'seed', 'gas'),
  ('seed-gbc-chevron', 'Chevron', 32.33109, -96.12508, 'customers', false, true, 'W Main St, Gun Barrel City', 'seed', 'gas'),
  ('seed-gbc-park', 'Gun Barrel City Park', 32.33647, -96.11760, 'public', false, true, 'Gun Barrel City Park', 'seed', 'park'),
  ('seed-gbc-bk', 'Burger King', 32.33059, -96.11602, 'customers', false, true, '151 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-whataburger', 'Whataburger', 32.33140, -96.12020, 'customers', false, true, 'W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-dq', 'DQ Grill & Chill', 32.33126, -96.11779, 'customers', false, true, '334 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-sonic', 'Sonic Drive-In', 32.33436, -96.11090, 'customers', false, false, 'N Gun Barrel Ln, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-dollar-gen', 'Dollar General', 32.33132, -96.13062, 'customers', false, true, '980 W Main St, Gun Barrel City', 'seed', 'grocery'),
  ('seed-gbc-cvs', 'CVS Pharmacy', 32.33026, -96.13539, 'customers', false, true, '1279 W Main St, Gun Barrel City', 'seed', 'grocery'),
  ('seed-gbc-subway', 'Subway', 32.33050, -96.11406, 'customers', false, true, '113 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-pizzahut', 'Pizza Hut', 32.33058, -96.12138, 'customers', false, true, '501 W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-autozone', 'AutoZone', 32.33041, -96.13391, 'customers', false, true, '1211 W Main St, Gun Barrel City', 'seed', 'business'),
  ('seed-gbc-family-dollar', 'Family Dollar', 32.33042, -96.12381, 'customers', false, true, '701 W Main St, Gun Barrel City', 'seed', 'grocery'),
  ('seed-gbc-mainstreet-bar', 'Main Street Bar and Grill', 32.33038, -96.11168, 'customers', false, true, 'Old Gun Barrel Ln, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-elagave', 'El Agave Bar & Grill', 32.33090, -96.10840, 'customers', false, true, 'E Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-whiskey', 'Whiskey River Bar and Grill', 32.32580, -96.11420, 'customers', false, true, 'S Gun Barrel Ln, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-littlemexico', 'Little Mexico Burrito & Tacos', 32.32490, -96.11360, 'customers', false, false, 'S Gun Barrel Ln, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-cochrans', 'Cochran''s Cafeteria', 32.33085, -96.12740, 'customers', false, true, 'W Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-milanos', 'Milano''s Pizza', 32.33025, -96.11115, 'customers', false, true, 'E Main St, Gun Barrel City', 'seed', 'restaurant'),
  ('seed-gbc-cefco', 'CEFCO', 32.33120, -96.14680, 'customers', false, true, '2309 W Main St, Gun Barrel City', 'seed', 'gas'),
  ('seed-gbc-sunoco', 'Sunoco', 32.32990, -96.09640, 'customers', false, true, '2812 E Main St, Gun Barrel City', 'seed', 'gas'),
  ('seed-gbc-brookshires', 'Brookshire''s', 32.35482, -96.10544, 'customers', false, true, '1106 S 3rd St, Mabank', 'seed', 'grocery'),
  ('seed-gbc-tractor', 'Tractor Supply', 32.34330, -96.10742, 'customers', false, true, '1701 S 3rd St, Mabank', 'seed', 'business'),
  ('seed-gbc-cityhall', 'Gun Barrel City Hall', 32.33380, -96.12390, 'public', false, true, 'Gun Barrel City, TX', 'seed', 'business'),
  ('seed-purtis', 'Purtis Creek State Park', 32.36521, -95.99505, 'public', true, true, 'Purtis Creek State Park, TX', 'seed', 'park')
on conflict (id) do nothing;

insert into reviews (id, bathroom_id, rating, cleanliness, availability, accessibility, atmosphere, access_type, critique, reviewer_name, created_at) values
  ('rev-gbc-walmart-1', 'seed-gbc-walmart', 4, 4, 5, 5, 3, 'customers', 'Back of the store by the grocery side. Always open with the Supercenter. Family stall is actually a family stall.', 'Verified local', now() - interval '8 hours'),
  ('rev-gbc-walmart-2', 'seed-gbc-walmart', 3, 3, 5, 4, 3, 'customers', 'Busy after church on Sunday. Fine if you are already shopping. Paper towels were stocked.', 'Verified local', now() - interval '2 days'),
  ('rev-gbc-park-1', 'seed-gbc-park', 3, 3, 4, 3, 3, 'public', 'Park restroom by the playground. Better in the morning. Bring a backup tissue on ballgame nights.', 'Verified local', now() - interval '1 day'),
  ('rev-gbc-chilis-1', 'seed-gbc-chilis', 4, 4, 4, 4, 4, 'customers', 'Ask at the host stand. Cleaner than the highway gas stops, and they do not fuss if you ordered tea.', 'Verified local', now() - interval '5 hours'),
  ('rev-gbc-mcd-1', 'seed-gbc-mcdonalds', 4, 4, 5, 4, 3, 'customers', 'Code is on the receipt. Bright and usually stocked. The reliable pit stop on Main.', 'Verified local', now() - interval '14 hours'),
  ('rev-gbc-exxon-1', 'seed-gbc-exxon', 2, 2, 4, 2, 2, 'customers', 'Ask inside. Key on a plank energy. Fine in a pinch between Mabank and the lake.', 'Verified local', now() - interval '3 days'),
  ('rev-gbc-whataburger-1', 'seed-gbc-whataburger', 4, 4, 5, 4, 4, 'customers', '24-hour hours help. Clean enough, and the stall locks. Best late-night option on 198.', 'Verified local', now() - interval '6 hours'),
  ('rev-gbc-lowes-1', 'seed-gbc-lowes', 5, 5, 4, 5, 4, 'customers', 'Front of store, left of returns. Spotless and quiet. Closes with the building.', 'Verified local', now() - interval '1 day')
on conflict (id) do nothing;
