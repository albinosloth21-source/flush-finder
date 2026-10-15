-- Community review reports. A review reported by REPORT_HIDE_THRESHOLD distinct
-- accounts (see src/lib/review-reports.ts) is hidden as 'pending' until a
-- moderator approves or removes it. See docs/MODERATION.md.
alter table reviews add column if not exists moderation_status text not null default 'visible';
alter table reviews drop constraint if exists reviews_moderation_status_check;
alter table reviews add constraint reviews_moderation_status_check
  check (moderation_status in ('visible', 'pending', 'approved', 'removed'));
alter table reviews add column if not exists moderated_at timestamptz;
alter table reviews add column if not exists moderated_by text;

create table if not exists review_reports (
  id          bigserial primary key,
  review_id   text not null references reviews (id) on delete cascade,
  reporter_id text not null,
  reason      text not null check (reason in ('spam', 'offensive', 'false_info', 'private_info', 'other')),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index if not exists review_reports_review_idx on review_reports (review_id);
create index if not exists review_reports_reporter_time_idx on review_reports (reporter_id, created_at desc);
create index if not exists reviews_moderation_status_idx on reviews (moderation_status) where moderation_status <> 'visible';
