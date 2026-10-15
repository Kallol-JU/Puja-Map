import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import useMapStore from "../store/useMapStore";

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox";
const ADVANCE_RADIUS_M = 12; // Advance maneuver radius for pedestrians
const OFF_ROUTE_THRESHOLD_M = 25; // off-route threshold in meters
const OFF_ROUTE_CONFIRMATIONS = 2; // consecutive GPS fixes required
const REROUTE_COOLDOWN_MS = 6000; // minimum gap between Directions requests
const MAX_ACCEPTABLE_ACCURACY_M = 50; // ignore fixes worse than this for off-route checks

const R = 6371008.8;
const toRad = (d) => (d * Math.PI) / 180;

function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Closest point to p on segment a-b (local equirectangular projection)
function projectPointToSegment(p, a, b) {
  const cosLat = Math.cos(toRad(p[1]));
  const ax = toRad(a[0] - p[0]) * cosLat * R;
  const ay = toRad(a[1] - p[1]) * R;
  const bx = toRad(b[0] - p[0]) * cosLat * R;
  const by = toRad(b[1] - p[1]) * R;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t =
    lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

function calculateBearing([lng1, lat1], [lng2, lat2]) {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function distanceToSegmentMeters(p, a, b) {
  const proj = projectPointToSegment(p, a, b);
  return distanceMeters(p, proj);
}

function distanceToRouteMeters(point, coords) {
  if (!coords?.length) return Infinity;
  if (coords.length === 1) return distanceMeters(point, coords[0]);
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceToSegmentMeters(point, coords[i], coords[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

function toLineCoordinates(route) {
  if (!route) return null;
  const geom = route.geometry ?? route;
  return Array.isArray(geom?.coordinates) && geom.coordinates.length
    ? geom.coordinates
    : null;
}

function normalizeStep(step) {
  return {
    instruction: step.maneuver.instruction,
    type: step.maneuver.type,
    modifier: step.maneuver.modifier,
    location: step.maneuver.location,
    name: step.name,
    distance: step.distance,
    duration: step.duration,
  };
}

export function useNavigation({
  accessToken = import.meta.env.VITE_MAPBOX_TOKEN,
  profile = "walking",
} = {}) {
  const isNavigating = useMapStore((s) => s.isNavigating);
  const userLocation = useMapStore((s) => s.userLocation);
  const activeRoute = useMapStore((s) => s.activeRoute);
  const storeRouteGeometry = useMapStore((s) => s.routeGeometry);
  const storedDestination = useMapStore((s) => s.destinationPandal);
  const selectedPandal = useMapStore((s) => s.selectedPandal);
  const destinationPandal = storedDestination ?? selectedPandal;
  const destCoords = destinationPandal?.location?.coordinates;

  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [routeLine, setRouteLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [error, setError] = useState(null);

  const prevLocationRef = useRef(null);
  const motionHeadingRef = useRef(0);
  const abortRef = useRef(null);
  const fetchingRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const offRouteCountRef = useRef(0);
  const lastFixKeyRef = useRef(null);

  const rawRouteCoords = useMemo(
    () =>
      toLineCoordinates(routeLine) ??
      toLineCoordinates(storeRouteGeometry) ??
      toLineCoordinates(activeRoute),
    [routeLine, storeRouteGeometry, activeRoute],
  );

  // Pedestrian Footstep Bearing Calculation
  useEffect(() => {
    if (!userLocation) return;

    if (prevLocationRef.current) {
      const prev = [prevLocationRef.current.lng, prevLocationRef.current.lat];
      const curr = [userLocation.lng, userLocation.lat];
      const dist = distanceMeters(prev, curr);

      if (dist >= 0.8) {
        motionHeadingRef.current = calculateBearing(prev, curr);
      }
    }

    prevLocationRef.current = userLocation;
  }, [userLocation]);

  // Snapping + Segment Indexing
  const snappedPosition = useMemo(() => {
    if (!isNavigating || !userLocation || !rawRouteCoords?.length) return null;
    const pos = [userLocation.lng, userLocation.lat];

    let minDist = Infinity;
    let bestPoint = pos;
    let bestSegmentIdx = 0;

    for (let i = 0; i < rawRouteCoords.length - 1; i++) {
      const proj = projectPointToSegment(
        pos,
        rawRouteCoords[i],
        rawRouteCoords[i + 1],
      );
      const d = distanceMeters(pos, proj);
      if (d < minDist) {
        minDist = d;
        bestPoint = proj;
        bestSegmentIdx = i;
      }
    }

    const nextCoord = rawRouteCoords[bestSegmentIdx + 1] || bestPoint;
    const roadBearing = calculateBearing(bestPoint, nextCoord);
    const effectiveBearing = Number.isFinite(userLocation.heading)
      ? userLocation.heading
      : motionHeadingRef.current || roadBearing;

    if (minDist <= OFF_ROUTE_THRESHOLD_M) {
      return {
        coordinates: bestPoint,
        bearing: effectiveBearing,
        isSnapped: true,
        segmentIndex: bestSegmentIdx,
      };
    }

    return {
      coordinates: pos,
      bearing: effectiveBearing,
      isSnapped: false,
      segmentIndex: -1,
    };
  }, [isNavigating, userLocation, rawRouteCoords]);

  // 🚀 Dynamic Route Polyline Trimming (Google Maps style)
  const connectedRouteGeometry = useMemo(() => {
    if (!isNavigating || !rawRouteCoords?.length) {
      return routeLine || storeRouteGeometry || activeRoute;
    }

    if (snappedPosition?.isSnapped && snappedPosition.segmentIndex >= 0) {
      const remainingCoords = rawRouteCoords.slice(
        snappedPosition.segmentIndex + 1,
      );
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [snappedPosition.coordinates, ...remainingCoords],
        },
      };
    }

    return routeLine || storeRouteGeometry || activeRoute;
  }, [
    isNavigating,
    rawRouteCoords,
    snappedPosition,
    routeLine,
    storeRouteGeometry,
    activeRoute,
  ]);

  const fetchRoute = useCallback(
    async (
      origin,
      destination,
      { reroute = false, profile: p = profile } = {},
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetchingRef.current = true;
      lastFetchAtRef.current = Date.now();
      offRouteCountRef.current = 0;
      setLoading(true);
      setIsRerouting(reroute);
      setError(null);

      try {
        const coords = `${origin.join(",")};${destination.join(",")}`;
        const params = new URLSearchParams({
          steps: "true",
          geometries: "geojson",
          overview: "full",
          language: "en",
          access_token: accessToken,
        });

        const res = await fetch(`${DIRECTIONS_URL}/${p}/${coords}?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Directions failed (${res.status})`);

        const data = await res.json();
        const best = data.routes?.[0];
        if (!best) throw new Error("No route found");

        setSteps((best.legs?.[0]?.steps ?? []).map(normalizeStep));
        setStepIndex(0);
        setRouteLine(best.geometry);
        setIsOffRoute(false);

        const setGeometry = useMapStore.getState().setRouteGeometry;
        if (typeof setGeometry === "function") {
          setGeometry(best.geometry);
        }

        return best;
      } catch (err) {
        if (err.name !== "AbortError") setError(err);
        return null;
      } finally {
        if (abortRef.current === controller) {
          fetchingRef.current = false;
          setLoading(false);
          setIsRerouting(false);
        }
      }
    },
    [accessToken, profile],
  );

  const getDirections = useCallback(
    (liveLng, liveLat, destLng, destLat, opts = { reroute: true }) =>
      fetchRoute([liveLng, liveLat], [destLng, destLat], opts),
    [fetchRoute],
  );

  // Reset when navigation ends
  useEffect(() => {
    if (isNavigating) return;
    abortRef.current?.abort();
    fetchingRef.current = false;
    offRouteCountRef.current = 0;
    lastFixKeyRef.current = null;
    setSteps([]);
    setStepIndex(0);
    setRouteLine(null);
    setLoading(false);
    setIsRerouting(false);
    setIsOffRoute(false);
    setError(null);
    useMapStore.getState().setRouteGeometry?.(null);
  }, [isNavigating]);

  // Initial Route Fetch
  useEffect(() => {
    if (!isNavigating || steps.length || fetchingRef.current) return;
    if (!userLocation || !Array.isArray(destCoords)) return;
    if (Date.now() - lastFetchAtRef.current < REROUTE_COOLDOWN_MS) return;

    fetchRoute([userLocation.lng, userLocation.lat], destCoords);
  }, [isNavigating, steps.length, userLocation, destCoords, fetchRoute]);

  // Maneuver Progression
  useEffect(() => {
    if (!isNavigating || !userLocation || !steps.length) return;
    if (stepIndex >= steps.length - 1) return;

    const pos = snappedPosition?.coordinates || [
      userLocation.lng,
      userLocation.lat,
    ];
    const d = distanceMeters(pos, steps[stepIndex].location);
    if (d <= ADVANCE_RADIUS_M) setStepIndex(stepIndex + 1);
  }, [isNavigating, userLocation, snappedPosition, steps, stepIndex]);

  // Off-route Detection & Auto-Reroute
  useEffect(() => {
    if (!isNavigating || !userLocation || !rawRouteCoords) return;
    if (!steps.length || fetchingRef.current) return;
    if (
      userLocation.accuracy != null &&
      userLocation.accuracy > MAX_ACCEPTABLE_ACCURACY_M
    )
      return;

    const fixKey = `${userLocation.timestamp ?? ""}|${userLocation.lng}|${userLocation.lat}`;
    if (lastFixKeyRef.current === fixKey) return;
    lastFixKeyRef.current = fixKey;

    const pos = [userLocation.lng, userLocation.lat];
    const deviation = distanceToRouteMeters(pos, rawRouteCoords);

    if (deviation <= OFF_ROUTE_THRESHOLD_M) {
      offRouteCountRef.current = 0;
      setIsOffRoute(false);
      return;
    }

    offRouteCountRef.current += 1;
    if (offRouteCountRef.current < OFF_ROUTE_CONFIRMATIONS) return;

    setIsOffRoute(true);

    const cooledDown =
      Date.now() - lastFetchAtRef.current >= REROUTE_COOLDOWN_MS;
    if (cooledDown && Array.isArray(destCoords)) {
      getDirections(pos[0], pos[1], destCoords[0], destCoords[1]);
    }
  }, [
    isNavigating,
    userLocation,
    rawRouteCoords,
    steps.length,
    destCoords,
    getDirections,
  ]);

  const step = steps[stepIndex] ?? null;

  const distanceToManeuver = useMemo(() => {
    if (!userLocation || !step) return null;
    const pos = snappedPosition?.coordinates || [
      userLocation.lng,
      userLocation.lat,
    ];
    return distanceMeters(pos, step.location);
  }, [userLocation, snappedPosition, step]);

  return {
    step,
    steps,
    stepIndex,
    distanceToManeuver,
    destinationPandal,
    snappedPosition,
    routeGeometry: connectedRouteGeometry, // 🚀 Dynamically trimmed & connected polyline
    loading,
    isRerouting,
    isOffRoute,
    error,
    fetchRoute,
    getDirections,
  };
}
