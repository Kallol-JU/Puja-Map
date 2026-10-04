import { X, Navigation, MapPin } from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function PandalBottomSheet() {
  // Read the currently selected pandal and the clear function from state
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const clearNavigation = useMapStore((state) => state.clearNavigation);

  // If no pandal is selected, don't render the card
  if (!selectedPandal) return null;

  return (
    <div className="absolute bottom-6 left-4 right-4 z-20 bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {selectedPandal.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <MapPin size={12} />
            {selectedPandal.area || "Kolkata"}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={clearNavigation}
          className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Action Button (Routing logic will be added here later) */}
      <button className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2">
        <Navigation size={18} />
        Navigate
      </button>
    </div>
  );
}
