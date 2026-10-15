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
