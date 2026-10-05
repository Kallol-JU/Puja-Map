import { useState } from "react";
import { X, Navigation, MapPin, Loader2 } from "lucide-react";
import useMapStore from "../../store/useMapStore";
import { getDirections } from "../../services/mapbox";

export default function PandalBottomSheet() {
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const clearNavigation = useMapStore((state) => state.clearNavigation);
  const userLocation = useMapStore((state) => state.userLocation);

  const setActiveRoute = useMapStore((state) => state.setActiveRoute);
  const routeStats = useMapStore((state) => state.routeStats);
  const setRouteStats = useMapStore((state) => state.setRouteStats);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  if (!selectedPandal) return null;

  const handleNavigation = async () => {
    if (!userLocation) {
      alert("Please enable GPS location to get directions.");
      return;
    }

    setIsLoadingRoute(true);

    // Use navigationPoint if available, otherwise fallback to standard location
    const destCoords =
      selectedPandal.navigationPoint?.coordinates ||
      selectedPandal.location.coordinates;

    const routeData = await getDirections(
      userLocation.lng,
      userLocation.lat,
      destCoords[0],
      destCoords[1],
    );

    if (routeData) {
      // 1. Save the geometry for the map line
      setActiveRoute({
        type: "Feature",
        geometry: routeData.geometry,
      });

      // 2. Save distance (convert meters to km) and time (seconds to minutes)
      setRouteStats({
        distanceKm: (routeData.distance / 1000).toFixed(1),
        durationMin: Math.round(routeData.duration / 60),
      });
    } else {
      alert("Could not find a route to this pandal.");
    }

    setIsLoadingRoute(false);
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 z-20 bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedPandal.name}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <MapPin size={12} />
            {selectedPandal.area || "Kolkata"}
          </p>
        </div>

        <button
          onClick={clearNavigation}
          className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* Show Stats if we have them */}
      {routeStats && (
        <div className="flex gap-4 bg-blue-50 p-3 rounded-2xl text-sm font-semibold text-blue-900">
          <div>🚗 {routeStats.distanceKm} km</div>
          <div>⏱️ ~{routeStats.durationMin} mins</div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleNavigation}
        disabled={isLoadingRoute || routeStats !== null}
        className={`w-full py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2 font-bold text-white
          ${routeStats ? "bg-emerald-600" : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98]"}`}
      >
        {isLoadingRoute ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Calculating...
          </>
        ) : routeStats ? (
          <>Navigation Started</>
        ) : (
          <>
            <Navigation size={18} /> Get Directions
          </>
        )}
      </button>
    </div>
  );
}
