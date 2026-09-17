import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocateFixed, LoaderCircle, Plus, Search, X } from "lucide-react";
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
import { getDeviceLocation } from "@/lib/native";
import { composeMapPins, dropMinePin, keepMinePins, resolveOpenPin, reviewSheetOpen } from "@/lib/map-session";
import { loadPoiTiles } from "@/lib/poi-tiles";
import { ADD_SPAM_COPY } from "@/lib/pin-policy";
import { getReviewer } from "@/lib/reviewer";
import { usePersistentUser } from "@/lib/session-keep";
import { DEFAULT_CENTER, DEFAULT_ZOOM, FEATURED_PLACES, PIN_MIN_ZOOM } from "@/lib/constants";
import { boundsFromView, readSavedMapView, viewFromBounds, writeSavedMapView } from "@/lib/map-view";
import { directionsUrl, haversineMeters, roundBounds } from "@/lib/geo";
import type { Bathroom, MapBounds, PlaceHit, WalkingRoute } from "@/lib/types";
import { CIVIL_COPY, isCivilError } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import type { FlyTo } from "@/components/map-canvas";

const MapCanvas = lazy(() => import("@/components/map-canvas"));

type View = "list" | "detail" | "review" | "add";

export function FinderApp() {
  const queryClient = useQueryClient();
  const [bounds, setBounds] = useState<MapBounds | null>(() =>
    boundsFromView({ ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM }),
  );
  const [selected, setSelected] = useState<Bathroom | null>(null);
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<NearbyFilter>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState<FlyTo | null>({
    seq: 1,
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
    zoom: DEFAULT_ZOOM,
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
  const persistTimer = useRef(0);
  const dragRef = useRef<{ y: number; tall: boolean } | null>(null);
  const { user, isPending: authPending } = usePersistentUser();

  const reviewerQuery = useQuery({
    queryKey: ["reviewer", user?.id],
    queryFn: () => getReviewer(),
    enabled: Boolean(user),
    retry: false,
  });

  useEffect(() => {
    const saved = readSavedMapView();
    setBounds(boundsFromView(saved));
    setFlyTo({ seq: Date.now(), lat: saved.lat, lng: saved.lng, zoom: saved.zoom });
  }, []);

  function rememberBounds(next: MapBounds) {
    setBounds(next);
    if (typeof window === "undefined") return;
    window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => writeSavedMapView(viewFromBounds(next)), 350);
  }

  const rounded = bounds ? roundBounds(bounds) : null;
  const pinsVisible = (bounds?.zoom ?? DEFAULT_ZOOM) >= PIN_MIN_ZOOM;

  useEffect(() => {
    if (pinsVisible) return;
    setSelected(null);
    setView("list");
    setPinBusy(false);
    setDraft(null);
    setPlacing(false);
  }, [pinsVisible]);

  const bathroomsQuery = useQuery({
    queryKey: ["bathrooms", rounded],
    queryFn: () => listBathrooms({ data: rounded! }),
    enabled: Boolean(rounded) && pinsVisible,
    staleTime: 45_000,
    placeholderData: (prev) => prev,
  });

  const osmQuery = useQuery({
    queryKey: ["osm-bathrooms", rounded],
    queryFn: () => listOsmBathrooms({ data: rounded! }),
    enabled: Boolean(rounded) && pinsVisible,
    staleTime: 90_000,
    placeholderData: (prev) => prev,
  });

  const tileQuery = useQuery({
    queryKey: ["poi-tiles", rounded],
    queryFn: () => loadPoiTiles(rounded!),
    enabled: Boolean(rounded) && pinsVisible,
    staleTime: Infinity,
    placeholderData: (prev) => prev,
  });

  const bathrooms = useMemo(() => {
    return composeMapPins({
      zoom: bounds?.zoom ?? DEFAULT_ZOOM,
      db: bathroomsQuery.data ?? [],
      osm: [...(tileQuery.data ?? []), ...(osmQuery.data ?? [])],
      mine: minePins,
      removedIds,
      removedOsmIds,
    });
  }, [bathroomsQuery.data, osmQuery.data, tileQuery.data, minePins, removedIds, removedOsmIds, bounds?.zoom]);
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

  const origin = userLocation ?? (bounds ? boundsCenter(bounds) : DEFAULT_CENTER);

  const filtered = useMemo(() => {
    const list = bathrooms.filter((room) => {
      if (filter === "rated") return room.reviewCount > 0;
      if (filter === "all") return true;
      return room.kind === filter;
    });
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

  function locate() {
    setLocating(true);
    void getDeviceLocation()
      .then((next) => {
        setUserLocation(next);
        setFlyTo({ seq: Date.now(), lat: next.lat, lng: next.lng, zoom: 16 });
        setLocating(false);
      })
      .catch(() => {
        toast.error("Location is not available on this device.");
        setLocating(false);
      });
  }

  function selectRoom(room: Bathroom | null) {
    setRoute(null);
    setSelected(room);
    setView(room ? "detail" : "list");
    setExpanded(Boolean(room));
    setPinBusy(Boolean(room));
    if (room) {
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
    <div className="relative h-dvh overflow-hidden bg-background">
      <Suspense fallback={<div className="h-full w-full bg-foreground/10" />}>
        <MapCanvas
          bathrooms={pinsVisible ? bathrooms : []}
          selectedId={selectedId}
          pinBusy={pinBusy}
          userLocation={userLocation}
          route={route}
          placing={placing}
          draft={draft}
          flyTo={flyTo}
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
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search a place"
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
              aria-label="Use my location"
            >
              {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
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
        </div>
      </header>

      {!pinsVisible ? (
        <div className="ff-sheet pointer-events-none absolute top-3 left-1/2 z-[240] flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium shadow-[var(--shadow-border)]">
          Zoom in to see restrooms
        </div>
      ) : null}

      {pinBusy ? (
        <div className="ff-sheet pointer-events-none fixed top-[22%] left-1/2 z-[300] flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-border)]">
          <LoaderCircle className="size-4 animate-spin" />
          Opening reviews
        </div>
      ) : null}

      <section
        className={cn(
          "ff-list-sheet ff-sheet pointer-events-auto absolute inset-x-0 z-20 flex flex-col rounded-t-[var(--radius-2xl)] bg-surface px-[max(1rem,env(safe-area-inset-left))] pt-2 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[height,transform,opacity] duration-[var(--motion-slow)] ease-[var(--ease-smooth-out)]",
          sheetOpen ? "pointer-events-none translate-y-8 opacity-0" : "bottom-0 h-[min(38dvh,22rem)]",
        )}
      >
        <NearbyList
          bathrooms={filtered}
          origin={origin}
          filter={filter}
          onFilter={setFilter}
          onSelect={(id) => {
            const room = resolveOpenPin(id, bathrooms, selected);
            if (room) selectRoom(room);
          }}
          loading={(bathroomsQuery.isFetching || osmQuery.isFetching || tileQuery.isFetching) && bathrooms.length === 0}
          zoomLocked={!pinsVisible}
        />
      </section>

      <section
        className={cn(
          "ff-review-sheet ff-sheet fixed inset-x-0 z-[250] flex flex-col bg-surface px-[max(1rem,env(safe-area-inset-left))] pt-1 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))]",
          sheetOpen ? "is-open" : "",
          sheetTall ? "is-tall" : "",
        )}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("[data-ff-sheet-handle]")) return;
          dragRef.current = { y: event.clientY, tall: sheetTall };
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start) return;
          const dy = start.y - event.clientY;
          if (dy > 48) setExpanded(true);
          if (dy < -48) {
            if (start.tall) setExpanded(false);
            else selectRoom(null);
          }
        }}
      >
        <button
          type="button"
          data-ff-sheet-handle
          className="mx-auto mt-1 mb-2 h-8 w-full max-w-xs shrink-0"
          aria-label={sheetTall ? "Pull down to shrink" : "Pull up for full screen"}
        >
          <span className="mx-auto block h-1.5 w-12 rounded-full bg-foreground/18" />
        </button>
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
              onOpenMaps={(kind) => {
                const urls = directionsUrl(sheetPlace, userLocation);
                window.open(kind === "google" ? urls.google : urls.apple, "_blank", "noopener,noreferrer");
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
      <InstallPrompt />
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
