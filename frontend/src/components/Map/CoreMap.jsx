import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import { AlertTriangle } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

const INITIAL_VIEW_STATE = { longitude: 88.3639, latitude: 22.5726, zoom: 11 };
const POINT_LAYER_ID = "pandal-dots";
const ZERO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const NAV_PADDING = { top: 140, bottom: 120, left: 0, right: 0 };

const ROUTE_OPACITY_FRESH = 1;
const ROUTE_OPACITY_STALE = 0.35;

const pandalDotLayer = {
  id: POINT_LAYER_ID,
  type: "circle",
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      8,
      1.5,
      11,
      3,
      14,
      6,
      17,
      10,
    ],
    "circle-color": [
      "match",
      ["get", "confidenceLevel"],
      "HIGH",
      "#D81B60",
      "MEDIUM",
      "#B48A44",
      "#00897B",
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1,
  },
};

const routeLineLayer = {
  id: "route-line",
  type: "line",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: {
    "line-color": "#2563eb",
    "line-width": 6,
    "line-opacity": ROUTE_OPACITY_FRESH,
    "line-opacity-transition": { duration: 300, delay: 0 },
  },
};

function unwrapAngle(prev, next) {
  let delta = ((((next - prev) % 360) + 540) % 360) - 180;
  return prev + delta;
}

function toLineCoordinates(route) {
  if (!route) return null;
  const geom = route.geometry ?? route;
  return Array.isArray(geom?.coordinates) && geom.coordinates.length
    ? geom.coordinates
    : null;
}

function toFeature(route) {
  if (!route) return null;
  if (route.type === "Feature" || route.type === "FeatureCollection")
    return route;
  const geom = route.geometry ?? route;
  if (!geom?.type) return null;
  return { type: "Feature", properties: {}, geometry: geom };
}

