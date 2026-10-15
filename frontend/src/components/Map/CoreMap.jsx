import { useMemo, useCallback, useEffect, useRef } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/mapbox";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

const INITIAL_VIEW_STATE = {
  longitude: 88.3639,
  latitude: 22.5726,
  zoom: 11,
};

const POINT_LAYER_ID = "pandal-dots";

const ZERO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
// 🚶 Balanced top/bottom padding for walking view
const NAV_PADDING = { top: 140, bottom: 120, left: 0, right: 0 };

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
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#2563eb",
    "line-width": 6,
  },
};

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
  selectedPandal = null,
  destinationPandal = null,
  userLocation = null,
  snappedPosition = null,
}) {
  const lastHeadingRef = useRef(0);
  const wasNavigatingRef = useRef(false);
  const userLocationRef = useRef(userLocation);
  const navStateRef = useRef({ isNavigating, activeRoute });

  userLocationRef.current = userLocation;
  navStateRef.current = { isNavigating, activeRoute };

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

  const activePos =
    snappedPosition?.coordinates ||
    (userLocation ? [userLocation.lng, userLocation.lat] : null);
  const activeBearing =
    snappedPosition?.bearing ?? userLocation?.heading ?? lastHeadingRef.current;

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

  // 🚶 Walking 3D Camera Tracking
  useEffect(() => {
    if (!isNavigating || !activePos || !mapRef?.current) return;

    if (Number.isFinite(activeBearing)) lastHeadingRef.current = activeBearing;

    mapRef.current.easeTo({
      center: activePos,
      zoom: 18.2, // 🔍 Street/lane level zoom for pedestrians
      pitch: 40, // 📐 Comfortable walking tilt
      bearing: lastHeadingRef.current,
      padding: NAV_PADDING,
      duration: 1000,
      easing: (t) => t,
      essential: true,
    });
  }, [isNavigating, activePos, activeBearing, mapRef]);

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
    } catch (err) {
      console.error("Error fitting map bounds to active route:", err);
    }
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

  const handleMouseEnter = useCallback(() => {
    const canvas = mapRef?.current?.getCanvas();
    if (canvas) canvas.style.cursor = "pointer";
  }, [mapRef]);

  const handleMouseLeave = useCallback(() => {
    const canvas = mapRef?.current?.getCanvas();
    if (canvas) canvas.style.cursor = "";
  }, [mapRef]);

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle={MAP_STYLE}
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={[POINT_LAYER_ID]}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. ROUTE LINE */}
      {displayedRoute && (
        <Source id="active-route" type="geojson" data={displayedRoute}>
          <Layer {...routeLineLayer} />
        </Source>
      )}

      {/* 2. PANDAL DOTS */}
      <Source id="pandals" type="geojson" data={geoJsonData}>
        <Layer {...pandalDotLayer} />
      </Source>

      {/* 3. LIVE SNAPPED USER LOCATION WITH DIRECTIONAL CONE */}
      {activePos && (
        <Marker
          longitude={activePos[0]}
          latitude={activePos[1]}
          anchor="center"
        >
          <div
            className="relative flex h-8 w-8 items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${activeBearing}deg)` }}
          >
            {/* Direction Beam Cone */}
            <div className="absolute -top-3 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-blue-500/40" />
            {/* Core Marker Puck */}
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg" />
          </div>
        </Marker>
      )}
    </Map>
  );
}
