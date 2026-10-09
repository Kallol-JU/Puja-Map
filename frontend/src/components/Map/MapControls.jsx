import { Plus } from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function MapControls({ onOpenAddModal }) {
  const isNavigating = useMapStore((state) => state.isNavigating);

  if (isNavigating) return null;

  return (
    <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-3">
      <button
        onClick={onOpenAddModal}
        className="h-12 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-xl flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"
      >
        <Plus size={20} />
        <span>Add Pandal</span>
      </button>
    </div>
  );
}
