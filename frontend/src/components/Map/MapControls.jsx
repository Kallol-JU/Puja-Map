import { Plus, Minus, Navigation, Compass, PlusCircle } from "lucide-react";

export default function MapControls({ mapRef, onRecenter, onOpenAddModal }) {
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

  const handleResetBearing = () => {
    if (mapRef?.current) {
      mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 400 });
    }
  };

  return (
    <div className="flex flex-col gap-2.5 items-end select-none">
      {/* 1. Add Pandal Action Button */}
      {onOpenAddModal && (
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all"
        >
          <PlusCircle size={15} className="text-pink-600" />
          <span>Add Pandal</span>
        </button>
      )}

      {/* 2. Google Maps Vertical Control Stack (+ / - / Compass) */}
      <div className="flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden w-10">
        <button
          onClick={handleZoomIn}
          className="p-2.5 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200 transition-colors flex items-center justify-center"
          title="Zoom In"
        >
          <Plus size={18} />
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2.5 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200 transition-colors flex items-center justify-center"
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>

        <button
          onClick={handleResetBearing}
          className="p-2.5 text-slate-700 hover:bg-slate-100/80 active:bg-slate-200 transition-colors flex items-center justify-center"
          title="Reset Bearing & 2D Tilt"
        >
          <Compass size={17} />
        </button>
      </div>

      <button
        onClick={onRecenter}
        className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl active:scale-95 transition-all flex items-center justify-center"
        title="Recenter to My Location"
      >
        <Navigation size={17} className="fill-white" />
      </button>
    </div>
  );
}
