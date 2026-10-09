import { Navigation, X } from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function ActiveNavPanel() {
  const isNavigating = useMapStore((state) => state.isNavigating);
  const routeStats = useMapStore((state) => state.routeStats);
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const clearNavigation = useMapStore((state) => state.clearNavigation);

  if (!isNavigating) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-30">
      <div className="bg-emerald-600 rounded-3xl shadow-2xl overflow-hidden border border-emerald-700">
        <div className="p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-full">
              <Navigation
                size={24}
                className="fill-white transform rotate-45"
              />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {routeStats?.durationMin || "--"} min
              </h2>
              <p className="text-emerald-100 font-medium text-sm">
                {routeStats?.distanceKm || "--"} km • toward{" "}
                {selectedPandal?.name}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={clearNavigation}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 text-sm transition-colors"
        >
          End Navigation
        </button>
      </div>
    </div>
  );
}
