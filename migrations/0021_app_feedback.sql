-- In-app "Send feedback" (Account tab and header help menu). Signed-in users
-- and guests may submit; rate limited per user id or hashed IP (see
-- src/lib/feedback.ts). Moderators read it via listFeedback or SQL in
-- docs/MODERATION.md. No raw IP is stored, only a salted SHA-256 hash.
create table if not exists app_feedback (
  id          bigserial primary key,
  kind        text not null check (kind in ('bug', 'idea', 'other')),
  message     text not null check (char_length(message) between 1 and 2000),
  email       text,
  user_id     text,
  ip_hash     text,
  app_version text not null default '',
  route       text not null default '',
  user_agent  text not null default '',
  map_lat     double precision,
  map_lng     double precision,
  status      text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at  timestamptz not null default now()
);

create index if not exists app_feedback_created_idx on app_feedback (created_at desc);
create index if not exists app_feedback_user_time_idx on app_feedback (user_id, created_at desc) where user_id is not null;
create index if not exists app_feedback_ip_time_idx on app_feedback (ip_hash, created_at desc) where ip_hash is not null;
