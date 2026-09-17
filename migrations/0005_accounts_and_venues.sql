-- Verified reviewers + venue kinds (restaurants, gas, grocery, parks).

alter table bathrooms add column if not exists kind text;
update bathrooms set kind = 'toilet' where kind is null;
update bathrooms set kind = 'park'
  where id in (
    'seed-dolores-park', 'seed-gg-park', 'seed-salesforce-park', 'seed-civic-center',
    'seed-nyc-bryant', 'seed-nyc-wsp', 'seed-chi-millennium', 'seed-atx-republic',
    'seed-lon-trafalgar'
  );
alter table bathrooms alter column kind set default 'toilet';
alter table bathrooms alter column kind set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bathrooms_kind_check') then
    alter table bathrooms add constraint bathrooms_kind_check
      check (kind in ('toilet', 'restaurant', 'gas', 'grocery', 'park', 'business'));
  end if;
end $$;

alter table bathrooms add column if not exists created_by text;

alter table reviews add column if not exists user_id text;
alter table reviews add column if not exists reviewer_name text;
update reviews set reviewer_name = 'Verified local' where reviewer_name is null;

create index if not exists bathrooms_kind_idx on bathrooms (kind);
create index if not exists reviews_user_id_idx on reviews (user_id);

create table if not exists profiles (
  user_id text primary key,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists email_confirmations (
  user_id text primary key,
  code_hash text not null,
  sent_to text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

insert into bathrooms (id, name, lat, lng, access_type, fee, wheelchair, address, source, kind) values
  ('seed-tartine', 'Tartine Bakery', 37.7614, -122.4240, 'customers', false, true, '600 Guerrero St, San Francisco', 'seed', 'restaurant'),
  ('seed-in-n-out', 'In-N-Out Burger', 37.8077, -122.4183, 'customers', false, true, '333 Jefferson St, San Francisco', 'seed', 'restaurant'),
  ('seed-zaf', 'Zare at Fly Trap', 37.7856, -122.3964, 'customers', false, false, '606 Folsom St, San Francisco', 'seed', 'restaurant'),
  ('seed-chevron-vn', 'Chevron', 37.7849, -122.4194, 'customers', false, true, 'Van Ness Ave, San Francisco', 'seed', 'gas'),
  ('seed-shell-market', 'Shell', 37.7902, -122.4011, 'customers', false, true, 'Mission St, San Francisco', 'seed', 'gas'),
  ('seed-trader-joes', 'Trader Joe''s', 37.7765, -122.4173, 'customers', false, true, '555 9th St, San Francisco', 'seed', 'grocery'),
  ('seed-whole-foods', 'Whole Foods Market', 37.7815, -122.4106, 'customers', false, true, '399 4th St, San Francisco', 'seed', 'grocery'),
  ('seed-safeway-marina', 'Safeway', 37.8008, -122.4360, 'customers', false, true, '15 Marina Blvd, San Francisco', 'seed', 'grocery'),
  ('seed-alta-plaza', 'Alta Plaza Park', 37.7911, -122.4377, 'public', false, true, 'Jackson St & Steiner St, San Francisco', 'seed', 'park'),
  ('seed-nyc-shake', 'Shake Shack Madison Square', 40.7416, -73.9882, 'customers', false, true, 'Madison Square Park, New York', 'seed', 'restaurant'),
  ('seed-nyc-wholefoods', 'Whole Foods Union Square', 40.7359, -73.9903, 'customers', false, true, '4 Union Square S, New York', 'seed', 'grocery'),
  ('seed-chi-giordano', 'Giordano''s', 41.8842, -87.6246, 'customers', false, true, '223 W Jackson Blvd, Chicago', 'seed', 'restaurant')
on conflict (id) do nothing;

insert into reviews (id, bathroom_id, rating, cleanliness, availability, accessibility, atmosphere, access_type, critique, reviewer_name, created_at) values
  ('rev-tartine-1', 'seed-tartine', 4, 4, 3, 3, 4, 'customers', 'Down the hall past the line. Clean enough, but you need to look like you bought bread.', 'Verified local', now() - interval '1 day'),
  ('rev-innout-1', 'seed-in-n-out', 4, 4, 5, 4, 3, 'customers', 'Standard In-N-Out: bright, stocked, and the code is on the receipt.', 'Verified local', now() - interval '10 hours'),
  ('rev-tj-1', 'seed-trader-joes', 5, 5, 4, 4, 4, 'customers', 'Back left corner. Spotless and never a wait. Ask at checkout if you cannot find it.', 'Verified local', now() - interval '2 days'),
  ('rev-chevron-1', 'seed-chevron-vn', 2, 2, 4, 2, 2, 'customers', 'Ask inside. Key on a plank. Fine in an emergency, bring your own soap hopes.', 'Verified local', now() - interval '5 hours')
on conflict (id) do nothing;
