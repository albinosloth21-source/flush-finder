import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, LocateFixed, Plus, Search, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  AddBathroomForm,
  BathroomDetail,
  NearbyList,
  ReviewForm,
  type NearbyFilter,
} from "@/components/bathroom-panel";
import { LogoMark, Wordmark } from "@/components/toilet-mark";
import { InstallPrompt } from "@/components/install-prompt";
import { HeaderAccount } from "@/components/account-bar";
import { FirstRunIntro, useIntroOpenEvent } from "@/components/first-run-intro";
import { HelpMenu } from "@/components/help-menu";
import { RoadTripSheet } from "@/components/road-trip-sheet";
import { setFeedbackMapCenter } from "@/components/feedback-sheet";
import { FlushLoader, FlushLoaderLogo } from "@/components/flush-loader";
import { celebratePoints, playFlush } from "@/lib/throne-fx";
import { introSeen } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addBathroom,
  addReview,
  getReviews,
  getWalkingRoute,
  listBathrooms,
  listOsmBathrooms,
  mergeBathrooms,
  reportGone,
  searchPlaces,
  getAddHold,
  deleteMyPin,
} from "@/lib/bathrooms";
import {
  getDeviceLocation,
  isFramed,
  locationHelpFor,
  openInNewTab,
  readLocationPermission,
  readManualSpot,
  writeManualSpot,
  type LocationHelp,
} from "@/lib/native";
import { composeMapPins, dropMinePin, keepMinePins, resolveOpenPin, reviewSheetOpen } from "@/lib/map-session";
import { loadPoiTiles } from "@/lib/poi-tiles";
import { ADD_SPAM_COPY } from "@/lib/pin-policy";
import { getReviewer } from "@/lib/reviewer";
import { usePersistentUser } from "@/lib/session-keep";
import { CONUS_BOUNDS, FEATURED_PLACES } from "@/lib/constants";
import { boundsFromView, viewFromBounds, writeSavedMapView } from "@/lib/map-view";
import { haversineMeters, roundBounds } from "@/lib/geo";
import {
  DEFAULT_RADIUS_MILES,
  RADIUS_MILES,
  boundsForRadius,
  matchesNearbyFilter,
  pinsInRadius,
  zoomForMiles,
  type RadiusMiles,
} from "@/lib/search-radius";
import {
  locatedStartView,
  shouldAskForLocation,
  shouldAutoLocate,
  shouldFitRadiusOnMap,
  usOverviewView,
  type LocationChoice,
} from "@/lib/map-start";
import { snapListSheet, snapReviewSheet, listSheetAfterPinTap, tapRevealsHiddenList, type ListSheet } from "@/lib/map-sheet";
import type { Bathroom, MapBounds, PlaceHit, WalkingRoute } from "@/lib/types";
import { CIVIL_COPY, isCivilError } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import type { FlyTo } from "@/components/map-canvas";

const MapCanvas = lazy(() => import("@/components/map-canvas"));

type View = "list" | "detail" | "review" | "add";

const LOCATION_CHOICE_KEY = "ff-location-choice";

function readLocationChoice(): LocationChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(LOCATION_CHOICE_KEY);
    if (value === "share" || value === "browse") return value;
  } catch {
    /* private mode */
  }
  return null;
}

function writeLocationChoice(choice: LocationChoice) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOCATION_CHOICE_KEY, choice);
  } catch {
    /* private mode */
  }
}

