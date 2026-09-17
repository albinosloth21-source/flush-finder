import { useEffect, useRef, useState } from "react";
import type { Bathroom, MapBounds, WalkingRoute } from "@/lib/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { isMapChromeTarget, pinIdNearPoint } from "@/lib/map-hit";

export type FlyTo = {
  seq: number;
  lat: number;
  lng: number;
  zoom?: number;
  padBottom?: boolean;
};

type Props = {
  bathrooms: Bathroom[];
  selectedId: string | null;
  pinBusy?: boolean;
  userLocation: { lat: number; lng: number } | null;
  route: WalkingRoute | null;
  placing: boolean;
  draft: { lat: number; lng: number } | null;
  flyTo: FlyTo | null;
  onSelect: (id: string | null) => void;
  onBounds: (bounds: MapBounds) => void;
  onPlace: (pos: { lat: number; lng: number }) => void;
};

type PinHit = { id: string; name: string; x: number; y: number; selected: boolean; busy: boolean };

const PIN_SVG = `<svg viewBox="0 0 32 40" width="100%" height="100%" aria-hidden="true">
  <path d="M16 1.2c-7.4 0-13.4 5.8-13.4 13.1 0 9.4 11.2 23.4 12.8 24.4a1 1 0 0 0 1.2 0c1.6-1 12.8-15 12.8-24.4C29.4 7 23.4 1.2 16 1.2Z"/>
  <path class="bowl" d="M12.2 8.1h7.6c.5 0 .9.4.9.9v2.2c0 .5-.4.9-.9.9h-7.6c-.5 0-.9-.4-.9-.9V9c0-.5.4-.9.9-.9Z"/>
  <path class="bowl" d="M12.6 12.3h6.8c2.2 0 3.9 1.5 3.9 3.7 0 3-2.6 5.3-7.3 5.3s-7.3-2.3-7.3-5.3c0-2.2 1.7-3.7 3.9-3.7Z"/>
</svg>`;

function eventPoint(
  ev: PointerEvent | MouseEvent | Touch,
  container: HTMLElement,
  L: typeof import("leaflet"),
) {
  const rect = container.getBoundingClientRect();
  const sx = rect.width ? container.clientWidth / rect.width : 1;
  const sy = rect.height ? container.clientHeight / rect.height : 1;
  return L.point((ev.clientX - rect.left) * sx, (ev.clientY - rect.top) * sy);
}

