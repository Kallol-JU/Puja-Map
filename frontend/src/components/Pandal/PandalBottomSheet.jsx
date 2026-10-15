import { useState } from "react";
import { X, Navigation, MapPin, Loader2, Footprints } from "lucide-react";
import useMapStore from "../../store/useMapStore";
import { getDirections } from "../../services/mapbox";

export default function PandalBottomSheet() {
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const clearNavigation = useMapStore((state) => state.clearNavigation);
  const userLocation = useMapStore((state) => state.userLocation);

  const setActiveRoute = useMapStore((state) => state.setActiveRoute);
  const routeStats = useMapStore((state) => state.routeStats);
  const setRouteStats = useMapStore((state) => state.setRouteStats);

  // Navigation state
  const isNavigating = useMapStore((state) => state.isNavigating);
  const setIsNavigating = useMapStore((state) => state.setIsNavigating);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Hide sheet if no pandal selected or active turn-by-turn navigation is running
  if (!selectedPandal || isNavigating) return null;

  const handleNavigation = async () => {
    if (!userLocation) {
      alert("Please enable GPS location permissions to get directions.");
      return;
    }

    setIsLoadingRoute(true);

    // Fallback coordinates check
    const destCoords =
      selectedPandal.navigationPoint?.coordinates ||
      selectedPandal.location?.coordinates;

    if (!Array.isArray(destCoords) || destCoords.length < 2) {
      alert("Pandal coordinates are unavailable.");
      setIsLoadingRoute(false);
      return;
    }

    const routeData = await getDirections(
      userLocation.lng,
      userLocation.lat,
      destCoords[0],
      destCoords[1],
    );

    if (routeData) {
      // 1. Save geometry for the active map route line
      setActiveRoute({
        type: "Feature",
        geometry: routeData.geometry,
      });

      // 2. Format distance & pedestrian walking time
      const distMeters = routeData.distance || 0;
      const formattedDistance =
        distMeters < 1000
          ? `${Math.round(distMeters)} m`
          : `${(distMeters / 1000).toFixed(1)} km`;

      setRouteStats({
        distanceKm: formattedDistance,
        durationMin: Math.max(1, Math.round((routeData.duration || 0) / 60)),
      });
    } else {
      alert("Could not calculate a route to this pandal.");
    }

    setIsLoadingRoute(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pointer-events-none transition-all">
      <div className="pointer-events-auto mx-auto max-w-md bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-gray-100 flex flex-col gap-3 transition-all animate-in slide-in-from-bottom duration-300">
        {/* Pandal Info Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-gray-900 truncate">
                {selectedPandal.name}
              </h3>
              {selectedPandal.confidenceLevel === "HIGH" && (
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-pink-50 text-pink-600 rounded-full border border-pink-100">
                  VIP
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPin size={13} className="text-blue-500 shrink-0 inline" />
              {selectedPandal.area || "Kolkata Durga Puja"}
            </p>
          </div>

          <button
            onClick={clearNavigation}
            className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pedestrian Route Stats Pill */}
        {routeStats && (
          <div className="flex items-center justify-around bg-blue-50/80 border border-blue-100 p-2.5 rounded-2xl text-xs font-bold text-blue-900 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Footprints size={15} className="text-blue-600" />
              <span>{routeStats.distanceKm}</span>
            </div>
            <div className="w-px h-4 bg-blue-200" />
            <div className="flex items-center gap-1.5">
              <span>⏱️ ~{routeStats.durationMin} mins walk</span>
            </div>
          </div>
        )}

        {/* Action Button: Calculates Route -> Switches to Live Navigation */}
        {!routeStats ? (
          <button
            onClick={handleNavigation}
            disabled={isLoadingRoute}
            className="w-full py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all mt-1 font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-75"
          >
            {isLoadingRoute ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Calculating
                route...
              </>
            ) : (
              <>
                <Navigation size={18} /> Get Walking Directions
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsNavigating(true)}
            className="w-full py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all mt-1 font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Navigation size={18} className="fill-white" /> Start Turn-by-Turn
            Navigation
          </button>
        )}
      </div>
    </div>
  );
}
