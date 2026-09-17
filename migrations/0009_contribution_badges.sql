alter table profiles add column if not exists points integer not null default 0;
alter table profiles add column if not exists equipped_badge text;

create table if not exists user_badges (
  user_id text not null,
  badge_id text not null,
  purchased_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists points_ledger (
  id text primary key,
  user_id text not null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table reviews add column if not exists reviewer_title text;
