import { useState } from "react";
import {
  Navigation,
  X,
  MapPin,
  Loader2,
  Footprints,
  Clock,
  Sparkles,
} from "lucide-react";
import useMapStore from "../../store/useMapStore";
import { getDirections } from "../../services/mapbox";

export default function PandalBottomSheet() {
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const clearNavigation = useMapStore((state) => state.clearNavigation);
  const userLocation = useMapStore((state) => state.userLocation);
  const setUserLocation = useMapStore((state) => state.setUserLocation);

  const setActiveRoute = useMapStore((state) => state.setActiveRoute);
  const routeStats = useMapStore((state) => state.routeStats);
  const setRouteStats = useMapStore((state) => state.setRouteStats);

  const isNavigating = useMapStore((state) => state.isNavigating);
  const setIsNavigating = useMapStore((state) => state.setIsNavigating);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  if (!selectedPandal || isNavigating) return null;

  // On-demand GPS trigger fallback
  const obtainCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(
          new Error("Geolocation is not supported by your browser."),
        );
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
          };
          setUserLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  };

  const handleNavigation = async () => {
    setIsLoadingRoute(true);

    let activeUserPos = userLocation;

    if (!activeUserPos) {
      try {
        activeUserPos = await obtainCurrentLocation();
      } catch (err) {
        setIsLoadingRoute(false);
        alert(
          "Location access is required for directions.\n\n" +
            "1. Tap the lock icon in your browser URL bar and allow Location.\n" +
            "2. If opening from WhatsApp/Instagram, tap ⋮ at the top right and select 'Open in Chrome / Safari'.",
        );
        return;
      }
    }

    const destCoords =
      selectedPandal.navigationPoint?.coordinates ||
      selectedPandal.location?.coordinates;

    if (!Array.isArray(destCoords) || destCoords.length < 2) {
      alert("Pandal coordinates are unavailable.");
      setIsLoadingRoute(false);
      return;
    }

    const routeData = await getDirections(
      activeUserPos.lng,
      activeUserPos.lat,
      destCoords[0],
      destCoords[1],
    );

    if (routeData) {
      setActiveRoute({
        type: "Feature",
        geometry: routeData.geometry,
      });

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
    <div className="fixed inset-x-0 bottom-4 z-40 px-3 pb-[env(safe-area-inset-bottom)] pointer-events-none transition-all">
      <div className="pointer-events-auto mx-auto max-w-[340px] sm:max-w-md bg-white/95 backdrop-blur-xl rounded-[24px] p-3 shadow-2xl border border-slate-200/80 flex flex-col gap-2.5 transition-all animate-in slide-in-from-bottom duration-300">
        {/* Pandal Info Header */}
        <div className="flex items-start justify-between gap-2 px-0.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate tracking-tight">
                {selectedPandal.name}
              </h3>
              {selectedPandal.confidenceLevel === "HIGH" && (
                <span className="shrink-0 px-2 py-0.5 text-[9px] font-extrabold bg-pink-50 text-pink-600 rounded-full border border-pink-100 flex items-center gap-0.5">
                  <Sparkles size={9} /> VIP
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPin size={12} className="text-blue-500 shrink-0 inline" />
              {selectedPandal.area || "Kolkata Durga Puja"}
            </p>
          </div>

          <button
            onClick={clearNavigation}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Compact Inline Trip Stats */}
        {routeStats && (
          <div className="flex items-center justify-center gap-2 bg-slate-100/80 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1 text-blue-600">
              <Clock size={13} /> ~{routeStats.durationMin} mins walk
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-slate-600 font-semibold">
              <Footprints size={13} /> {routeStats.distanceKm}
            </span>
          </div>
        )}

        {/* Action Button Pill */}
        {!routeStats ? (
          <button
            onClick={handleNavigation}
            disabled={isLoadingRoute}
            className="w-full py-2.5 rounded-full shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-75"
          >
            {isLoadingRoute ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Fetching route...
              </>
            ) : (
              <>
                <Navigation size={15} className="fill-white" /> Directions
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsNavigating(true)}
            className="w-full py-2.5 rounded-full shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Navigation size={15} className="fill-white" /> Start
          </button>
        )}
      </div>
    </div>
  );
}
