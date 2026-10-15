import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Bathroom, MapBounds, WalkingRoute } from "@/lib/types";
import { US_CENTER, US_OVERVIEW_ZOOM } from "@/lib/constants";
import { isMapChromeTarget, pinsNearPoint } from "@/lib/map-hit";
import { preferLabeledMap, sameMapView, shouldInstantMapJump } from "@/lib/map-start";
import { clusterZoom, crowdedTapAction, densePinHitPx, pinIconSize, tapIsPan } from "@/lib/map-sheet";
import { milesToMeters, zoomForMiles } from "@/lib/search-radius";

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
  radiusMiles: number;
  onSelect: (id: string | null) => void;
  onBounds: (bounds: MapBounds) => void;
  onPlace: (pos: { lat: number; lng: number }) => void;
};

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

function pinHtml(room: Bathroom, selected: boolean, busy: boolean) {
  return `<div class="ff-pin is-${room.kind}${selected ? " is-on" : ""}${busy ? " is-busy" : ""}${room.reviewCount > 0 ? " is-rated" : ""}${room.visibility === "personal" ? " is-personal" : ""}${room.visibility === "pending" ? " is-pending" : ""}">${PIN_SVG}</div>`;
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
  const activePointers = useRef(new Set<number>());
  const pinchRef = useRef(false);
  const markersRef = useRef(new Map<string, import("leaflet").Marker>());
  const pinSizeRef = useRef("");
  const radiusCircleRef = useRef<import("leaflet").Circle | null>(null);
  const radiusLabelRef = useRef<import("leaflet").Marker | null>(null);
  const radiusRendererRef = useRef<import("leaflet").SVG | null>(null);
  const userChoseBasemap = useRef(false);
  const [satellite, setSatellite] = useState(() => !preferLabeledMap(props.flyTo?.zoom ?? US_OVERVIEW_ZOOM));
  const [mapReady, setMapReady] = useState(false);
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);

  function refreshZoomButtons(map: import("leaflet").Map) {
    const z = map.getZoom();
    setCanZoomIn(z < map.getMaxZoom());
    setCanZoomOut(z > map.getMinZoom());
  }

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
      const startZoom = start?.zoom ?? US_OVERVIEW_ZOOM;
      map = L.map(container, {
        zoomControl: false,
        attributionControl: true,
        bounceAtZoomLimits: false,
        dragging: true,
        preferCanvas: true,
        fadeAnimation: false,
        zoomAnimation: true,
        markerZoomAnimation: false,
        minZoom: 2,
        maxZoom: 19,
      }).setView(
        start ? [start.lat, start.lng] : [US_CENTER.lat, US_CENTER.lng],
        startZoom,
        { animate: false },
      );
      if (start?.seq != null) lastFlySeq.current = start.seq;

      const pinPane = map.createPane("ff-pins");
      pinPane.style.zIndex = "650";
      pinPane.style.pointerEvents = "none";
      const radiusPane = map.createPane("ff-radius");
      radiusPane.style.zIndex = "450";
      radiusPane.style.pointerEvents = "none";

      const imagery = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 19,
          updateWhenIdle: true,
          keepBuffer: 2,
        },
      );
      const labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 19,
          pane: "overlayPane",
          className: "ff-sat-labels",
          updateWhenIdle: true,
          keepBuffer: 2,
        },
      );
      const streets = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
        updateWhenIdle: true,
        keepBuffer: 2,
      });
      if (preferLabeledMap(startZoom)) {
        streets.addTo(map);
        setSatellite(false);
      } else {
        imagery.addTo(map);
        labels.addTo(map);
        setSatellite(true);
      }
      tilesRef.current = { imagery, labels, streets };

      layersRef.current.bathrooms = L.layerGroup().addTo(map);
      layersRef.current.user = L.layerGroup().addTo(map);
      layersRef.current.route = L.layerGroup().addTo(map);
      layersRef.current.draft = L.layerGroup().addTo(map);
      mapRef.current = map;
      refreshZoomButtons(map);
      setMapReady(true);

      const emitBounds = () => {
        const b = map!.getBounds();
        const zoom = map!.getZoom();
        container.dataset.zoom = String(zoom);
        refreshZoomButtons(map!);
        propsRef.current.onBounds({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          zoom,
        });
      };

      const syncBasemap = () => {
        if (userChoseBasemap.current) return;
        const live = mapRef.current;
        const tiles = tilesRef.current;
        if (!live || !tiles.streets || !tiles.imagery) return;
        const wantSat = !preferLabeledMap(live.getZoom());
        const hasSat = live.hasLayer(tiles.imagery);
        if (wantSat === hasSat) return;
        if (wantSat) {
          live.removeLayer(tiles.streets);
          tiles.imagery.addTo(live);
          tiles.labels?.addTo(live);
        } else {
          live.removeLayer(tiles.imagery);
          if (tiles.labels) live.removeLayer(tiles.labels);
          tiles.streets.addTo(live);
        }
        setSatellite(wantSat);
      };

      map.on("moveend", emitBounds);
      map.on("zoomend", emitBounds);
      map.on("zoomend", syncBasemap);
      const wrap = wrapRef.current;
      const panStart = () => wrap?.classList.add("is-panning");
      const panEnd = () => wrap?.classList.remove("is-panning");
      map.on("movestart zoomstart", panStart);
      map.on("moveend zoomend", panEnd);
      emitBounds();
      window.addEventListener("resize", onResize);
      window.visualViewport?.addEventListener("resize", onResize);
      onResize();
      window.setTimeout(onResize, 120);
      window.setTimeout(onResize, 480);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      try {
        map?.stop();
      } catch {
        /* ignore */
      }
      map?.remove();
      mapRef.current = null;
      radiusCircleRef.current = null;
      radiusLabelRef.current = null;
      radiusRendererRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.classList.toggle("is-placing", props.placing);
  }, [props.placing]);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !mapReady) return;
    const meters = milesToMeters(props.radiusMiles);
    const pane = map.getPane("ff-radius") ?? map.createPane("ff-radius");
    pane.style.zIndex = "450";
    pane.style.pointerEvents = "none";
    if (!radiusRendererRef.current) {
      const renderer = L.svg({ pane: "ff-radius", padding: 0.6 });
      renderer.addTo(map);
      radiusRendererRef.current = renderer;
    }
    let circle = radiusCircleRef.current;
    if (!circle) {
      circle = L.circle(map.getCenter(), {
        radius: meters,
        pane: "ff-radius",
        renderer: radiusRendererRef.current,
        color: "#f6e7a3",
        weight: 4,
        dashArray: "14 10",
        fillColor: "#f6e7a3",
        fillOpacity: 0.16,
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(map);
      radiusCircleRef.current = circle;
    } else {
      circle.setRadius(meters);
    }
    let label = radiusLabelRef.current;
    const labelHtml = `<span class="ff-radius-map-label-text">${props.radiusMiles} ${props.radiusMiles === 1 ? "mile" : "miles"}</span>`;
    if (!label) {
      label = L.marker(map.getCenter(), {
        interactive: false,
        keyboard: false,
        pane: "ff-radius",
        zIndexOffset: 20,
        icon: L.divIcon({
          className: "ff-radius-map-label",
          iconSize: [96, 28],
          iconAnchor: [48, 14],
          html: labelHtml,
        }),
      }).addTo(map);
      radiusLabelRef.current = label;
    } else {
      label.setIcon(
        L.divIcon({
          className: "ff-radius-map-label",
          iconSize: [96, 28],
          iconAnchor: [48, 14],
          html: labelHtml,
        }),
      );
    }
    const paint = () => {
      const liveMap = mapRef.current;
      const liveCircle = radiusCircleRef.current;
      const liveLabel = radiusLabelRef.current;
      if (!liveMap || !liveCircle || !liveLabel) return;
      const center = liveMap.getCenter();
      const showRing = liveMap.getZoom() >= 9;
      const paneEl = liveMap.getPane("ff-radius");
      if (paneEl) paneEl.style.opacity = showRing ? "1" : "0";
      liveCircle.setLatLng(center);
      liveLabel.setLatLng([center.lat + meters / 111_320, center.lng]);
      const labelEl = liveLabel.getElement();
      if (labelEl) labelEl.style.display = showRing ? "" : "none";
      for (const marker of markersRef.current.values()) {
        const el = marker.getElement();
        if (!el) continue;
        el.style.display = liveMap.distance(center, marker.getLatLng()) <= meters ? "" : "none";
      }
    };
    paint();
    map.on("move zoom", paint);
    return () => {
      map.off("move zoom", paint);
    };
  }, [mapReady, props.radiusMiles]);

  useEffect(() => {
    if (!mapReady) return;
    const onDown = (ev: PointerEvent) => {
      activePointers.current.add(ev.pointerId);
      if (activePointers.current.size > 1) pinchRef.current = true;
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
      const hits = pinsNearPoint({ x: point.x, y: point.y }, projected, densePinHitPx(p.bathrooms.length));
      const action = crowdedTapAction(hits.length, map.getZoom());
      if (action === "zoom") {
        const latlng = map.containerPointToLatLng(point);
        map.setView([latlng.lat, latlng.lng], clusterZoom(map.getZoom()), { animate: true });
        return;
      }
      if (action === "select" && hits[0]) {
        p.onSelect(hits[0].id);
        return;
      }
      if (moved <= 12) p.onSelect(null);
    };
    const onUp = (ev: PointerEvent) => {
      activePointers.current.delete(ev.pointerId);
      const pinched = pinchRef.current;
      if (activePointers.current.size === 0) pinchRef.current = false;
      const start = pointerDown.current;
      if (start && start.id !== ev.pointerId) return;
      const moved = start ? Math.hypot(ev.clientX - start.x, ev.clientY - start.y) : 0;
      pointerDown.current = null;
      if (pinched) return;
      if (tapIsPan(moved)) return;
      resolveTap(ev.clientX, ev.clientY, ev.target, moved);
    };
    const onCancel = (ev: PointerEvent) => {
      activePointers.current.delete(ev.pointerId);
      if (activePointers.current.size === 0) {
        pinchRef.current = false;
        pointerDown.current = null;
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
    };
  }, [mapReady]);

  useEffect(() => {
    const L = LRef.current;
    const group = layersRef.current.bathrooms;
    if (!L || !group) return;
    const size = pinIconSize(props.bathrooms.length);
    const sizeKey = `${size.w}x${size.h}`;
    const sizeChanged = pinSizeRef.current !== sizeKey;
    pinSizeRef.current = sizeKey;
    const keep = new Set(props.bathrooms.map((room) => room.id));
    for (const [id, marker] of markersRef.current) {
      if (keep.has(id)) continue;
      group.removeLayer(marker);
      markersRef.current.delete(id);
    }
    for (const room of props.bathrooms) {
      const selected = room.id === props.selectedId;
      const busy = selected && Boolean(props.pinBusy);
      const html = pinHtml(room, selected, busy);
      let marker = markersRef.current.get(room.id);
      if (!marker) {
        const icon = L.divIcon({
          className: "ff-pin-wrap",
          iconSize: [size.w, size.h],
          iconAnchor: [Math.round(size.w / 2), size.h - 2],
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
        if (sizeChanged) {
          marker.setIcon(
            L.divIcon({
              className: "ff-pin-wrap",
              iconSize: [size.w, size.h],
              iconAnchor: [Math.round(size.w / 2), size.h - 2],
              html,
            }),
          );
        } else {
          const el = marker.getElement()?.querySelector(".ff-pin");
          if (el) {
            el.className = `ff-pin is-${room.kind}${selected ? " is-on" : ""}${busy ? " is-busy" : ""}${room.reviewCount > 0 ? " is-rated" : ""}${room.visibility === "personal" ? " is-personal" : ""}${room.visibility === "pending" ? " is-pending" : ""}`;
          }
        }
        marker.setZIndexOffset(selected ? 700 : room.reviewCount > 0 ? 200 : 0);
      }
    }
    const map = mapRef.current;
    if (map) {
      const center = map.getCenter();
      const max = milesToMeters(props.radiusMiles);
      for (const marker of markersRef.current.values()) {
        const el = marker.getElement();
        if (!el) continue;
        el.style.display = map.distance(center, marker.getLatLng()) <= max ? "" : "none";
      }
    }
  }, [props.bathrooms, props.selectedId, props.pinBusy, props.radiusMiles, mapReady]);

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
    if (!map || !fly || !mapReady) return;
    if (lastFlySeq.current === fly.seq) return;
    lastFlySeq.current = fly.seq;
    const zoom = fly.zoom ?? zoomForMiles(2);
    const here = { lat: map.getCenter().lat, lng: map.getCenter().lng, zoom: map.getZoom() };
    const dest = { lat: fly.lat, lng: fly.lng, zoom };
    if (sameMapView(here, dest)) return;
    try {
      map.stop();
    } catch {
      /* map may not be animating */
    }
    const far = shouldInstantMapJump(here, dest, map.distance(map.getCenter(), [fly.lat, fly.lng]));
    if (far) {
      map.setView([fly.lat, fly.lng], zoom, { animate: false });
    } else {
      map.flyTo([fly.lat, fly.lng], zoom, { duration: 0.4 });
    }
    if (fly.padBottom) {
      window.setTimeout(() => {
        const live = mapRef.current;
        if (!live) return;
        live.panBy([0, live.getSize().y * 0.2], { animate: true, duration: 0.35 });
      }, far ? 40 : 420);
    }
  }, [props.flyTo, mapReady]);

  function zoomBy(delta: 1 | -1) {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), map.getZoom() + delta));
    if (next === map.getZoom()) return;
    map.setZoom(next);
    refreshZoomButtons(map);
  }

  function toggleBasemap() {
    const map = mapRef.current;
    const tiles = tilesRef.current;
    if (!map || !tiles.imagery || !tiles.streets) return;
    userChoseBasemap.current = true;
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
    <div ref={wrapRef} className="absolute inset-0 z-10 isolate overflow-hidden">
      <div ref={containerRef} className="ff-map h-full w-full" />
      <button
        type="button"
        data-ff-chrome="1"
        onClick={toggleBasemap}
        className="ff-sheet pointer-events-auto absolute top-[7.5rem] left-3 z-[40] h-9 rounded-full bg-surface px-3 text-[0.8125rem] font-medium shadow-[var(--shadow-border)]"
      >
        {satellite ? "Map" : "Satellite"}
      </button>
      <div className="ff-zoom" data-ff-chrome="1">
        <button type="button" aria-label="Zoom in" disabled={!canZoomIn} onClick={() => zoomBy(1)}>
          <Plus className="size-6" />
        </button>
        <button type="button" aria-label="Zoom out" disabled={!canZoomOut} onClick={() => zoomBy(-1)}>
          <Minus className="size-6" />
        </button>
      </div>
    </div>
  );
}
