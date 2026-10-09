import { useState } from "react";
import { X, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import useMapStore from "../../store/useMapStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AddPandalModal({ isOpen, onClose }) {
  const [pandalName, setPandalName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const userLocation = useMapStore((state) => state.userLocation);
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);
  const setNearbyPandals = useMapStore((state) => state.setNearbyPandals);
  const nearbyPandals = useMapStore((state) => state.nearbyPandals);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pandalName.trim()) return;

    if (!userLocation) {
      alert(
        "Please enable GPS location so we can place the pandal at your current position.",
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMsg("Verifying with Google Maps...");

    try {
      const res = await axios.post(`${API_URL}/pandals/add`, {
        name: pandalName.trim(),
        lat: userLocation.lat,
        lng: userLocation.lng,
      });

      const newPandal = res.data.pandal;

      setNearbyPandals([newPandal, ...nearbyPandals]);
      setSelectedPandal(newPandal);

      setStatusMsg("Success!");
      setTimeout(() => {
        setIsSubmitting(false);
        setStatusMsg(null);
        setPandalName("");
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Failed to add pandal:", error);
      alert(
        error.response?.data?.message ||
          "Failed to add pandal. Please try again.",
      );
      setIsSubmitting(false);
      setStatusMsg(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end flex-col animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl p-6 shadow-2xl border-t border-gray-100 flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Add Missing Pandal
            </h3>
            <p className="text-xs text-gray-500">
              Location detected from your GPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold text-blue-900">
          <MapPin size={16} className="text-blue-600 animate-pulse" />
          {userLocation ? (
            <span>
              GPS Pin Locked: {userLocation.lat.toFixed(5)},{" "}
              {userLocation.lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-amber-700">Acquiring GPS location...</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Pandal / Club Name
            </label>
            <input
              type="text"
              required
              value={pandalName}
              onChange={(e) => setPandalName(e.target.value)}
              placeholder="e.g. Mudiali Club or Shibpur Sarbojanin"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-500 font-medium"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Typos will automatically be corrected using Google Places.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !userLocation}
            className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {statusMsg}
              </>
            ) : statusMsg === "Success!" ? (
              <>
                <CheckCircle2 size={18} /> Verified & Added!
              </>
            ) : (
              "Submit Pandal"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
