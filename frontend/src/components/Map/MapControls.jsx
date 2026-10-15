import { Plus, Minus, Navigation } from "lucide-react";

export default function MapControls({ mapRef, onRecenter }) {
  const handleZoomIn = () => {
    if (mapRef?.current) {
      mapRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapRef?.current) {
      mapRef.current.zoomOut({ duration: 300 });
    }
  };

  return (
    <div className="flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 select-none w-10">
      {/* 1. Zoom In */}
      <button
        onClick={handleZoomIn}
        className="w-10 h-10 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      {/* 2. Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="w-10 h-10 flex items-center justify-center text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      {/* 3. Current Location */}
      <button
        onClick={onRecenter}
        className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
        title="Current Location"
      >
        <Navigation size={17} className="fill-blue-600" />
      </button>
    </div>
  );
}