export default function CoreMap({
  mapRef,
  pandals = [],
  onPandalSelect,
  isNavigating = false,
  activeRoute = null,
  routeGeometry = null,
  isRouteStale = false,
  selectedPandal = null,
  destinationPandal = null,
  userLocation = null,
  snappedPosition = null,
}) {
  const [isSupported, setIsSupported] = useState(true);
  const [compassHeading, setCompassHeading] = useState(null);
  const lastHeadingRef = useRef(0);
  const wasNavigatingRef = useRef(false);
  const userLocationRef = useRef(userLocation);
  const navStateRef = useRef({ isNavigating, activeRoute });

  userLocationRef.current = userLocation;
  navStateRef.current = { isNavigating, activeRoute };

  useEffect(() => {
    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: false })) {
      setIsSupported(false);
    }
  }, []);

  // 🚀 Native Browser Compass Integration for Instant Turning
  useEffect(() => {
    const handleOrientation = (e) => {
      let heading = null;
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading; // iOS Safari
      } else if (e.alpha !== null && (e.absolute || e.absolute === undefined)) {
        heading = 360 - e.alpha; // Android Chrome
      }
      if (heading !== null) setCompassHeading(heading);
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation);
    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation,
      );
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const posLng = snappedPosition?.coordinates?.[0] ?? userLocation?.lng;
  const posLat = snappedPosition?.coordinates?.[1] ?? userLocation?.lat;
  const activePos = useMemo(
    () =>
      Number.isFinite(posLng) && Number.isFinite(posLat)
        ? [posLng, posLat]
        : null,
    [posLng, posLat],
  );

  // Compass dictates bearing first, falling back to GPS movement if compass fails
  const activeBearing =
    compassHeading ??
    snappedPosition?.bearing ??
    userLocation?.heading ??
    lastHeadingRef.current;

  const puckRotationRef = useRef(0);
  if (Number.isFinite(activeBearing)) {
    puckRotationRef.current = unwrapAngle(
      puckRotationRef.current,
      activeBearing,
    );
  }

  const displayedRoute = useMemo(
    () =>
      toFeature(isNavigating && routeGeometry ? routeGeometry : activeRoute),
    [isNavigating, routeGeometry, activeRoute],
  );

  const geoJsonData = useMemo(
    () => ({
      type: "FeatureCollection",
      features: pandals
        .filter((p) => Array.isArray(p?.location?.coordinates))
        .map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: p.location.coordinates },
          properties: {
            id: String(p._id),
            name: p.name,
            confidenceLevel: p.confidenceLevel,
          },
        })),
    }),
    [pandals],
  );

  useEffect(() => {
    if (!selectedPandal || !mapRef?.current) return;
    const { isNavigating: nav, activeRoute: route } = navStateRef.current;
    if (nav || route) return;

    const coords = selectedPandal.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      mapRef.current.flyTo({
        center: [coords[0], coords[1]],
        zoom: 15.5,
        pitch: 25,
        duration: 1200,
      });
    }
  }, [selectedPandal, mapRef]);

  useEffect(() => {
    if (!isNavigating || !activePos || !mapRef?.current) return;
    if (Number.isFinite(activeBearing)) lastHeadingRef.current = activeBearing;

    mapRef.current.easeTo({
      center: activePos,
      zoom: 18.5,
      pitch: 45,
      bearing: lastHeadingRef.current,
      padding: NAV_PADDING,
      duration: compassHeading !== null ? 200 : 1000, // Faster map rotation if using compass
      easing: (t) => t,
      essential: true,
    });
  }, [isNavigating, activePos, activeBearing, compassHeading, mapRef]);

  useEffect(() => {
    if (wasNavigatingRef.current && !isNavigating && mapRef?.current) {
      lastHeadingRef.current = 0;
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        padding: ZERO_PADDING,
        duration: 800,
      });
    }
    wasNavigatingRef.current = isNavigating;
  }, [isNavigating, mapRef]);

  const destCoords = destinationPandal?.location?.coordinates;
  useEffect(() => {
    if (isNavigating || !activeRoute || !mapRef?.current) return;

    try {
      const points = [...(toLineCoordinates(activeRoute) ?? [])];
      const user = userLocationRef.current;
      if (user?.lng != null && user?.lat != null)
        points.push([user.lng, user.lat]);
      if (Array.isArray(destCoords) && destCoords.length === 2)
        points.push(destCoords);
      if (!points.length) return;

      let minLng = points[0][0],
        maxLng = points[0][0],
        minLat = points[0][1],
        maxLat = points[0][1];
      for (const [lng, lat] of points) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }

      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 120, bottom: 240, left: 50, right: 50 },
          pitch: 0,
          bearing: 0,
          maxZoom: 17,
          duration: 1500,
        },
      );
    } catch (err) {}
  }, [activeRoute, isNavigating, destCoords, mapRef]);

  const handleClick = useCallback(
    (event) => {
      const feature = event.features?.[0];
      if (!feature || !onPandalSelect) return;
      const clicked = pandals.find(
        (p) => String(p._id) === feature.properties.id,
      );
      if (clicked) onPandalSelect(clicked);
    },
    [pandals, onPandalSelect],
  );

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-white p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-lg font-bold mb-1">WebGL Unsupported</h3>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={MAP_STYLE}
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={[POINT_LAYER_ID]}
      onClick={handleClick}
    >
      {displayedRoute && (
        <Source id="active-route" type="geojson" data={displayedRoute}>
          <Layer
            {...routeLineLayer}
            paint={{
              ...routeLineLayer.paint,
              "line-opacity": isRouteStale
                ? ROUTE_OPACITY_STALE
                : ROUTE_OPACITY_FRESH,
            }}
          />
        </Source>
      )}

      <Source id="pandals" type="geojson" data={geoJsonData}>
        <Layer {...pandalDotLayer} />
      </Source>

      {activePos && (
        <Marker
          longitude={activePos[0]}
          latitude={activePos[1]}
          anchor="center"
        >
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="absolute w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/40 animate-pulse" />
            <div
              className="relative flex items-center justify-center w-8 h-8 transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${puckRotationRef.current}deg)` }}
            >
              <div className="absolute -top-3.5 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-blue-500/50 filter drop-shadow-sm" />
              <div className="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </Marker>
      )}
    </Map>
  );
}
