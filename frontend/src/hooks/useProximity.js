import { useEffect } from "react";
import { point } from "@turf/helpers";
import distance from "@turf/distance";
import useMapStore from "../store/useMapStore";

const DETECTION_RADIUS_METERS = 100; // Trigger alert when within 100 meters

export default function useProximity() {
  const userLocation = useMapStore((state) => state.userLocation);
  const nearbyPandals = useMapStore((state) => state.nearbyPandals);
  const setActiveProximityPandal = useMapStore(
    (state) => state.setActiveProximityPandal,
  );
  const selectedPandal = useMapStore((state) => state.selectedPandal);

  useEffect(() => {
    // If we have no GPS or no pandals on the map, do nothing
    if (!userLocation || nearbyPandals.length === 0) {
      setActiveProximityPandal(null);
      return;
    }

    // Convert user GPS into a Turf point
    const userPoint = point([userLocation.lng, userLocation.lat]);

    let nearestPandal = null;
    let minDistance = Infinity;

    // Check distance to all nearby pandals
    for (const pandal of nearbyPandals) {
      const pandalPoint = point([
        pandal.location.coordinates[0],
        pandal.location.coordinates[1],
      ]);
      const distMeters = distance(userPoint, pandalPoint, { units: "meters" });

      if (distMeters < DETECTION_RADIUS_METERS && distMeters < minDistance) {
        minDistance = distMeters;
        nearestPandal = pandal;
      }
    }

    // Don't show the popup if the user has already clicked on this exact pandal
    if (nearestPandal && selectedPandal?._id === nearestPandal._id) {
      setActiveProximityPandal(null);
    } else {
      setActiveProximityPandal(nearestPandal);
    }
  }, [userLocation, nearbyPandals, setActiveProximityPandal, selectedPandal]);
}
