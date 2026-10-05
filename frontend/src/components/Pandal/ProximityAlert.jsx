import { MapPin } from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function ProximityAlert() {
  const activeProximityPandal = useMapStore(
    (state) => state.activeProximityPandal,
  );
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);

  // If the user isn't near anything, render nothing
  if (!activeProximityPandal) return null;

  return (
    <div
      className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 animate-bounce cursor-pointer"
      onClick={() => setSelectedPandal(activeProximityPandal)}
    >
      <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border-2 border-emerald-400 hover:bg-emerald-700 transition-colors">
        <MapPin size={16} className="animate-pulse" />
        <span className="text-sm font-bold whitespace-nowrap">
          You are near {activeProximityPandal.name}
        </span>
      </div>
    </div>
  );
}
