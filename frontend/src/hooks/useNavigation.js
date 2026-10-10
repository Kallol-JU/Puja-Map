import { useState, useCallback, useMemo, useRef } from "react";

const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox";
const ADVANCE_RADIUS_M = 25; // how close to a maneuver before we move to the next one

// Haversine distance in meters between two [lng, lat] points
function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Flatten the Mapbox step shape into just what the UI needs
function normalizeStep(step) {
  return {
    instruction: step.maneuver.instruction, // e.g. "Turn left onto Park Street"
    type: step.maneuver.type, // turn, depart, arrive, roundabout, ...
    modifier: step.maneuver.modifier, // left, right, slight left, uturn, ...
    location: step.maneuver.location, // [lng, lat] where the maneuver happens
    name: step.name, // street name
    distance: step.distance, // meters for this step
    duration: step.duration, // seconds for this step
  };
}

export function useNavigation({ accessToken, profile = "driving" } = {}) {
  const [route, setRoute] = useState(null); // GeoJSON LineString geometry (unchanged behavior)
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0); // index of the UPCOMING maneuver
  const [userPosition, setUserPosition] = useState(null); // [lng, lat]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchRoute = useCallback(
    async (origin, destination, overrideProfile = profile) => {
      // origin / destination are [lng, lat]
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const coords = `${origin.join(",")};${destination.join(",")}`;
        const params = new URLSearchParams({
          steps: "true", // <-- required to get legs[0].steps
          geometries: "geojson",
          overview: "full",
          language: "en",
          access_token: accessToken,
        });

        const res = await fetch(
          `${DIRECTIONS_URL}/${overrideProfile}/${coords}?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok)
          throw new Error(`Directions request failed (${res.status})`);

        const data = await res.json();
        const best = data.routes?.[0];
        if (!best) throw new Error("No route found");

        setRoute(best.geometry);
        setSteps((best.legs?.[0]?.steps ?? []).map(normalizeStep));
        setStepIndex(0);
        return best;
      } catch (err) {
        if (err.name !== "AbortError") setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [accessToken, profile],
  );

  // Call this from your geolocation watcher: updatePosition([lng, lat])
  const updatePosition = useCallback(
    (lngLat) => {
      setUserPosition(lngLat);
      setStepIndex((current) => {
        if (!steps.length || current >= steps.length - 1) return current;
        const d = distanceMeters(lngLat, steps[current].location);
        return d <= ADVANCE_RADIUS_M ? current + 1 : current;
      });
    },
    [steps],
  );

  const upcomingStep = steps[stepIndex] ?? null;

  // Straight-line distance to the next maneuver (null until we have a GPS fix)
  const distanceToManeuver = useMemo(() => {
    if (!userPosition || !upcomingStep) return null;
    return distanceMeters(userPosition, upcomingStep.location);
  }, [userPosition, upcomingStep]);

  const clearRoute = useCallback(() => {
    abortRef.current?.abort();
    setRoute(null);
    setSteps([]);
    setStepIndex(0);
  }, []);

  return {
    route,
    steps,
    stepIndex,
    upcomingStep,
    distanceToManeuver,
    loading,
    error,
    fetchRoute,
    updatePosition,
    clearRoute,
  };
}
