# Review reports and moderation

- Signed-in, email-confirmed users see **Report** under each review and pick a reason (spam, offensive, false/misleading, private info, other).
- One report per account per review. Max 10 reports per account per hour (`src/lib/review-reports.ts`).
- You can't report your own review.
- At **3 distinct reporters** a review becomes `pending` and is hidden from the list and from ratings until a moderator acts.
- `approved` reviews stay visible even if reported again; `removed` stay hidden.

## Moderators
Set `MODERATOR_USER_IDS` (comma-separated Better Auth user ids) on the server. Server functions `listReportedReviews` and `moderateReview` (`src/lib/review-reports-fn.ts`) only work for those ids. There is no moderator screen yet; use these or SQL.

## Admin SQL
```sql
-- Queue: reported reviews, pending first
select r.id, r.bathroom_id, r.moderation_status, r.critique,
       count(rr.id) as reports, string_agg(distinct rr.reason, ', ') as reasons
from reviews r join review_reports rr on rr.review_id = r.id
group by r.id order by (r.moderation_status = 'pending') desc, count(rr.id) desc;

-- Keep it up
update reviews set moderation_status = 'approved', moderated_at = now(), moderated_by = 'admin' where id = '<review id>';
-- Take it down
update reviews set moderation_status = 'removed', moderated_at = now(), moderated_by = 'admin' where id = '<review id>';
```
Both stores expect a working report path and timely action on user-generated content (Apple 1.2, Google UGC policy).

# In-app feedback
- **Send feedback** is in Account (Help & feedback) and the header **?** menu. Guests and signed-in users can send it.
- Type (bug / idea / other), message (1–2000 chars), optional email for guests. Auto-attached: app version, route, user agent, and the current map center rounded to ~1 km (location is never requested).
- Max 5 per hour per account, or per hashed IP for guests (`src/lib/feedback.ts`). Raw IPs are not stored (salted SHA-256; set `FEEDBACK_IP_SALT` or it falls back to `BETTER_AUTH_SECRET`).
- Stored in `app_feedback` (`migrations/0021_app_feedback.sql`). Moderators (`MODERATOR_USER_IDS`) can call `listFeedback` (`src/lib/feedback-fn.ts`).

```sql
-- Newest feedback
select id, created_at, kind, status, message, email, user_id, app_version, route, map_lat, map_lng
from app_feedback order by created_at desc limit 100;

-- Open bugs only
select id, created_at, message, route, user_agent from app_feedback
where kind = 'bug' and status = 'new' order by created_at desc;

-- Mark handled
update app_feedback set status = 'done' where id = <id>;
```
