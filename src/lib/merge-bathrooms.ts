import { haversineMeters } from "./geo.ts";
import type { Bathroom } from "./types.ts";

export type RemovedKeys = {
  ids: Iterable<string>;
  osmIds?: Iterable<string | null | undefined>;
};

export function hideRemoved(rooms: Bathroom[], removed: RemovedKeys): Bathroom[] {
  const ids = new Set(removed.ids);
  const osmIds = new Set(
    [...(removed.osmIds ?? [])].filter((value): value is string => Boolean(value)),
  );
  if (ids.size === 0 && osmIds.size === 0) return rooms;
  return rooms.filter((room) => !ids.has(room.id) && !(room.osmId && osmIds.has(room.osmId)));
}

export function mergeBathrooms(fromDb: Bathroom[], fromOsm: Bathroom[]): Bathroom[] {
  const result = [...fromDb];
  const ids = new Set(result.map((b) => b.id));
  const osmIds = new Set(result.map((b) => b.osmId).filter(Boolean) as string[]);
  for (const osm of fromOsm) {
    if (ids.has(osm.id) || (osm.osmId && osmIds.has(osm.osmId))) continue;
    const dup = result.some(
      (b) =>
        b.kind === osm.kind &&
        haversineMeters({ lat: b.lat, lng: b.lng }, { lat: osm.lat, lng: osm.lng }) < 32,
    );
    if (dup) continue;
    ids.add(osm.id);
    if (osm.osmId) osmIds.add(osm.osmId);
    result.push(osm);
  }
  return result;
}
