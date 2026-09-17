-- Convert availability from hour-presets to a 1–5 rating, and add
-- accessibility + atmosphere as the same kind of 1–5 toilet score.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reviews'
      and column_name = 'availability'
      and data_type in ('text', 'character varying')
  ) then
    alter table reviews add column if not exists availability_rating integer;
    update reviews
    set availability_rating = case availability
      when 'always' then 5
      when 'hours' then 4
      when 'unpredictable' then 2
      when 'locked' then 1
      else 3
    end
    where availability_rating is null;
    alter table reviews drop column availability;
    alter table reviews rename column availability_rating to availability;
  end if;
end $$;

alter table reviews add column if not exists accessibility integer;
alter table reviews add column if not exists atmosphere integer;

update reviews r
set accessibility = case
  when b.wheelchair is true then 4
  when b.wheelchair is false then 2
  else 3
end
from bathrooms b
where r.bathroom_id = b.id and r.accessibility is null;

update reviews
set atmosphere = greatest(1, least(5, coalesce(rating, 3)))
where atmosphere is null;

update reviews as r
set accessibility = v.accessibility, atmosphere = v.atmosphere
from (values
  ('rev-us-1', 4, 3),
  ('rev-us-2', 3, 3),
  ('rev-lib-1', 5, 5),
  ('rev-lib-2', 5, 4),
  ('rev-ferry-1', 4, 4),
  ('rev-ferry-2', 3, 3),
  ('rev-sf-1', 4, 5),
  ('rev-sf-2', 4, 4),
  ('rev-cc-1', 2, 2),
  ('rev-cc-2', 2, 1),
  ('rev-dp-1', 3, 3),
  ('rev-dp-2', 3, 4),
  ('rev-gg-1', 4, 4),
  ('rev-gg-2', 4, 4),
  ('rev-em-1', 2, 2),
  ('rev-wh-1', 3, 2),
  ('rev-wh-2', 3, 2),
  ('rev-wf-1', 5, 5),
  ('rev-wf-2', 5, 4),
  ('rev-nyc-bp-1', 5, 5),
  ('rev-nyc-bp-2', 5, 4),
  ('rev-nyc-lib-1', 5, 5),
  ('rev-nyc-gc-1', 4, 4),
  ('rev-nyc-wsp-1', 3, 3),
  ('rev-chi-1', 4, 4),
  ('rev-chi-2', 5, 5),
  ('rev-atx-1', 4, 4),
  ('rev-lon-1', 3, 3),
  ('rev-lon-2', 5, 5),
  ('rev-tyo-1', 5, 5),
  ('rev-tyo-2', 4, 4)
) as v(id, accessibility, atmosphere)
where r.id = v.id;

update reviews set availability = 3 where availability is null;
update reviews set accessibility = 3 where accessibility is null;
update reviews set atmosphere = 3 where atmosphere is null;

alter table reviews alter column availability set not null;
alter table reviews alter column accessibility set not null;
alter table reviews alter column atmosphere set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_availability_range') then
    alter table reviews add constraint reviews_availability_range check (availability between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_accessibility_range') then
    alter table reviews add constraint reviews_accessibility_range check (accessibility between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_atmosphere_range') then
    alter table reviews add constraint reviews_atmosphere_range check (atmosphere between 1 and 5);
  end if;
end $$;
