import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { reportReview } from "@/lib/review-reports-fn";
import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason } from "@/lib/review-reports";

/** Small "Report" control under a review. Only rendered for confirmed accounts. */
export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function send(reason: ReportReason) {
    setBusy(true);
    try {
      const result = await reportReview({ data: { reviewId, reason } });
      setDone(true);
      setOpen(false);
      toast.success(result.hidden ? "Thanks. This review is hidden while we check it." : "Thanks. We'll take a look.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that report");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="mt-2 text-[0.75rem] text-subtle">Reported</p>;

  return (
    <div className="mt-2">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[0.75rem] text-subtle hover:text-foreground"
        aria-expanded={open}
        aria-label="Report this review"
        onClick={() => setOpen((v) => !v)}
      >
        <Flag className="size-3" />
        Report
      </button>
      {open ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Why are you reporting this review?">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              disabled={busy}
              className="rounded-full bg-foreground/6 px-2.5 py-1 text-[0.75rem] disabled:opacity-50"
              onClick={() => void send(reason)}
            >
              {REPORT_REASON_LABELS[reason]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
