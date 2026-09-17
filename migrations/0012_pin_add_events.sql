create table if not exists pin_add_events (
  id text primary key,
  user_id text not null,
  bathroom_id text,
  created_at timestamptz not null default now()
);
create index if not exists pin_add_events_user_time_idx
  on pin_add_events (user_id, created_at desc);