export default function MapCanvas(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const layersRef = useRef<{
    bathrooms?: import("leaflet").LayerGroup;
    user?: import("leaflet").LayerGroup;
    route?: import("leaflet").LayerGroup;
    draft?: import("leaflet").LayerGroup;
  }>({});
  const tilesRef = useRef<{
    imagery?: import("leaflet").TileLayer;
    labels?: import("leaflet").TileLayer;
    streets?: import("leaflet").TileLayer;
  }>({});
  const propsRef = useRef(props);
  propsRef.current = props;
  const lastFlySeq = useRef<number | null>(null);
  const pointerDown = useRef<{ x: number; y: number; id: number } | null>(null);
  const markersRef = useRef(new Map<string, import("leaflet").Marker>());
  const [satellite, setSatellite] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [hits, setHits] = useState<PinHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;
    const onResize = () => map?.invalidateSize({ animate: false });

    void (async () => {
      const leafletMod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;
      const L = (leafletMod.default ?? leafletMod) as typeof import("leaflet");
      LRef.current = L;
      const container = containerRef.current;

      const start = propsRef.current.flyTo;
      map = L.map(container, {
        zoomControl: false,
        attributionControl: true,
        bounceAtZoomLimits: false,
        dragging: true,
        preferCanvas: true,
        fadeAnimation: false,
        zoomAnimation: true,
        markerZoomAnimation: true,
      }).setView(
        start ? [start.lat, start.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        start?.zoom ?? DEFAULT_ZOOM,
      );

      const pinPane = map.createPane("ff-pins");
      pinPane.style.zIndex = "650";
      pinPane.style.pointerEvents = "none";

      const imagery = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 19,
        },
      );
      const labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 19,
          pane: "overlayPane",
          className: "ff-sat-labels",
        },
      );
      const streets = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      });
      imagery.addTo(map);
      labels.addTo(map);
      tilesRef.current = { imagery, labels, streets };

      L.control.zoom({ position: "topleft" }).addTo(map);
      layersRef.current.bathrooms = L.layerGroup().addTo(map);
      layersRef.current.user = L.layerGroup().addTo(map);
      layersRef.current.route = L.layerGroup().addTo(map);
      layersRef.current.draft = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);

      const emitBounds = () => {
        const b = map!.getBounds();
        const zoom = map!.getZoom();
        container.dataset.zoom = String(zoom);
        propsRef.current.onBounds({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          zoom,
        });
      };

      map.on("moveend", emitBounds);
      map.on("zoomend", emitBounds);
      emitBounds();
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      onResize();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      map?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.classList.toggle("is-placing", props.placing);
  }, [props.placing]);

  useEffect(() => {
    if (!mapReady) return;
    const onDown = (ev: PointerEvent) => {
      pointerDown.current = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    };
    const resolveTap = (clientX: number, clientY: number, target: EventTarget | null, moved: number) => {
      const map = mapRef.current;
      const L = LRef.current;
      const container = containerRef.current;
      if (!map || !L || !container) return;
      if (isMapChromeTarget(target)) return;
      const rect = container.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const point = eventPoint({ clientX, clientY } as PointerEvent, container, L);
      const p = propsRef.current;
      if (p.placing) {
        if (moved > 24) return;
        const latlng = map.containerPointToLatLng(point);
        p.onPlace({ lat: latlng.lat, lng: latlng.lng });
        return;
      }
      const projected = p.bathrooms.map((room) => {
        const pt = map.latLngToContainerPoint([room.lat, room.lng]);
        return { id: room.id, x: pt.x, y: pt.y };
      });
      const id = pinIdNearPoint({ x: point.x, y: point.y }, projected);
      if (id) {
        p.onSelect(id);
        return;
      }
      if (moved <= 22) p.onSelect(null);
    };
    const onUp = (ev: PointerEvent) => {
      const start = pointerDown.current;
      if (start && start.id !== ev.pointerId) return;
      const moved = start ? Math.hypot(ev.clientX - start.x, ev.clientY - start.y) : 0;
      pointerDown.current = null;
      if (moved > 40) return;
      resolveTap(ev.clientX, ev.clientY, ev.target, moved);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", () => {
      pointerDown.current = null;
    }, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
    };
  }, [mapReady]);

  useEffect(() => {
    const L = LRef.current;
    const group = layersRef.current.bathrooms;
    if (!L || !group) return;
    const keep = new Set(props.bathrooms.map((room) => room.id));
    for (const [id, marker] of markersRef.current) {
      if (keep.has(id)) continue;
      group.removeLayer(marker);
      markersRef.current.delete(id);
    }
    for (const room of props.bathrooms) {
      const selected = room.id === props.selectedId;
      const busy = selected && Boolean(props.pinBusy);
      const html = `<div class="ff-pin is-${room.kind}${selected ? " is-on" : ""}${busy ? " is-busy" : ""}${room.reviewCount > 0 ? " is-rated" : ""}${room.visibility === "personal" ? " is-personal" : ""}${room.visibility === "pending" ? " is-pending" : ""}">${PIN_SVG}</div>`;
      let marker = markersRef.current.get(room.id);
      if (!marker) {
        const icon = L.divIcon({
          className: "ff-pin-wrap",
          iconSize: [42, 52],
          iconAnchor: [21, 50],
          html,
        });
        marker = L.marker([room.lat, room.lng], {
          icon,
          pane: "ff-pins",
          interactive: false,
          keyboard: false,
          zIndexOffset: selected ? 700 : room.reviewCount > 0 ? 200 : 0,
          title: room.name,
        });
        marker.addTo(group);
        markersRef.current.set(room.id, marker);
      } else {
        const el = marker.getElement()?.querySelector(".ff-pin");
        if (el) {
          el.className = `ff-pin is-${room.kind}${selected ? " is-on" : ""}${busy ? " is-busy" : ""}${room.reviewCount > 0 ? " is-rated" : ""}${room.visibility === "personal" ? " is-personal" : ""}${room.visibility === "pending" ? " is-pending" : ""}`;
        }
        marker.setZIndexOffset(selected ? 700 : room.reviewCount > 0 ? 200 : 0);
      }
    }
  }, [props.bathrooms, props.selectedId, props.pinBusy, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let frame = 0;
    const sync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const live = mapRef.current;
        if (!live) return;
        const p = propsRef.current;
        setHits(
          p.bathrooms.map((room) => {
            const pt = live.latLngToContainerPoint([room.lat, room.lng]);
            return {
              id: room.id,
              name: room.name,
              x: pt.x,
              y: pt.y,
              selected: room.id === p.selectedId,
              busy: room.id === p.selectedId && Boolean(p.pinBusy),
            };
          }),
        );
      });
    };
    sync();
    map.on("moveend zoomend viewreset", sync);
    return () => {
      map.off("moveend zoomend viewreset", sync);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mapReady, props.bathrooms, props.selectedId, props.pinBusy]);

  useEffect(() => {
    const L = LRef.current;
    const group = layersRef.current.user;
    if (!L || !group) return;
    group.clearLayers();
    if (!props.userLocation) return;
    L.circleMarker([props.userLocation.lat, props.userLocation.lng], {
      radius: 8,
      color: "#f7f5f0",
      weight: 3,
      fillColor: "#3d8fd1",
      fillOpacity: 1,
      interactive: false,
    }).addTo(group);
  }, [props.userLocation, mapReady]);

  useEffect(() => {
    const L = LRef.current;
    const group = layersRef.current.route;
    if (!L || !group) return;
    group.clearLayers();
    if (!props.route?.coordinates.length) return;
    const latlngs = props.route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    L.polyline(latlngs, {
      color: "#f4d35e",
      weight: 5,
      opacity: 0.95,
      lineJoin: "round",
      interactive: false,
    }).addTo(group);
  }, [props.route, mapReady]);

  useEffect(() => {
    const L = LRef.current;
    const group = layersRef.current.draft;
    if (!L || !group) return;
    group.clearLayers();
    if (!props.draft) return;
    const icon = L.divIcon({
      className: "ff-pin-wrap",
      iconSize: [40, 50],
      iconAnchor: [20, 48],
      html: `<div class="ff-pin is-on is-draft">${PIN_SVG}</div>`,
    });
    L.marker([props.draft.lat, props.draft.lng], {
      icon,
      pane: "ff-pins",
      interactive: false,
      zIndexOffset: 800,
    }).addTo(group);
  }, [props.draft, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const fly = props.flyTo;
    if (!map || !fly) return;
    if (lastFlySeq.current === fly.seq) return;
    lastFlySeq.current = fly.seq;
    const zoom = fly.zoom ?? Math.max(map.getZoom(), 15);
    map.flyTo([fly.lat, fly.lng], zoom, { duration: 0.45 });
    if (fly.padBottom) {
      window.setTimeout(() => {
        const live = mapRef.current;
        if (!live) return;
        live.panBy([0, live.getSize().y * 0.2], { animate: true, duration: 0.35 });
      }, 420);
    }
  }, [props.flyTo]);

  function openPin(id: string, ev: React.SyntheticEvent) {
    ev.stopPropagation();
    props.onSelect(id);
  }

  function toggleBasemap() {
    const map = mapRef.current;
    const tiles = tilesRef.current;
    if (!map || !tiles.imagery || !tiles.streets) return;
    const next = !satellite;
    if (next) {
      map.removeLayer(tiles.streets);
      tiles.imagery.addTo(map);
      tiles.labels?.addTo(map);
    } else {
      map.removeLayer(tiles.imagery);
      if (tiles.labels) map.removeLayer(tiles.labels);
      tiles.streets.addTo(map);
    }
    setSatellite(next);
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 z-10">
      <div ref={containerRef} className="ff-map h-full w-full" />
      {hits.map((hit) => (
        <button
          key={hit.id}
          type="button"
          className={`ff-pin-hit ${hit.selected ? "is-on" : ""} ${hit.busy ? "is-busy" : ""}`}
          style={{ left: hit.x, top: hit.y }}
          aria-label={`Open reviews for ${hit.name}`}
          onPointerDown={(ev) => {
            if (ev.button !== 0) return;
            openPin(hit.id, ev);
          }}
          onClick={(ev) => openPin(hit.id, ev)}
        >
          <span className="sr-only">{hit.name}</span>
        </button>
      ))}
      <button
        type="button"
        data-ff-chrome="1"
        onClick={toggleBasemap}
        className="ff-sheet pointer-events-auto absolute top-3 left-14 z-[20] h-9 rounded-full bg-surface px-3 text-[0.8125rem] font-medium shadow-[var(--shadow-border)]"
      >
        {satellite ? "Map" : "Satellite"}
      </button>
    </div>
  );
}
