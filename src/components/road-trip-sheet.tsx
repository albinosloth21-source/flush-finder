import { useState } from "react";
import { Car, X } from "lucide-react";
import { FlushLoader } from "@/components/flush-loader";
import { LogoMark } from "@/components/toilet-mark";
import { TakeMeThere } from "@/components/take-me-there";
import { VENUE_LABELS } from "@/lib/labels";
import { loadPoiTiles } from "@/lib/poi-tiles";
import {
  corridorBoxes,
  formatMiles,
  geocode,
  planRoute,
  stopsAlongRoute,
  type LatLng,
  type TripRoute,
  type TripStop,
} from "@/lib/road-trip";
import type { Bathroom } from "@/lib/types";

type Phase = "idle" | "finding" | "routing" | "scouting" | "done";

const PHASE_COPY: Record<Phase, string> = {
  idle: "",
  finding: "Looking up the throne room…",
  routing: "Plotting the royal route…",
  scouting: "Scouting restrooms along the way…",
  done: "",
};

/** Road-trip mode: restrooms within ~2 miles of the drive, in the order you reach them. */
export function RoadTripSheet({
  origin,
  knownRooms,
  onClose,
  onPick,
}: {
  origin: LatLng | null;
  knownRooms: Bathroom[];
  onClose: () => void;
  onPick: (room: Bathroom) => void;
}) {
  const [dest, setDest] = useState("");
  const [start, setStart] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<TripRoute | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [labels, setLabels] = useState<{ from: string; to: string } | null>(null);
  const busy = phase !== "idle" && phase !== "done";

  async function run() {
    if (busy) return;
    setError(null);
    setStops([]);
    setRoute(null);
    if (!dest.trim()) {
      setError("Where are we headed? Add a destination.");
      return;
    }
    if (!start.trim() && !origin) {
      setError("Add a starting point, or share your location to start from where you are.");
      return;
    }
    try {
      setPhase("finding");
      const from = start.trim() ? await geocode(start) : { ...origin!, label: "Your location" };
      if (!from) throw new Error(`Couldn't find "${start}". Try a city and state.`);
      const to = await geocode(dest);
      if (!to) throw new Error(`Couldn't find "${dest}". Try a city and state.`);
      setLabels({ from: from.label, to: to.label });
      setPhase("routing");
      const planned = await planRoute(from, to);
      setRoute(planned);
      setPhase("scouting");
      const boxes = corridorBoxes(planned);
      const rooms: Bathroom[] = [...knownRooms];
      for (let i = 0; i < boxes.length; i += 16) {
        const chunk = await Promise.all(boxes.slice(i, i + 16).map((box) => loadPoiTiles(box).catch(() => [])));
        for (const list of chunk) rooms.push(...list);
      }
      setStops(stopsAlongRoute(rooms, planned));
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something clogged. Try again?");
      setPhase("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/45 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ff-trip-title"
        data-ff-road-trip="true"
        className="ff-throne-sheet flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[var(--radius-2xl)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[var(--radius-2xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <LogoMark className="size-10" />
          <div className="min-w-0 flex-1">
            <h2 id="ff-trip-title" className="ff-gold-text font-display text-xl font-semibold">
              Restrooms ahead
            </h2>
            <p className="text-sm text-[#e9e2cf]/80">Road trip? Know your pit stops before nature calls.</p>
          </div>
          <button type="button" aria-label="Close" className="grid size-9 place-items-center rounded-full text-[#e9e2cf] hover:bg-white/10" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <input
            className="ff-trip-input"
            placeholder={origin ? "Start: my location" : "Start (city, address)"}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Start"
            autoComplete="off"
          />
          <input
            className="ff-trip-input"
            placeholder="Destination (city, address)"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            aria-label="Destination"
            autoComplete="off"
          />
          <button type="submit" className="ff-gold-button w-full" disabled={busy}>
            {busy ? <FlushLoader className="size-4" /> : <Car className="size-4" />}
            {busy ? PHASE_COPY[phase] : "Find restrooms on my route"}
          </button>
        </form>

        {error ? <p className="mt-2 text-sm text-[#f6c6a8]" role="alert">{error}</p> : null}

        {phase === "done" && route ? (
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <p className="text-[0.75rem] text-[#e9e2cf]/75">
              {labels ? `${labels.from} → ${labels.to} · ` : ""}
              {formatMiles(route.meters)}
              {route.seconds ? ` · ~${Math.round(route.seconds / 3600 * 10) / 10} h` : ""}
              {` · ${stops.length} stop${stops.length === 1 ? "" : "s"} within 2 mi`}
            </p>
            {route.straightLine ? (
              <p className="mt-1 text-[0.75rem] text-[#f6e27a]">
                The road router didn't answer, so this is a straight-line corridor. Stops are approximate.
              </p>
            ) : null}
            {stops.length === 0 ? (
              <p className="mt-3 text-sm text-[#e9e2cf]/85">No restrooms mapped along this stretch yet. Fill up before you go!</p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {stops.map((stop) => (
                  <li key={stop.room.id} className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-white/5 px-2.5 py-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onPick(stop.room)}>
                      <p className="truncate text-sm font-semibold text-[#f7f2e3]">{stop.room.name}</p>
                      <p className="text-[0.7rem] text-[#e9e2cf]/75">
                        {formatMiles(stop.alongMeters)} in · {formatMiles(stop.offMeters)} off route · {VENUE_LABELS[stop.room.kind]}
                        {stop.room.unverified && stop.room.reviewCount === 0 ? " · unverified" : ""}
                      </p>
                      {stop.why.length ? (
                        <p className="mt-0.5 text-[0.65rem] font-semibold tracking-wide text-[#f6e27a] uppercase">{stop.why.join(" · ")}</p>
                      ) : null}
                    </button>
                    <TakeMeThere dest={stop.room} compact />
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-[0.65rem] text-[#e9e2cf]/55">
              Routing by OSRM, places by Photon / Nominatim. Map data © OpenStreetMap contributors.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
