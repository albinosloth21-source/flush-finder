import { useState, type ReactNode } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Accessibility,
  ChevronLeft,
  Clock,
  Footprints,
  Crown,
  MapPinOff,
  Plus,
  KeyRound,
  Store,
  X,
} from "lucide-react";
import { ToiletRating } from "@/components/toilet-rating";
import { ReportReviewButton } from "@/components/report-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDistance, formatWalk, haversineMeters } from "@/lib/geo";
import {
  ACCESS_OPTIONS,
  RATING_ASPECTS,
  REMOVE_REASONS,
  VENUE_HINTS,
  VENUE_LABELS,
  accessLabel,
  aspectCaption,
  ratingCaption,
  type RatingAspectKey,
} from "@/lib/labels";
import { formatOperatingHours, hoursFromPin, hoursStatus, reportHours, weekSchedule, WEEK_DAYS, type WeekDay } from "@/lib/search-radius";
import type { AccessType, Bathroom, Review, VenueKind, WalkingRoute } from "@/lib/types";
import { CIVIL_COPY, isCivil } from "@/lib/moderation";
import { reviewPoints } from "@/lib/badges";
import { overallScore } from "@/lib/toilet-score";
import { FlushLoader } from "@/components/flush-loader";
import { TakeMeThere } from "@/components/take-me-there";
import { isGoldenThrone } from "@/lib/throne-fx";
import { cn } from "@/lib/utils";

export type NearbyFilter =
  | "all"
  | "personal"
  | "toilet"
  | "restaurant"
  | "gas"
  | "grocery"
  | "park"
  | "business"
  | "rated";

const FILTERS: { id: NearbyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "toilet", label: "Public restrooms" },
  { id: "personal", label: "Personal restrooms" },
  { id: "restaurant", label: "Food" },
  { id: "gas", label: "Gas" },
  { id: "grocery", label: "Grocery" },
  { id: "park", label: "Parks" },
  { id: "business", label: "Shops" },
  { id: "rated", label: "Rated" },
];

const ASPECT_VALUES: Record<RatingAspectKey, (room: Bathroom) => number | null> = {
  cleanliness: (room) => room.avgCleanliness,
  availability: (room) => room.avgAvailability,
  accessibility: (room) => room.avgAccessibility,
  atmosphere: (room) => room.avgAtmosphere,
};

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function AccessChip({
  on,
  children,
  icon,
}: {
  on: boolean;
  children: string;
  icon?: ReactNode;
}) {
  return (
    <Badge variant={on ? "default" : "outline"} className={on ? "" : "opacity-70"}>
      {icon}
      {children}
    </Badge>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 inline-flex h-10 items-center gap-1 text-sm font-medium text-muted"
    >
      <ChevronLeft className="size-4" />
      {children}
    </button>
  );
}