export function FinderApp() {
  const queryClient = useQueryClient();
  const [bounds, setBounds] = useState<MapBounds | null>(() => boundsFromView(usOverviewView()));
  const [selected, setSelected] = useState<Bathroom | null>(null);
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<NearbyFilter>("all");
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(DEFAULT_RADIUS_MILES);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationPrompt, setLocationPrompt] = useState(false);
  const [locationHelp, setLocationHelp] = useState<LocationHelp | null>(null);
  const [pickingSpot, setPickingSpot] = useState(false);
  const [roadTrip, setRoadTrip] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [flyTo, setFlyTo] = useState<FlyTo | null>(() => {
    const start = usOverviewView();
    return { seq: 1, lat: start.lat, lng: start.lng, zoom: start.zoom, fit: CONUS_BOUNDS };
  });
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [removedOsmIds, setRemovedOsmIds] = useState<string[]>([]);
  const [addNotice, setAddNotice] = useState<null | "warn" | "hold">(null);
  const [minePins, setMinePins] = useState<Bathroom[]>([]);
  const [listSheet, setListSheet] = useState<ListSheet>("mid");
  const persistTimer = useRef(0);
  const dragRef = useRef<{ y: number; tall: boolean } | null>(null);
  const listDrag = useRef<{ y: number; from: ListSheet } | null>(null);
  const [listDragY, setListDragY] = useState(0);
  const [reviewDragY, setReviewDragY] = useState(0);
  const boundsTicks = useRef(0);
  const { user, isPending: authPending } = usePersistentUser();
  // First-run intro runs before the location choice. null = not read yet (SSR/first paint).
  const [introReady, setIntroReady] = useState<boolean | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => {
    const seen = introSeen();
    setIntroOpen(!seen);
    setIntroReady(seen);
  }, []);
  useIntroOpenEvent(() => setIntroOpen(true));
  useEffect(() => {
    if (!bounds) return;
    setFeedbackMapCenter({ lat: (bounds.north + bounds.south) / 2, lng: (bounds.east + bounds.west) / 2 });
  }, [bounds]);

  const reviewerQuery = useQuery({
    queryKey: ["reviewer", user?.id],
    queryFn: () => getReviewer(),
    enabled: Boolean(user),
    retry: false,
  });

  useEffect(() => {
    if (!introReady) return;
    let cancelled = false;
    void (async () => {
      const choice = readLocationChoice();
      const permission = await readLocationPermission();
      if (cancelled) return;
      const manual = readManualSpot();
      if (!shouldAutoLocate(permission, choice)) {
        if (manual && choice !== "share") {
          applySpot(manual);
          return;
        }
        setLocationPrompt(shouldAskForLocation(permission, choice));
        return;
      }
      setLocating(true);
      try {
        const next = await getDeviceLocation();
        if (cancelled) return;
        const start = locatedStartView(next, DEFAULT_RADIUS_MILES);
        setUserLocation(next);
        setBounds(boundsFromView(start));
        setFlyTo({ seq: Date.now(), lat: start.lat, lng: start.lng, zoom: start.zoom });
        setLocationPrompt(false);
      } catch (err) {
        if (cancelled) return;
        if (manual) applySpot(manual);
        else setLocationPrompt(shouldAskForLocation(permission, choice));
        // They asked for location this session: say why it failed instead of silently showing the US map.
        if (!manual && choice === "share") setLocationHelp(locationHelpFor(err));
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [introReady]);

  function rememberBounds(next: MapBounds) {
    boundsTicks.current += 1;
    setBounds(next);
    if (typeof window === "undefined") return;
    window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => writeSavedMapView(viewFromBounds(next)), 350);
  }

  const mapCenter = useMemo(
    () => (bounds ? boundsCenter(bounds) : usOverviewView()),
    [bounds],
  );
  const mapZoom = bounds?.zoom ?? usOverviewView().zoom;
  const localSearch = shouldFitRadiusOnMap(mapZoom);
  const searchBox = boundsForRadius(mapCenter, radiusMiles);
  const rounded = roundBounds(searchBox);

  const bathroomsQuery = useQuery({
    queryKey: ["bathrooms", rounded],
    queryFn: () => listBathrooms({ data: rounded }),
    enabled: Boolean(rounded) && localSearch,
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  const osmQuery = useQuery({
    queryKey: ["osm-bathrooms", rounded],
    queryFn: () => listOsmBathrooms({ data: rounded }),
    enabled: Boolean(rounded) && localSearch,
    staleTime: 90_000,
    placeholderData: (prev) => prev,
  });

  const tileQuery = useQuery({
    queryKey: ["poi-tiles", rounded],
    queryFn: () => loadPoiTiles(rounded),
    enabled: Boolean(rounded) && localSearch,
    staleTime: Infinity,
    placeholderData: (prev) => prev,
  });

  const bathrooms = useMemo(() => {
    const all = composeMapPins({
      zoom: 16,
      minZoom: 0,
      db: bathroomsQuery.data ?? [],
      osm: [...(tileQuery.data ?? []), ...(osmQuery.data ?? [])],
      mine: minePins,
      removedIds,
      removedOsmIds,
    });
    return pinsInRadius(all, mapCenter, radiusMiles);
  }, [bathroomsQuery.data, osmQuery.data, tileQuery.data, minePins, removedIds, removedOsmIds, mapCenter, radiusMiles]);
  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const fresh = bathrooms.find((b) => b.id === selectedId);
    if (fresh) setSelected(fresh);
  }, [bathrooms, selectedId]);

  const reviewsQuery = useQuery({
    queryKey: ["reviews", selectedId],
    queryFn: () => getReviews({ data: { bathroomId: selectedId! } }),
    enabled: Boolean(selectedId) && (view === "detail" || view === "review"),
  });

  const origin = userLocation ?? mapCenter;

  const filtered = useMemo(() => {
    const list = bathrooms.filter((room) => matchesNearbyFilter(room, filter));
    return list.sort((a, b) => haversineMeters(origin, a) - haversineMeters(origin, b));
  }, [bathrooms, filter, origin]);

  const deferredQuery = useDeferredValue(query.trim());
  const placeQuery = useQuery({
    queryKey: ["places", deferredQuery],
    queryFn: () => searchPlaces({ data: { q: deferredQuery } }),
    enabled: deferredQuery.length >= 2,
  });

  const reviewMutation = useMutation({
    mutationFn: addReview,
    onSuccess: (result) => {
      mergeBathroom(queryClient, result.bathroom);
      queryClient.setQueryData(["reviews", result.bathroom.id], result.reviews);
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setSelected(result.bathroom);
      setView("detail");
      setExpanded(true);
      playFlush();
      if (result.pointsEarned) celebratePoints(result.pointsEarned);
      toast.success(result.pointsEarned ? `Review posted · +${result.pointsEarned} pts` : "Review posted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Confirm your email")) {
        toast.error("Confirm your email to review.");
        window.location.href = "/confirm-email";
        return;
      }
      if (message === "Unauthorized") {
        toast.error("Sign in with a verified account to review.");
        window.location.href = "/login";
        return;
      }
      toast.error(isCivilError(err) ? CIVIL_COPY : "Could not post that review");
    },
  });

  const addMutation = useMutation({
    mutationFn: addBathroom,
    onSuccess: (result) => {
      const room = { ...result.bathroom, mine: true };
      mergeBathroom(queryClient, room);
      setMinePins((pins) => keepMinePins(pins, room));
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setDraft(null);
      setPlacing(false);
      setSelected(room);
      setView("review");
      setExpanded(true);
      if (result.nationwide && result.pointsEarned) celebratePoints(result.pointsEarned);
      toast.success(
        result.nationwide
          ? result.pointsEarned
            ? `Nationwide · +${result.pointsEarned} pts · add your review`
            : "Nationwide · add your review"
          : result.bathroom.visibility === "personal"
            ? "Named · now add your review. Only you can see this pin."
            : "Named · on your map until verified. Points after it goes nationwide.",
      );
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";
      if (message === "Unauthorized" || message.includes("Confirm your email")) {
        toast.error("Verified accounts can add restrooms.");
        window.location.href = message.includes("Confirm") ? "/confirm-email" : "/login";
        return;
      }
      if (message.startsWith("HOLD:")) {
        setAddNotice("hold");
        setPlacing(false);
        setDraft(null);
        setView("list");
        return;
      }
      toast.error(isCivilError(err) ? CIVIL_COPY : "Could not save that restroom");
    },
  });

  function forgetPin(id: string, osmId: string | null) {
    setRemovedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    if (osmId) {
      setRemovedOsmIds((ids) => (ids.includes(osmId) ? ids : [...ids, osmId]));
    }
    dropBathroom(queryClient, id, osmId);
    setMinePins((pins) => dropMinePin(pins, id));
    setSelected(null);
    setView("list");
    setExpanded(false);
    setPinBusy(false);
  }

  const goneMutation = useMutation({
    mutationFn: reportGone,
    onSuccess: (result) => {
      forgetPin(result.id, result.osmId);
      toast.success("Removed from the map");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Confirm your email")) {
        toast.error("Confirm your email to remove a restroom.");
        window.location.href = "/confirm-email";
        return;
      }
      if (message === "Unauthorized") {
        toast.error("Sign in with a verified account to remove a restroom.");
        window.location.href = "/login";
        return;
      }
      toast.error("Could not remove that restroom");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMyPin({ data: { id } }),
    onSuccess: (result) => {
      forgetPin(result.id, result.osmId);
      toast.success("Pin removed");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not remove that pin");
    },
  });

  const routeMutation = useMutation({
    mutationFn: getWalkingRoute,
    onSuccess: (next) => setRoute(next),
    onError: () => toast.error("Could not plot a walking route"),
  });

  function flyToUser(next: { lat: number; lng: number }) {
    const start = locatedStartView(next, radiusMiles);
    setUserLocation(next);
    setBounds(boundsFromView(start));
    setFlyTo({ seq: Date.now(), lat: start.lat, lng: start.lng, zoom: start.zoom });
    setLocationPrompt(false);
  }

  function applySpot(next: { lat: number; lng: number }) {
    const start = locatedStartView(next, DEFAULT_RADIUS_MILES);
    setUserLocation({ lat: next.lat, lng: next.lng });
    setBounds(boundsFromView(start));
    setFlyTo({ seq: Date.now(), lat: start.lat, lng: start.lng, zoom: start.zoom });
    setLocationPrompt(false);
  }

  function startPickingSpot() {
    setLocationHelp(null);
    setLocationPrompt(false);
    setPlacing(false);
    setPickingSpot(true);
  }

  function setSpotFromMap(pos: { lat: number; lng: number }) {
    setPickingSpot(false);
    writeManualSpot(pos.lat, pos.lng);
    flyToUser(pos);
    toast.success("Spot saved. Restrooms near it are shown.");
  }

  function searchInstead() {
    setLocationHelp(null);
    setLocationPrompt(false);
    setSearchOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function locate() {
    if (locating) return;
    setLocationPrompt(false);
    setLocationHelp(null);
    setPickingSpot(false);
    setLocating(true);
    void getDeviceLocation()
      .then((next) => {
        writeLocationChoice("share");
        flyToUser(next);
        setLocating(false);
      })
      .catch((err: unknown) => {
        if (typeof console !== "undefined") console.warn("[flush-finder] location failed", err);
        writeLocationChoice("browse");
        setLocationHelp(locationHelpFor(err));
        setLocating(false);
      });
  }

  function skipLocation() {
    writeLocationChoice("browse");
    setLocationPrompt(false);
    setLocationHelp(null);
    const start = usOverviewView();
    setBounds(boundsFromView(start));
    setFlyTo({ seq: Date.now(), lat: start.lat, lng: start.lng, zoom: start.zoom, fit: CONUS_BOUNDS });
  }

  function changeRadius(miles: RadiusMiles) {
    setRadiusMiles(miles);
    const zoom = bounds?.zoom ?? usOverviewView().zoom;
    if (!shouldFitRadiusOnMap(zoom)) return;
    const center = bounds ? boundsCenter(bounds) : usOverviewView();
    setFlyTo({ seq: Date.now(), lat: center.lat, lng: center.lng, zoom: zoomForMiles(miles) });
  }

  function selectRoom(room: Bathroom | null) {
    setRoute(null);
    setSelected(room);
    setView(room ? "detail" : "list");
    setExpanded(false);
    setPinBusy(Boolean(room));
    if (room) {
      setListSheet(listSheetAfterPinTap());
      window.setTimeout(() => setPinBusy(false), 350);
    }
  }

  function pickPlace(hit: PlaceHit) {
    setQuery(hit.label);
    setSearchOpen(false);
    setFlyTo({ seq: Date.now(), lat: hit.lat, lng: hit.lng, zoom: 16 });
  }

  const canReview = Boolean(user && reviewerQuery.data?.confirmed);
  const reviewHint: "guest" | "confirm" | "ready" | "pending" = authPending
    ? "pending"
    : !user
      ? "guest"
      : reviewerQuery.isPending
        ? "pending"
        : reviewerQuery.data?.confirmed
          ? "ready"
          : "confirm";

  const sheetOpen = reviewSheetOpen({ view, selectedId, draft });
  const sheetPlace = selected;
  const sheetTall = expanded && sheetOpen;

  return (
    <div className="relative h-dvh overflow-hidden bg-background" data-ff-start={userLocation ? "here" : "us"}>
      <Suspense fallback={<div className="grid h-full w-full place-items-center bg-foreground/10"><FlushLoaderLogo label="Loading the map" /></div>}>
        <MapCanvas
          bathrooms={filtered}
          selectedId={selectedId}
          pinBusy={pinBusy}
          userLocation={userLocation}
          route={route}
          placing={placing || pickingSpot}
          draft={draft}
          flyTo={flyTo}
          radiusMiles={radiusMiles}
          onSelect={(id) => {
            if (view === "add" && draft && !id) return;
            if (!id) {
              setDraft(null);
              selectRoom(null);
              return;
            }
            setDraft(null);
            const room = resolveOpenPin(id, bathrooms, selected);
            if (room) selectRoom(room);
          }}
          onBounds={rememberBounds}
          onPlace={(pos) => {
            if (pickingSpot) {
              setSpotFromMap(pos);
              return;
            }
            setDraft(pos);
            setPlacing(false);
            setSelected(null);
            setView("add");
            setExpanded(true);
            setFlyTo({
              seq: Date.now(),
              lat: pos.lat,
              lng: pos.lng,
              zoom: Math.max(bounds?.zoom ?? 16, 15),
              padBottom: true,
            });
          }}
        />
      </Suspense>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[220] px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          <div className="ff-sheet flex items-center gap-2 rounded-[var(--radius-xl)] bg-surface p-2 pl-3">
            <LogoMark className="size-9 shrink-0" />
            <Wordmark className="hidden h-7 max-w-[9.5rem] sm:block" />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Snoop to Poop"
                aria-label="Search a place"
                className="h-11 border-0 bg-foreground/5 pl-9"
              />
              {query ? (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center text-muted"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={locate}
              disabled={locating}
              aria-label="Re-center to my location"
              title="Re-center"
            >
              {locating ? <FlushLoader className="size-4" /> : <LocateFixed className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Add a restroom"
              onClick={() => {
                if (!user) {
                  window.location.href = "/login";
                  return;
                }
                void getAddHold()
                  .then((status) => {
                    if (status.heldUntil) {
                      setAddNotice("hold");
                      return;
                    }
                    setAddNotice("warn");
                  })
                  .catch(() => setAddNotice("warn"));
              }}
            >
              <Plus className="size-4" />
            </Button>
            <HelpMenu />
            <HeaderAccount />
          </div>
          {searchOpen && (placeQuery.data?.length || FEATURED_PLACES.length) ? (
            <div className="ff-sheet absolute inset-x-0 top-full z-40 mt-1 max-h-[min(50dvh,24rem)] overflow-y-auto rounded-[var(--radius-xl)] bg-surface p-2 shadow-[var(--shadow-border)]">
              {(placeQuery.data?.length ? placeQuery.data : FEATURED_PLACES.map((p) => ({ label: p.label, lat: p.lat, lng: p.lng }))).map((hit) => (
                <button
                  key={`${hit.label}-${hit.lat}`}
                  type="button"
                  className="flex w-full rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm hover:bg-foreground/5"
                  onClick={() => pickPlace(hit)}
                >
                  {hit.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {/* First in the row so it is never scrolled off the right edge on phones. */}
            <button
              type="button"
              className="ff-radius-chip ff-trip-chip shrink-0"
              data-ff-road-trip-open="true"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(false);
                setRoadTrip(true);
              }}
            >
              <Car className="size-3.5" />
              Road trip
            </button>
            {RADIUS_MILES.map((miles) => (
              <button
                key={miles}
                type="button"
                className={cn("ff-radius-chip", radiusMiles === miles && "is-on")}
                onClick={() => changeRadius(miles)}
              >
                {miles} {miles === 1 ? "mile" : "miles"}
              </button>
            ))}
            <button
              type="button"
              className="ff-radius-chip"
              onClick={locate}
              disabled={locating}
            >
              {locating ? "Finding you" : "Re-center"}
            </button>
          </div>
          {locationPrompt ? (
            <div
              className="ff-sheet mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] bg-surface p-2 pl-3"
              data-ff-location-prompt="true"
            >
              <p className="min-w-0 flex-1 text-sm leading-snug">
                Start on you, or browse the United States.
              </p>
              <Button size="sm" onClick={locate} disabled={locating}>
                {locating ? <FlushLoader className="size-4" /> : <LocateFixed className="size-4" />}
                Use my location
              </Button>
              <Button size="sm" variant="outline" onClick={skipLocation} disabled={locating}>
                Browse the United States
              </Button>
            </div>
          ) : null}
          {pickingSpot ? (
            <div
              className="ff-sheet mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] bg-surface p-2 pl-3"
              data-ff-pick-spot="true"
            >
              <p className="min-w-0 flex-1 text-sm leading-snug">Tap the map where you are.</p>
              <Button size="sm" variant="outline" onClick={() => setPickingSpot(false)}>
                Cancel
              </Button>
            </div>
          ) : null}
          {locationHelp ? (
            <div
              className="ff-sheet mt-2 flex flex-col gap-2 rounded-[var(--radius-xl)] bg-surface p-3"
              data-ff-location-help="true"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{locationHelp.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-subtle">{locationHelp.message}</p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  className="rounded-full p-1 text-subtle"
                  onClick={() => setLocationHelp(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {locationHelp.actions.includes("open-tab") && isFramed() ? (
                  <Button size="sm" onClick={openInNewTab}>
                    Open in new tab
                  </Button>
                ) : null}
                {locationHelp.actions.includes("retry") ? (
                  <Button size="sm" onClick={locate} disabled={locating}>
                    <LocateFixed className="size-4" />
                    Try again
                  </Button>
                ) : null}
                {locationHelp.actions.includes("tap-map") ? (
                  <Button size="sm" variant="outline" onClick={startPickingSpot}>
                    Tap the map to set my spot
                  </Button>
                ) : null}
                {locationHelp.actions.includes("search") ? (
                  <Button size="sm" variant="outline" onClick={searchInstead} aria-label="Search a place">
                    <Search className="size-4" />
                    Snoop to Poop
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {pinBusy ? (
        <div className="ff-sheet pointer-events-none fixed top-[22%] left-1/2 z-[300] flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-border)]">
          <FlushLoader className="size-4" />
          Opening reviews
        </div>
      ) : null}

      <section
        className={cn(
          "ff-list-sheet ff-sheet pointer-events-auto absolute inset-x-0 z-20 flex flex-col overflow-hidden rounded-t-[var(--radius-2xl)] bg-surface px-[max(1rem,env(safe-area-inset-left))] pt-1 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          sheetOpen ? "is-away" : listSheet === "hidden" ? "is-hidden" : listSheet === "tall" ? "is-tall" : "is-mid",
          listDragY ? "is-dragging" : "",
        )}
        style={
          !sheetOpen && listDragY
            ? {
                transform:
                  listSheet === "hidden"
                    ? `translateY(calc(110% + ${listDragY}px))`
                    : `translateY(${Math.max(0, listDragY)}px)`,
              }
            : undefined
        }
        data-ff-list-sheet={listSheet}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("[data-ff-sheet-handle]")) return;
          listDrag.current = { y: event.clientY, from: listSheet };
          setListDragY(0);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* synthetic events cannot capture */
          }
        }}
        onPointerMove={(event) => {
          const start = listDrag.current;
          if (!start) return;
          setListDragY(event.clientY - start.y);
        }}
        onPointerUp={(event) => {
          const start = listDrag.current;
          listDrag.current = null;
          setListDragY(0);
          if (!start) return;
          const dy = start.y - event.clientY;
          if (tapRevealsHiddenList(start.from, dy)) {
            setListSheet("mid");
            return;
          }
          setListSheet(snapListSheet(start.from, dy));
        }}
        onPointerCancel={() => {
          listDrag.current = null;
          setListDragY(0);
        }}
      >
        <button
          type="button"
          data-ff-sheet-handle
          className="mx-auto flex h-11 w-full max-w-xs shrink-0 items-center justify-center touch-none"
          aria-label={listSheet === "tall" ? "Slide nearby list" : "Slide nearby list down to hide"}
        >
          <span className="block h-1.5 w-12 rounded-full bg-foreground/18" />
        </button>
        <NearbyList
          bathrooms={filtered}
          origin={origin}
          filter={filter}
          onFilter={setFilter}
          radiusMiles={radiusMiles}
          zoomedOut={!localSearch}
          onSelect={(id) => {
            const room = resolveOpenPin(id, bathrooms, selected);
            if (room) selectRoom(room);
          }}
          loading={(bathroomsQuery.isFetching || osmQuery.isFetching || tileQuery.isFetching) && bathrooms.length === 0}
        />
      </section>

      {listSheet === "hidden" && !sheetOpen ? (
        <div
          data-ff-sheet-handle
          data-ff-list-peek
          className="ff-list-peek"
          role="button"
          tabIndex={0}
          aria-label="Swipe up nearby restrooms"
          onPointerDown={(event) => {
            listDrag.current = { y: event.clientY, from: "hidden" };
            setListDragY(0);
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              /* synthetic events cannot capture */
            }
          }}
          onPointerMove={(event) => {
            const start = listDrag.current;
            if (!start) return;
            setListDragY(event.clientY - start.y);
          }}
          onPointerUp={(event) => {
            const start = listDrag.current;
            listDrag.current = null;
            setListDragY(0);
            if (!start) return;
            const dy = start.y - event.clientY;
            if (tapRevealsHiddenList(start.from, dy)) {
              setListSheet("mid");
              return;
            }
            setListSheet(snapListSheet(start.from, dy));
          }}
          onPointerCancel={() => {
            listDrag.current = null;
            setListDragY(0);
          }}
        >
          <span className="block h-1.5 w-12 rounded-full bg-foreground/20" />
        </div>
      ) : null}

      <section
        className={cn(
          "ff-review-sheet ff-sheet fixed inset-x-0 z-[250] flex flex-col bg-surface px-[max(1rem,env(safe-area-inset-left))] pt-1 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))]",
          sheetOpen ? "is-open" : "",
          sheetTall ? "is-tall" : "",
          reviewDragY > 0 ? "is-dragging" : "",
        )}
        style={sheetOpen && reviewDragY > 0 ? { transform: `translateY(${reviewDragY}px)` } : undefined}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("[data-ff-sheet-handle]")) return;
          dragRef.current = { y: event.clientY, tall: sheetTall };
          setReviewDragY(0);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* synthetic events cannot capture */
          }
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start) return;
          setReviewDragY(Math.max(0, event.clientY - start.y));
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          setReviewDragY(0);
          if (!start) return;
          const next = snapReviewSheet({ tall: start.tall, dy: start.y - event.clientY });
          if (next === "tall") setExpanded(true);
          else if (next === "mid") setExpanded(false);
          else selectRoom(null);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setReviewDragY(0);
        }}
      >
        <div className="relative mx-auto mb-1 flex h-11 w-full shrink-0 items-center justify-center">
          <button
            type="button"
            data-ff-sheet-handle
            className="flex h-11 w-full max-w-xs items-center justify-center"
            aria-label={sheetTall ? "Slide reviews" : "Slide reviews down to hide"}
          >
            <span className="block h-1.5 w-12 rounded-full bg-foreground/18" />
          </button>
          <button
            type="button"
            aria-label="Hide reviews"
            className="absolute right-0 grid size-10 place-items-center rounded-full text-muted hover:bg-foreground/6 hover:text-foreground"
            onClick={() => selectRoom(null)}
          >
            <ChevronDown className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "add" && draft ? (
            <AddBathroomForm
              draft={draft}
              busy={addMutation.isPending}
              onBack={() => {
                setDraft(null);
                setView("list");
                setExpanded(false);
              }}
              onSubmit={(input) => {
                addMutation.mutate({
                  data: {
                    name: input.name,
                    lat: draft.lat,
                    lng: draft.lng,
                    accessType: input.accessType,
                    address: input.address || undefined,
                    kind: input.kind,
                    personal: input.personal,
                  },
                });
              }}
            />
          ) : view === "review" && sheetPlace ? (
            <ReviewForm
              bathroom={sheetPlace}
              busy={reviewMutation.isPending}
              onBack={() => setView("detail")}
              onRemove={
                sheetPlace.mine && sheetPlace.source === "user"
                  ? () => deleteMutation.mutate(sheetPlace.id)
                  : undefined
              }
              removing={deleteMutation.isPending}
              onSubmit={(input) => {
                reviewMutation.mutate({
                  data: {
                    bathroom: {
                      id: sheetPlace.id,
                      osmId: sheetPlace.osmId,
                      name: sheetPlace.name,
                      lat: sheetPlace.lat,
                      lng: sheetPlace.lng,
                      accessType: sheetPlace.accessType,
                      fee: sheetPlace.fee,
                      wheelchair: sheetPlace.wheelchair,
                      address: sheetPlace.address,
                      source: sheetPlace.source,
                      kind: sheetPlace.kind,
                    },
                    ...input,
                  },
                });
              }}
            />
          ) : sheetPlace ? (
            <BathroomDetail
              bathroom={sheetPlace}
              reviews={reviewsQuery.data ?? []}
              reviewsLoading={reviewsQuery.isFetching}
              origin={userLocation}
              route={route}
              routing={routeMutation.isPending}
              onBack={() => selectRoom(null)}
              onReview={() => setView("review")}
              onWalk={() => {
                if (!userLocation) {
                  toast.error("Share your location to walk there.");
                  return;
                }
                routeMutation.mutate({
                  data: {
                    fromLat: userLocation.lat,
                    fromLng: userLocation.lng,
                    toLat: sheetPlace.lat,
                    toLng: sheetPlace.lng,
                  },
                });
              }}
              onRemove={(reason) => {
                if (sheetPlace.mine && sheetPlace.source === "user") {
                  deleteMutation.mutate(sheetPlace.id);
                  return;
                }
                goneMutation.mutate({
                  data: {
                    id: sheetPlace.id,
                    osmId: sheetPlace.osmId,
                    name: sheetPlace.name,
                    lat: sheetPlace.lat,
                    lng: sheetPlace.lng,
                    reason,
                  },
                });
              }}
              removing={goneMutation.isPending || deleteMutation.isPending}
              canReview={canReview}
              reviewHint={reviewHint}
            />
          ) : null}
        </div>
      </section>

      {addNotice ? (
        <div className="fixed inset-0 z-[320] grid place-items-center bg-foreground/30 px-4">
          <div className="ff-sheet w-full max-w-sm rounded-[var(--radius-xl)] bg-surface p-4">
            <p className="font-display text-lg font-semibold">
              {addNotice === "hold" ? "Temporary hold" : "Before you add"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{ADD_SPAM_COPY}</p>
            {addNotice === "hold" ? (
              <p className="mt-2 text-sm text-muted">You can add again in 30 minutes.</p>
            ) : null}
            <Button
              variant="good"
              className="mt-4 w-full"
              onClick={() => {
                const next = addNotice;
                setAddNotice(null);
                if (next === "warn") {
                  setPlacing(true);
                  setSelected(null);
                  setView("list");
                  toast.message("Tap the map to drop a restroom pin");
                }
              }}
            >
              I Understand
            </Button>
          </div>
        </div>
      ) : null}
      {roadTrip ? (
        <RoadTripSheet
          origin={userLocation}
          knownRooms={bathroomsQuery.data ?? []}
          onClose={() => setRoadTrip(false)}
          onPick={(room) => {
            setRoadTrip(false);
            setFlyTo({ seq: Date.now(), lat: room.lat, lng: room.lng, zoom: 16, padBottom: true });
            selectRoom(room);
          }}
        />
      ) : null}
      <InstallPrompt />
      {introOpen ? (
        <FirstRunIntro
          onDone={() => {
            setIntroOpen(false);
            setIntroReady(true);
          }}
        />
      ) : null}
    </div>
  );
}

function boundsCenter(bounds: MapBounds) {
  return {
    lat: (bounds.south + bounds.north) / 2,
    lng: (bounds.west + bounds.east) / 2,
  };
}

function mergeBathroom(queryClient: ReturnType<typeof useQueryClient>, room: Bathroom) {
  queryClient.setQueriesData<Bathroom[]>({ queryKey: ["bathrooms"] }, (old) => {
    if (!old) return [room];
    const idx = old.findIndex((b) => b.id === room.id);
    if (idx === -1) return [room, ...old];
    const next = old.slice();
    next[idx] = room;
    return next;
  });
}

function dropBathroom(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  osmId: string | null,
) {
  const drop = (old: Bathroom[] | undefined) =>
    (old ?? []).filter((room) => room.id !== id && !(osmId && room.osmId === osmId));
  queryClient.setQueriesData<Bathroom[]>({ queryKey: ["bathrooms"] }, drop);
  queryClient.setQueriesData<Bathroom[]>({ queryKey: ["osm-bathrooms"] }, drop);
}
