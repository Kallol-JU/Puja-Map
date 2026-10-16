import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import useMapStore from "../store/useMapStore";

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox";

const ADVANCE_RADIUS_M = 15; // advance when within 15m of the turn
const OFF_ROUTE_THRESHOLD_M = 25;
const OFF_ROUTE_CONFIRMATIONS = 2;
const REROUTE_COOLDOWN_MS = 6000;
const MAX_ACCEPTABLE_ACCURACY_M = 50;
const MOVE_THRESHOLD_M = 0.8;
const MOTION_HEADING_HOLD_MS = 4000;
const SEGMENT_WINDOW_BACK = 2;
const SEGMENT_WINDOW_AHEAD = 40;

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

function nearestOnRoute(pos, coords, from, to) {
  let best = { dist: Infinity, point: pos, index: from };
  for (let i = from; i < to; i++) {
    const proj = projectPointToSegment(pos, coords[i], coords[i + 1]);
    const d = distanceMeters(pos, proj);
    if (d < best.dist) best = { dist: d, point: proj, index: i };
  }
  return best;
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

  const abortRef = useRef(null);
  const fetchingRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const offRouteCountRef = useRef(0);
  const lastFixKeyRef = useRef(null);
  const segmentHintRef = useRef(0);
  const hintRouteRef = useRef(null);
  const motionRef = useRef({ ref: null, heading: null, at: 0 });

  const rawRouteCoords = useMemo(
    () =>
      toLineCoordinates(routeLine) ??
      toLineCoordinates(storeRouteGeometry) ??
      toLineCoordinates(activeRoute),
    [routeLine, storeRouteGeometry, activeRoute],
  );

  const motionHeading = useMemo(() => {
    if (!userLocation) return null;
    const curr = [userLocation.lng, userLocation.lat];
    const now = userLocation.timestamp ?? Date.now();
    const m = motionRef.current;

    if (!m.ref) {
      m.ref = curr;
      return null;
    }
    if (distanceMeters(m.ref, curr) >= MOVE_THRESHOLD_M) {
      m.heading = calculateBearing(m.ref, curr);
      m.ref = curr;
      m.at = now;
    }
    return m.heading != null && now - m.at <= MOTION_HEADING_HOLD_MS
      ? m.heading
      : null;
  }, [userLocation]);

  const snappedPosition = useMemo(() => {
    if (!isNavigating || !userLocation || !rawRouteCoords?.length) return null;
    if (rawRouteCoords.length < 2) return null;

    if (hintRouteRef.current !== rawRouteCoords) {
      hintRouteRef.current = rawRouteCoords;
      segmentHintRef.current = 0;
    }

    const pos = [userLocation.lng, userLocation.lat];
    const lastSeg = rawRouteCoords.length - 1;
    const from = Math.max(0, segmentHintRef.current - SEGMENT_WINDOW_BACK);
    const to = Math.min(lastSeg, segmentHintRef.current + SEGMENT_WINDOW_AHEAD);

    let best = nearestOnRoute(pos, rawRouteCoords, from, to);
    if (best.dist > OFF_ROUTE_THRESHOLD_M) {
      const global = nearestOnRoute(pos, rawRouteCoords, 0, lastSeg);
      if (global.dist < best.dist) best = global;
    }

    const isSnapped = best.dist <= OFF_ROUTE_THRESHOLD_M;
    if (isSnapped) segmentHintRef.current = best.index;

    const roadBearing = calculateBearing(
      best.point,
      rawRouteCoords[best.index + 1],
    );
    const bearing =
      motionHeading ??
      (Number.isFinite(userLocation.heading)
        ? userLocation.heading
        : roadBearing);

    return {
      coordinates: isSnapped ? best.point : pos,
      bearing,
      isSnapped,
      segmentIndex: isSnapped ? best.index : -1,
      deviation: best.dist,
    };
  }, [isNavigating, userLocation, rawRouteCoords, motionHeading]);

  const connectedRouteGeometry = useMemo(() => {
    const fallback = routeLine || storeRouteGeometry || activeRoute;
    if (!isNavigating || !rawRouteCoords?.length) return fallback;

    if (snappedPosition?.isSnapped) {
      return {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            snappedPosition.coordinates,
            ...rawRouteCoords.slice(snappedPosition.segmentIndex + 1),
          ],
        },
      };
    }
    return fallback;
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
        segmentHintRef.current = 0;

        useMapStore.getState().setRouteGeometry?.(best.geometry);
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

  useEffect(() => {
    if (isNavigating) return;
    abortRef.current?.abort();
    fetchingRef.current = false;
    offRouteCountRef.current = 0;
    lastFixKeyRef.current = null;
    segmentHintRef.current = 0;
    hintRouteRef.current = null;
    motionRef.current = { ref: null, heading: null, at: 0 };
    setSteps([]);
    setStepIndex(0);
    setRouteLine(null);
    setLoading(false);
    setIsRerouting(false);
    setIsOffRoute(false);
    setError(null);
    useMapStore.getState().setRouteGeometry?.(null);
  }, [isNavigating]);

  useEffect(() => {
    if (!isNavigating || steps.length || fetchingRef.current) return;
    if (!userLocation || !Array.isArray(destCoords)) return;
    if (Date.now() - lastFetchAtRef.current < REROUTE_COOLDOWN_MS) return;

    fetchRoute([userLocation.lng, userLocation.lat], destCoords);
  }, [isNavigating, steps.length, userLocation, destCoords, fetchRoute]);

  // 🚀 FIXED: Accurately advance step index based on the NEXT turn junction
  useEffect(() => {
    if (!isNavigating || !userLocation || !steps.length) return;
    if (stepIndex >= steps.length - 1) return;

    const pos = snappedPosition?.coordinates ?? [
      userLocation.lng,
      userLocation.lat,
    ];
    let next = stepIndex;

    while (
      next < steps.length - 1 &&
      distanceMeters(pos, steps[next + 1].location) <= ADVANCE_RADIUS_M
    ) {
      next += 1;
    }
    if (next !== stepIndex) setStepIndex(next);
  }, [isNavigating, userLocation, snappedPosition, steps, stepIndex]);

  useEffect(() => {
    if (!isNavigating || !userLocation || !snappedPosition) return;
    if (!steps.length || fetchingRef.current) return;
    if (
      userLocation.accuracy != null &&
      userLocation.accuracy > MAX_ACCEPTABLE_ACCURACY_M
    )
      return;

    const fixKey = `${userLocation.timestamp ?? ""}|${userLocation.lng}|${userLocation.lat}`;
    if (lastFixKeyRef.current === fixKey) return;
    lastFixKeyRef.current = fixKey;

    if (snappedPosition.deviation <= OFF_ROUTE_THRESHOLD_M) {
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
      getDirections(
        userLocation.lng,
        userLocation.lat,
        destCoords[0],
        destCoords[1],
      );
    }
  }, [
    isNavigating,
    userLocation,
    snappedPosition,
    steps.length,
    destCoords,
    getDirections,
  ]);

  // 🚀 FIXED: Return the UPCOMING maneuver so the UI displays Left/Right Turn Icons
  const upcomingStep = steps[stepIndex + 1] ?? steps[stepIndex] ?? null;

  const distanceToManeuver = useMemo(() => {
    if (!userLocation || !upcomingStep) return null;
    const pos = snappedPosition?.coordinates ?? [
      userLocation.lng,
      userLocation.lat,
    ];
    return distanceMeters(pos, upcomingStep.location);
  }, [userLocation, snappedPosition, upcomingStep]);

  const hasArrived =
    steps.length > 0 &&
    stepIndex >= steps.length - 2 &&
    distanceToManeuver != null &&
    distanceToManeuver <= ADVANCE_RADIUS_M;

  return {
    step: upcomingStep, // Feeds the turn icons perfectly to ActiveNavPanel
    steps,
    stepIndex,
    distanceToManeuver,
    hasArrived,
    destinationPandal,
    snappedPosition,
    routeGeometry: connectedRouteGeometry,
    loading,
    isRerouting,
    isOffRoute,
    error,
    fetchRoute,
    getDirections,
  };
}