function AspectBreakdown({ bathroom }: { bathroom: Bathroom }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
      {RATING_ASPECTS.map((aspect) => {
        const value = ASPECT_VALUES[aspect.key](bathroom);
        return (
          <div key={aspect.key} className="min-w-0">
            <dt className="text-[0.6875rem] tracking-[0.12em] text-subtle uppercase">{aspect.label}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <ToiletRating value={value} size="sm" />
              <span className="text-[0.75rem] text-muted">{aspectCaption(aspect.key, value)}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ReviewAspects({ review }: { review: Review }) {
  return (
    <p className="mt-1.5 text-[0.75rem] text-muted">
      Clean {review.cleanliness} · Open {review.availability} · Access {review.accessibility} · Vibe{" "}
      {review.atmosphere}
    </p>
  );
}

export function NearbyList({
  bathrooms,
  origin,
  filter,
  onFilter,
  onSelect,
  loading,
  radiusMiles,
  zoomedOut,
}: {
  bathrooms: Bathroom[];
  origin: { lat: number; lng: number };
  filter: NearbyFilter;
  onFilter: (next: NearbyFilter) => void;
  onSelect: (id: string) => void;
  loading: boolean;
  radiusMiles?: number;
  zoomedOut?: boolean;
}) {
  const noun = bathrooms.length === 1 ? "place" : "places";
  const range =
    radiusMiles != null
      ? ` within ${radiusMiles} ${radiusMiles === 1 ? "mile" : "miles"}`
      : "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div data-ff-sheet-handle className="shrink-0 touch-none">
        <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Nearby</p>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {zoomedOut && bathrooms.length === 0 ? "Zoom into your state" : `${bathrooms.length} ${noun}${range}`}
        </h2>
      </div>
      {loading ? (
        <p className="mt-1 flex items-center gap-2 text-[0.75rem] text-muted" aria-live="polite">
          <FlushLoader className="size-4" />
          Snooping for restrooms…
        </p>
      ) : null}
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-kind={item.id}
            onClick={() => onFilter(item.id)}
            className={cn("ff-filter", filter === item.id && "is-on")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {bathrooms.length === 0 && !loading ? (
          <li className="px-1 py-3 text-sm text-muted">
            {zoomedOut
              ? "Share your location or zoom into your state to see restrooms nearby."
              : filter === "park"
                ? "No park restrooms pinned yet. Drop a pin on the actual stall — not the park entrance — to earn points."
                : "No thrones in sight… try zooming out or dragging the map."}
          </li>
        ) : null}
        {bathrooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              className="flex w-full items-start gap-3 rounded-[var(--radius-lg)] px-2 py-2 text-left hover:bg-foreground/5"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-medium">
                  <span className="truncate">{room.name}</span>
                  {isGoldenThrone(room.avgRating, room.reviewCount) ? (
                    <Crown className="ff-crown size-4 shrink-0" aria-label="Golden Throne: rated five toilets" />
                  ) : null}
                </p>
                <p className="text-[0.75rem] text-muted">{ratingCaption(room.avgRating, room.reviewCount)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={cn("ff-kind-chip", `is-${room.kind}`)}>{VENUE_LABELS[room.kind]}</span>
                  <Badge variant={room.customersOnly || room.accessType === "customers" ? "warn" : "outline"}>
                    Customers only
                  </Badge>
                  {room.askForKey ? <Badge variant="default">Ask for key</Badge> : null}
                  {room.unverified && room.reviewCount === 0 ? (
                    <Badge variant="outline" className="ff-unverified">Unverified, confirm it?</Badge>
                  ) : null}
                  {room.wheelchair ? <Badge variant="muted">Accessible</Badge> : null}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <ToiletRating value={room.avgRating} size="sm" />
                <p className="mt-1 text-[0.75rem] text-subtle">{formatDistance(haversineMeters(origin, room))}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HoursPanel({
  bathroom,
  reviews,
  canReview,
  reviewHint,
  onReview,
}: {
  bathroom: Bathroom;
  reviews: Review[];
  canReview: boolean;
  reviewHint: "guest" | "confirm" | "ready" | "pending";
  onReview: () => void;
}) {
  const hours = reportHours(bathroom, reviews);
  const status = hoursStatus(hours);
  const schedule = hours ? weekSchedule(hours) : [];
  return (
    <div className="mt-4" data-ff-hours-panel>
      <div
        className={cn(
          "rounded-[var(--radius-lg)] px-3.5 py-3",
          status.state === "open" ? "bg-good/12" : status.state === "closed" ? "bg-foreground/6" : "bg-foreground/4",
        )}
      >
        <p
          className={cn(
            "font-display text-lg font-semibold",
            status.state === "open" ? "text-good" : "text-foreground",
          )}
        >
          {status.headline}
        </p>
        <p className="mt-0.5 text-sm text-muted">{status.detail}</p>
      </div>
      {schedule.length ? (
        <ul className="mt-3 divide-y divide-border rounded-[var(--radius-lg)] bg-foreground/4 px-3.5">
          {schedule.map((row) => (
            <li key={row.day} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-medium">{row.day}</span>
              <span className={row.closed ? "text-muted" : "text-foreground"}>{row.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-[var(--radius-lg)] bg-foreground/4 p-3.5 text-sm text-muted">
          Nobody has posted hours for this restroom yet.
        </p>
      )}
      <p className="mt-3 text-[0.75rem] text-subtle">
        Hours come from reviews. If the door sign changed, add a new review.
      </p>
      {reviewHint === "pending" ? (
        <div className="mt-3 h-10 w-40 animate-pulse rounded-md bg-foreground/8" />
      ) : canReview ? (
        <Button className="mt-3" onClick={onReview}>
          <Clock className="size-4" />
          Add hours in a review
        </Button>
      ) : (
        <Button className="mt-3" asChild>
          <a href={reviewHint === "confirm" ? "/confirm-email" : "/login"}>
            Sign in to add hours
          </a>
        </Button>
      )}
    </div>
  );
}

export function BathroomDetail({
  bathroom,
  reviews,
  reviewsLoading,
  origin,
  route,
  routing,
  onBack,
  onReview,
  onWalk,
  onRemove,
  removing,
  canReview,
  reviewHint,
}: {
  bathroom: Bathroom;
  reviews: Review[];
  reviewsLoading: boolean;
  origin: { lat: number; lng: number } | null;
  route: WalkingRoute | null;
  routing: boolean;
  onBack: () => void;
  onReview: () => void;
  onWalk: () => void;
  onRemove: (reason: (typeof REMOVE_REASONS)[number]["value"]) => void;
  removing: boolean;
  canReview: boolean;
  reviewHint: "guest" | "confirm" | "ready" | "pending";
}) {
  const shownReviews = reviews;
  const overall = overallScore(bathroom.avgRating, shownReviews);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState<(typeof REMOVE_REASONS)[number]["value"]>("gone");
  const [detailTab, setDetailTab] = useState<"reviews" | "hours">("reviews");
  const canDeleteMine = bathroom.mine && bathroom.source === "user";
  const hoursLabel = hoursFromPin(bathroom, shownReviews);
  const hours = reportHours(bathroom, shownReviews);
  const status = hoursStatus(hours);
  return (
    <div className="pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">
            {/restroom$/i.test(VENUE_LABELS[bathroom.kind]) ? VENUE_LABELS[bathroom.kind] : `${VENUE_LABELS[bathroom.kind]} restroom`}
          </p>
          <h2 className="font-display mt-0.5 text-2xl font-semibold tracking-tight text-balance">
            {bathroom.name}
            {isGoldenThrone(bathroom.avgRating, bathroom.reviewCount) ? (
              <Crown className="ff-crown ml-1.5 inline size-5 align-[-0.1em]" aria-label="Golden Throne: rated five toilets" />
            ) : null}
          </h2>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          {canDeleteMine ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-0.5"
              disabled={removing}
              onClick={() => onRemove("gone")}
            >
              {removing ? <FlushLoader className="size-4" /> : <MapPinOff className="size-4" />}
              Remove pin
            </Button>
          ) : null}
          <button
          type="button"
          onClick={onBack}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-foreground/6 hover:text-foreground"
          aria-label="Close reviews"
        >
          <X className="size-5" />
        </button>
        </div>
      </div>

      <div className="mt-3 shrink-0 rounded-[var(--radius-lg)] bg-foreground/5 px-3 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <ToiletRating value={overall} size="lg" />
          <p className="text-sm font-medium">
            {ratingCaption(overall, bathroom.reviewCount || shownReviews.length)}
          </p>
        </div>
        <AspectBreakdown bathroom={bathroom} />
      </div>

      <div className="mt-3 pt-1 pb-2">
        {bathroom.address ? <p className="text-sm text-muted">{bathroom.address}</p> : null}
        {hoursLabel ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <Clock className="size-3.5 shrink-0 text-muted" />
            <span className={status.state === "open" ? "text-good" : status.state === "closed" ? "text-muted" : ""}>
              {status.state === "open" ? "Open now" : status.state === "closed" ? "Closed now" : hoursLabel}
            </span>
            {status.state !== "unknown" ? <span className="text-muted">· {hoursLabel}</span> : null}
          </p>
        ) : null}
        <p className="mt-1 text-[0.75rem] text-subtle">{VENUE_HINTS[bathroom.kind]}</p>
        {bathroom.unverified && bathroom.reviewCount === 0 ? (
          <p className="ff-unverified-note mt-2 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-muted">
            <Badge variant="outline" className="ff-unverified">Unverified, confirm it?</Badge>
            <span>From OpenStreetMap. Been here? A quick review confirms it for everyone.</span>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <AccessChip on={bathroom.customersOnly || bathroom.accessType === "customers"} icon={<Store className="size-3" />}>
            Customers only
          </AccessChip>
          <AccessChip on={bathroom.askForKey} icon={<KeyRound className="size-3" />}>
            Ask for key
          </AccessChip>
          <AccessChip on={!bathroom.customersOnly && bathroom.accessType !== "customers"}>
            Open to public
          </AccessChip>
          {bathroom.wheelchair ? (
            <Badge variant="muted">
              <Accessibility className="size-3" />
              Step-free
            </Badge>
          ) : null}
          {bathroom.fee ? <Badge variant="outline">Fee</Badge> : null}
          {bathroom.visibility === "personal" ? <Badge variant="warn">Personal</Badge> : null}
          {bathroom.visibility === "pending" && bathroom.mine ? (
            <Badge variant="muted">On your map only until verified</Badge>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onWalk} disabled={routing || !origin} className="col-span-2">
            {routing ? <FlushLoader className="size-4" /> : <Footprints className="size-4" />}
            {route ? formatWalk(route.durationSeconds) : "Walk there"}
          </Button>
          <TakeMeThere dest={bathroom} className="col-span-2" />
        </div>
        {!origin ? (
          <p className="mt-2 text-[0.75rem] text-subtle">Share your location to plot a walking route.</p>
        ) : null}

        <Separator className="my-4" />

        <div className="flex gap-1.5" role="tablist" aria-label="Restroom details">
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "reviews"}
            data-ff-detail-tab="reviews"
            className={cn(
              "h-11 rounded-full px-4 text-sm font-semibold",
              detailTab === "reviews" ? "bg-foreground text-surface" : "bg-foreground/6 text-foreground",
            )}
            onClick={() => setDetailTab("reviews")}
          >
            Reviews
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "hours"}
            data-ff-hours-tab
            className={cn(
              "h-11 rounded-full px-4 text-sm font-semibold",
              detailTab === "hours" ? "bg-foreground text-surface" : "bg-foreground/6 text-foreground",
            )}
            onClick={() => setDetailTab("hours")}
          >
            Hours
          </button>
        </div>

        {detailTab === "hours" ? (
          <HoursPanel
            bathroom={bathroom}
            reviews={shownReviews}
            canReview={canReview}
            reviewHint={reviewHint}
            onReview={onReview}
          />
        ) : (
          <>
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Reviews</h3>
          {reviewHint === "pending" ? (
            <div className="h-9 w-28 animate-pulse rounded-md bg-foreground/8" />
          ) : canReview ? (
            <Button size="sm" onClick={onReview}>
              <Plus className="size-4" />
              Write review
            </Button>
          ) : reviewHint === "confirm" ? (
            <Button size="sm" asChild>
              <a href="/confirm-email">Confirm email</a>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <a href="/login">Sign in to review</a>
            </Button>
          )}
        </div>
        {reviewHint === "guest" ? (
          <p className="mt-2 text-[0.75rem] text-subtle">
            Guests can read verified write-ups. Sign in and confirm your email to add one.
          </p>
        ) : null}

        <ul className="mt-3 space-y-3">
          {shownReviews.length === 0 ? (
            <li className="rounded-[var(--radius-lg)] bg-foreground/4 p-3.5 text-sm text-muted">
              No reviews yet. Add the first write-up for this stall.
            </li>
          ) : (
            shownReviews.map((review) => (
              <li key={review.id} className="rounded-[var(--radius-lg)] bg-foreground/4 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <ToiletRating value={review.rating} size="sm" />
                  <time className="text-[0.75rem] text-subtle" dateTime={review.createdAt}>
                    {safeRelative(review.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-[0.75rem] font-medium">
                  {review.reviewerName}
                  <span className="ml-1.5 font-normal text-subtle"> · Verified</span>
                </p>
                {review.reviewerTitle ? (
                  <p className="mt-1 text-[0.6875rem] font-medium tracking-wide text-primary">{review.reviewerTitle}</p>
                ) : null}
                <ReviewAspects review={review} />
                {formatOperatingHours(review) ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-muted">
                    <Clock className="size-3 shrink-0" />
                    {formatOperatingHours(review)}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AccessChip on={review.accessType === "customers"}>Customers only</AccessChip>
                  <AccessChip on={review.askForKey} icon={<KeyRound className="size-3" />}>
                    Ask for key
                  </AccessChip>
                </div>
                {review.critique ? <p className="mt-2 text-base leading-relaxed">{review.critique}</p> : null}
                {canReview ? <ReportReviewButton reviewId={review.id} /> : null}
              </li>
            ))
          )}
        </ul>

        <Separator className="my-4" />
        <h3 className="font-display text-lg font-semibold">Not here anymore?</h3>
        <p className="mt-1 text-[0.75rem] text-subtle">
          Mark a restroom gone if it closed, moved, or never had one the public can use.
        </p>
        {reviewHint === "pending" ? (
          <div className="mt-3 h-10 w-40 animate-pulse rounded-md bg-foreground/8" />
        ) : canReview ? (
          confirmRemove ? (
            <div className="mt-3 rounded-[var(--radius-lg)] bg-foreground/4 p-3">
              <p className="text-sm font-medium">Why remove it?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REMOVE_REASONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReason(option.value)}
                    className={cn(
                      "h-9 rounded-full px-3 text-sm",
                      reason === option.value ? "bg-primary text-primary-foreground" : "bg-surface",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setConfirmRemove(false)} disabled={removing}>
                  Keep it
                </Button>
                <Button variant="outline" onClick={() => onRemove(reason)} disabled={removing}>
                  {removing ? <FlushLoader className="size-4" /> : <MapPinOff className="size-4" />}
                  Remove pin
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="mt-3" onClick={() => setConfirmRemove(true)}>
              <MapPinOff className="size-4" />
              Restroom is gone
            </Button>
          )
        ) : (
          <Button variant="outline" className="mt-3" asChild>
            <a href={reviewHint === "confirm" ? "/confirm-email" : "/login"}>
              Sign in to remove
            </a>
          </Button>
        )}
          </>
        )}
      </div>
    </div>
  );
}

export function ReviewForm({
  bathroom,
  busy,
  onBack,
  onSubmit,
  onRemove,
  removing,
}: {
  bathroom: Bathroom;
  busy: boolean;
  onBack: () => void;
  onSubmit: (input: {
    rating: number;
    cleanliness: number;
    availability: number;
    accessibility: number;
    atmosphere: number;
    accessType: Exclude<AccessType, "unknown">;
    askForKey: boolean;
    critique: string;
    hoursOpen?: string;
    hoursClose?: string;
    daysOpen?: string[];
  }) => void;
  onRemove?: () => void;
  removing?: boolean;
}) {
  const [rating, setRating] = useState(4);
  const [cleanliness, setCleanliness] = useState(4);
  const [availability, setAvailability] = useState(4);
  const [accessibility, setAccessibility] = useState(4);
  const [atmosphere, setAtmosphere] = useState(4);
  const [customersOnly, setCustomersOnly] = useState(false);
  const [askForKey, setAskForKey] = useState(false);
  const [critique, setCritique] = useState("");
  const [hoursOpen, setHoursOpen] = useState("");
  const [hoursClose, setHoursClose] = useState("");
  const [daysOpen, setDaysOpen] = useState<WeekDay[]>([]);
  const [allDay, setAllDay] = useState(false);
  const [formTab, setFormTab] = useState<"ratings" | "hours">("ratings");
  const civil = isCivil(critique);
  const accessType: Exclude<AccessType, "unknown"> = customersOnly ? "customers" : "public";
  const points = reviewPoints({
    rating,
    critique,
    cleanliness,
    availability,
    accessibility,
    atmosphere,
    accessType,
    customersOnly,
    askForKey,
  });

  return (
    <form
      className="flex h-full min-h-0 flex-col overflow-y-auto pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!civil) return;
        onSubmit({
          rating,
          cleanliness,
          availability,
          accessibility,
          atmosphere,
          accessType,
          askForKey,
          critique: critique.trim(),
          hoursOpen: allDay ? "00:00" : hoursOpen || undefined,
          hoursClose: allDay ? "24:00" : hoursClose || undefined,
          daysOpen: allDay ? [...WEEK_DAYS] : daysOpen.length ? daysOpen : undefined,
        });
      }}
    >
      <BackButton onClick={onBack}>Back</BackButton>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Review {bathroom.name}</h2>
      <p className="mt-1 text-sm text-muted">Rate in toilets. 5 is pristine, 1 is a last resort.</p>
      <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Review sections">
        <button
          type="button"
          role="tab"
          aria-selected={formTab === "ratings"}
          className={cn(
            "h-11 rounded-full px-4 text-sm font-semibold",
            formTab === "ratings" ? "bg-foreground text-surface" : "bg-foreground/6 text-foreground",
          )}
          onClick={() => setFormTab("ratings")}
        >
          Ratings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={formTab === "hours"}
          data-ff-review-hours
          className={cn(
            "h-11 rounded-full px-4 text-sm font-semibold",
            formTab === "hours" ? "bg-foreground text-surface" : "bg-foreground/6 text-foreground",
          )}
          onClick={() => setFormTab("hours")}
        >
          Hours
        </button>
      </div>
      {onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={removing}
          onClick={onRemove}
        >
          {removing ? <FlushLoader className="size-4" /> : <MapPinOff className="size-4" />}
          Wrong pin? Remove it
        </Button>
      ) : null}

      <div className="mt-4 space-y-4">
        {formTab === "ratings" ? (
          <>
        <div>
          <Label>Overall</Label>
          <ToiletRating value={rating} size="lg" interactive onChange={setRating} className="mt-1" />
        </div>
        <div>
          <Label>Cleanliness</Label>
          <ToiletRating value={cleanliness} interactive onChange={setCleanliness} className="mt-1" />
        </div>
        <div>
          <Label>Availability</Label>
          <ToiletRating value={availability} interactive onChange={setAvailability} className="mt-1" />
        </div>
        <div>
          <Label>Accessibility</Label>
          <ToiletRating value={accessibility} interactive onChange={setAccessibility} className="mt-1" />
        </div>
        <div>
          <Label>Atmosphere</Label>
          <ToiletRating value={atmosphere} interactive onChange={setAtmosphere} className="mt-1" />
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Optional notes</legend>
          <p className="mt-1 text-[0.75rem] text-muted">Tap only if they apply. Neither is required.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCustomersOnly((on) => !on)}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm",
                customersOnly ? "bg-primary text-primary-foreground" : "bg-foreground/6",
              )}
            >
              <Store className="size-3.5" />
              Customers only
            </button>
            <button
              type="button"
              onClick={() => setAskForKey((on) => !on)}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm",
                askForKey ? "bg-primary text-primary-foreground" : "bg-foreground/6",
              )}
            >
              <KeyRound className="size-3.5" />
              Ask for key
            </button>
          </div>
        </fieldset>
        <div>
          <Label htmlFor="critique">Typed critique</Label>
          <Textarea
            id="critique"
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            placeholder="Locks, soap, line, smell, lighting — what should the next person know?"
            className="mt-1"
            maxLength={600}
          />
          {!civil ? <p className="mt-1 text-[0.75rem] text-danger">{CIVIL_COPY}</p> : null}
        </div>
          </>
        ) : (
        <fieldset data-ff-review-hours-fields>
          <legend className="font-display text-lg font-semibold">Operating hours</legend>
          <p className="mt-1 text-sm text-muted">
            Optional. Hours this restroom is actually open, not just the building.
          </p>
          <button
            type="button"
            className={cn(
              "mt-3 inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold",
              allDay ? "bg-primary text-primary-foreground" : "bg-foreground/6",
            )}
            onClick={() => {
              setAllDay((on) => {
                const next = !on;
                if (next) {
                  setHoursOpen("00:00");
                  setHoursClose("24:00");
                  setDaysOpen([...WEEK_DAYS]);
                } else {
                  setHoursOpen("");
                  setHoursClose("");
                }
                return next;
              });
            }}
          >
            Open 24 hours
          </button>
          {allDay ? (
            <p className="mt-3 text-sm text-muted">This stall is listed as always open.</p>
          ) : (
            <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="hours-open">Opens</Label>
              <Input
                id="hours-open"
                type="time"
                value={hoursOpen === "00:00" && hoursClose === "24:00" ? "" : hoursOpen}
                onChange={(e) => setHoursOpen(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
            <div>
              <Label htmlFor="hours-close">Closes</Label>
              <Input
                id="hours-close"
                type="time"
                value={hoursClose === "24:00" ? "" : hoursClose}
                onChange={(e) => setHoursClose(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium">Days open</p>
          <p className="mt-0.5 text-[0.75rem] text-muted">Leave blank if it is the same every day.</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {WEEK_DAYS.map((day) => {
              const on = daysOpen.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setDaysOpen((current) =>
                      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
                    )
                  }
                  className={cn(
                    "inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm",
                    on ? "bg-primary text-primary-foreground" : "bg-foreground/6",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
            </>
          )}
        </fieldset>
        )}
      </div>
      <p className="mt-3 text-[0.75rem] text-muted">This review earns {points} pts toward titles.</p>
      <Button type="submit" className="mt-4" disabled={busy || !civil}>
        {busy ? <FlushLoader className="size-4" /> : null}
        Post review
      </Button>
    </form>
  );
}

export function AddBathroomForm({
  draft,
  busy,
  onBack,
  onSubmit,
}: {
  draft: { lat: number; lng: number };
  busy: boolean;
  onBack: () => void;
  onSubmit: (input: {
    name: string;
    accessType: Exclude<AccessType, "unknown">;
    address: string;
    kind: VenueKind;
    personal: boolean;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [accessType, setAccessType] = useState<Exclude<AccessType, "unknown">>("public");
  const [kind, setKind] = useState<VenueKind>("toilet");
  const [personal, setPersonal] = useState(false);
  const civil = isCivil(name) && isCivil(address);

  return (
    <form
      className="flex h-full min-h-0 flex-col overflow-y-auto pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!civil || name.trim().length < 2) return;
        onSubmit({ name: name.trim(), accessType, address: address.trim(), kind, personal });
      }}
    >
      <BackButton onClick={onBack}>Cancel</BackButton>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Name this restroom</h2>
      <p className="mt-1 text-sm text-muted">
        Dropped at {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="room-name">Name</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main library, first floor"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="room-address">Address</Label>
          <Input
            id="room-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Near the north playground"
            className="mt-1"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Kind</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(VENUE_LABELS) as VenueKind[]).map((item) => (
              <button
                key={item}
                type="button"
                data-kind={item}
                onClick={() => {
                  setKind(item);
                  if (item === "home") setPersonal(true);
                }}
                className={cn("ff-filter", kind === item && "is-on")}
              >
                {VENUE_LABELS[item]}
              </button>
            ))}
          </div>
          {kind === "park" ? (
            <p className="mt-2 text-[0.75rem] text-subtle">
              Pin the stall itself — park entrances are not restrooms.
            </p>
          ) : null}
          {kind === "home" ? (
            <p className="mt-2 text-[0.75rem] text-subtle">
              Personal restrooms stay on your map unless you switch them to public use.
            </p>
          ) : null}
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Access</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccessType(opt.value)}
                className={cn(
                  "h-9 rounded-full px-3 text-sm",
                  accessType === opt.value ? "bg-primary text-primary-foreground" : "bg-foreground/6",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Who can see it?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPersonal(false)}
              className={cn(
                "h-9 rounded-full px-3 text-sm",
                !personal ? "bg-primary text-primary-foreground" : "bg-foreground/6",
              )}
            >
              Public use
            </button>
            <button
              type="button"
              onClick={() => setPersonal(true)}
              className={cn(
                "h-9 rounded-full px-3 text-sm",
                personal ? "bg-primary text-primary-foreground" : "bg-foreground/6",
              )}
            >
              Personal
            </button>
          </div>
          <p className="mt-2 text-[0.75rem] text-subtle">
            {personal
              ? "Only you will see this pin."
              : "Stays on your map until 6 verified accounts drop a public pin within 30 meters. Then it goes nationwide."}
          </p>
        </fieldset>
        {!civil ? <p className="text-[0.75rem] text-danger">{CIVIL_COPY}</p> : null}
      </div>
      <Button type="submit" className="mt-4" disabled={busy || !civil || name.trim().length < 2}>
        {busy ? <FlushLoader className="size-4" /> : null}
        Save and review
      </Button>
    </form>
  );
}
