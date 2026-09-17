import { useState, type ReactNode } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Accessibility,
  ChevronLeft,
  Footprints,
  LoaderCircle,
  MapPinOff,
  MapPinned,
  Navigation,
  Plus,
  KeyRound,
  Store,
  X,
} from "lucide-react";
import { ToiletRating } from "@/components/toilet-rating";
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
import type { AccessType, Bathroom, Review, VenueKind, WalkingRoute } from "@/lib/types";
import { CIVIL_COPY, isCivil } from "@/lib/moderation";
import { reviewPoints } from "@/lib/badges";
import { overallScore } from "@/lib/toilet-score";
import { cn } from "@/lib/utils";

export type NearbyFilter = "all" | "toilet" | "restaurant" | "gas" | "grocery" | "park" | "rated";

const FILTERS: { id: NearbyFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "toilet", label: "Restrooms" },
  { id: "restaurant", label: "Food" },
  { id: "gas", label: "Gas" },
  { id: "grocery", label: "Grocery" },
  { id: "park", label: "Parks" },
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
  zoomLocked,
}: {
  bathrooms: Bathroom[];
  origin: { lat: number; lng: number };
  filter: NearbyFilter;
  onFilter: (next: NearbyFilter) => void;
  onSelect: (id: string) => void;
  loading: boolean;
  zoomLocked?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">Nearby</p>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {zoomLocked ? "Zoom in to see places" : `${bathrooms.length} ${bathrooms.length === 1 ? "place" : "places"}`}
      </h2>
      {loading ? (
        <p className="sr-only" aria-live="polite">
          Loading restrooms
        </p>
      ) : null}
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilter(item.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-[0.75rem] font-medium",
              filter === item.id ? "bg-primary text-primary-foreground" : "bg-foreground/6 text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {bathrooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              className="flex w-full items-start gap-3 rounded-[var(--radius-lg)] px-2 py-2 text-left hover:bg-foreground/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{room.name}</p>
                <p className="text-[0.75rem] text-muted">{ratingCaption(room.avgRating, room.reviewCount)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="muted">{VENUE_LABELS[room.kind]}</Badge>
                  <Badge variant={room.customersOnly || room.accessType === "customers" ? "warn" : "outline"}>
                    Customers only
                  </Badge>
                  {room.askForKey ? <Badge variant="default">Ask for key</Badge> : null}
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
  onOpenMaps,
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
  onOpenMaps: (kind: "google" | "apple") => void;
  onRemove: (reason: (typeof REMOVE_REASONS)[number]["value"]) => void;
  removing: boolean;
  canReview: boolean;
  reviewHint: "guest" | "confirm" | "ready" | "pending";
}) {
  const shownReviews = reviews;
  const overall = overallScore(bathroom.avgRating, shownReviews);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState<(typeof REMOVE_REASONS)[number]["value"]>("gone");
  const canDeleteMine = bathroom.mine && bathroom.source === "user";
  return (
    <div className="pb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase">
            {VENUE_LABELS[bathroom.kind]} restroom
          </p>
          <h2 className="font-display mt-0.5 text-2xl font-semibold tracking-tight text-balance">{bathroom.name}</h2>
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
              {removing ? <LoaderCircle className="size-4 animate-spin" /> : <MapPinOff className="size-4" />}
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
        <p className="mt-1 text-[0.75rem] text-subtle">{VENUE_HINTS[bathroom.kind]}</p>

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
            {routing ? <LoaderCircle className="size-4 animate-spin" /> : <Footprints className="size-4" />}
            {route ? formatWalk(route.durationSeconds) : "Walk there"}
          </Button>
          <Button variant="outline" onClick={() => onOpenMaps("google")}>
            <Navigation className="size-4" />
            Google
          </Button>
          <Button variant="outline" onClick={() => onOpenMaps("apple")}>
            <MapPinned className="size-4" />
            Apple Maps
          </Button>
        </div>
        {!origin ? (
          <p className="mt-2 text-[0.75rem] text-subtle">Share your location to plot a walking route.</p>
        ) : null}

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <AccessChip on={review.accessType === "customers"}>Customers only</AccessChip>
                  <AccessChip on={review.askForKey} icon={<KeyRound className="size-3" />}>
                    Ask for key
                  </AccessChip>
                </div>
                {review.critique ? <p className="mt-2 text-base leading-relaxed">{review.critique}</p> : null}
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
                  {removing ? <LoaderCircle className="size-4 animate-spin" /> : <MapPinOff className="size-4" />}
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
        });
      }}
    >
      <BackButton onClick={onBack}>Back</BackButton>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Review {bathroom.name}</h2>
      <p className="mt-1 text-sm text-muted">Rate in toilets. 5 is pristine, 1 is a last resort.</p>
      {onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={removing}
          onClick={onRemove}
        >
          {removing ? <LoaderCircle className="size-4 animate-spin" /> : <MapPinOff className="size-4" />}
          Wrong pin? Remove it
        </Button>
      ) : null}

      <div className="mt-4 space-y-4">
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
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm",
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
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm",
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
      </div>
      <p className="mt-3 text-[0.75rem] text-muted">This review earns {points} pts toward titles.</p>
      <Button type="submit" className="mt-4" disabled={busy || !civil}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
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
                onClick={() => setKind(item)}
                className={cn(
                  "h-9 rounded-full px-3 text-sm",
                  kind === item ? "bg-primary text-primary-foreground" : "bg-foreground/6",
                )}
              >
                {VENUE_LABELS[item]}
              </button>
            ))}
          </div>
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
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Save and review
      </Button>
    </form>
  );
}
