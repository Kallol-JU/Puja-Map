import { useEffect, useRef } from "react";
import { point } from "@turf/helpers";
import pointToLineDistance from "@turf/point-to-line-distance";
import useMapStore from "../store/useMapStore";
import { getDirections } from "../services/mapbox";

const REROUTE_THRESHOLD_METERS = 40;

export default function useNavigation() {
  const userLocation = useMapStore((state) => state.userLocation);
  const activeRoute = useMapStore((state) => state.activeRoute);
  const isNavigating = useMapStore((state) => state.isNavigating);
  const selectedPandal = useMapStore((state) => state.selectedPandal);

  const setActiveRoute = useMapStore((state) => state.setActiveRoute);
  const setRouteStats = useMapStore((state) => state.setRouteStats);

  const isRecalculating = useRef(false);

  useEffect(() => {
    // Only monitor deviation if navigation is active and we have a route
    if (
      !isNavigating ||
      !userLocation ||
      !activeRoute ||
      !selectedPandal ||
      isRecalculating.current
    ) {
      return;
    }

    const userPt = point([userLocation.lng, userLocation.lat]);

    // Calculate distance from user to the closest segment of the route polyline
    const distanceToRoute = pointToLineDistance(userPt, activeRoute, {
      units: "meters",
    });

    if (distanceToRoute > REROUTE_THRESHOLD_METERS) {
      console.log(
        `User is ${Math.round(distanceToRoute)}m off route. Recalculating...`,
      );
      isRecalculating.current = true;

      const destCoords =
        selectedPandal.navigationPoint?.coordinates ||
        selectedPandal.location.coordinates;

      getDirections(
        userLocation.lng,
        userLocation.lat,
        destCoords[0],
        destCoords[1],
      )
        .then((routeData) => {
          if (routeData) {
            setActiveRoute({ type: "Feature", geometry: routeData.geometry });
            setRouteStats({
              distanceKm: (routeData.distance / 1000).toFixed(1),
              durationMin: Math.round(routeData.duration / 60),
            });
          }
        })
        .catch((err) => console.error("Re-routing failed:", err))
        .finally(() => {
          // Add a small delay before allowing another recalculation
          setTimeout(() => {
            isRecalculating.current = false;
          }, 3000);
        });
    }
  }, [
    userLocation,
    activeRoute,
    isNavigating,
    selectedPandal,
    setActiveRoute,
    setRouteStats,
  ]);
}
