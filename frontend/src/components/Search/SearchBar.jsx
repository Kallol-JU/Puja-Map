import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Navigation,
  X,
  MapPin,
  Sparkles,
  ArrowDownUp,
} from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function SearchBar() {
  const pandals = useMapStore((state) => state.pandals) || [];
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);

  const isRouteMode = useMapStore((state) => state.isRouteMode);
  const setIsRouteMode = useMapStore((state) => state.setIsRouteMode);

  const originPandal = useMapStore((state) => state.originPandal);
  const setOriginPandal = useMapStore((state) => state.setOriginPandal);

  const destinationPandal = useMapStore((state) => state.destinationPandal);
  const setDestinationPandal = useMapStore(
    (state) => state.setDestinationPandal,
  );

  const swapOriginAndDestination = useMapStore(
    (state) => state.swapOriginAndDestination,
  );
  const clearNavigation = useMapStore((state) => state.clearNavigation);

  const [activeInput, setActiveInput] = useState(null); // 'single' | 'origin' | 'destination'
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  const originText = originPandal ? originPandal.name : "Your Location";
  const destinationText = destinationPandal ? destinationPandal.name : "";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveInput(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smart Search: Prioritize Kolkata VIPs & Exact Matches
  const suggestions = useMemo(() => {
    if (!query.trim() || !Array.isArray(pandals)) return [];
    const q = query.toLowerCase().trim();

    const filtered = pandals.filter(
      (p) =>
        p?.name?.toLowerCase().includes(q) ||
        p?.area?.toLowerCase().includes(q) ||
        p?.aliases?.some((a) => a.toLowerCase().includes(q)),
    );

    return filtered
      .sort((a, b) => {
        const aIsVIP = a.confidenceLevel === "HIGH" ? 1 : 0;
        const bIsVIP = b.confidenceLevel === "HIGH" ? 1 : 0;
        if (aIsVIP !== bIsVIP) return bIsVIP - aIsVIP;

        const aStartsWith = a.name?.toLowerCase().startsWith(q) ? 1 : 0;
        const bStartsWith = b.name?.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

        return 0;
      })
      .slice(0, 5);
  }, [pandals, query]);

  const handleSelectSuggestion = (pandal) => {
    if (!isRouteMode) {
      setSelectedPandal(pandal);
      setDestinationPandal(pandal);
    } else if (activeInput === "origin") {
      setOriginPandal(pandal);
    } else if (activeInput === "destination") {
      setDestinationPandal(pandal);
      setSelectedPandal(pandal);
    }
    setQuery("");
    setActiveInput(null);
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-[320px] mx-auto">
      {/* ----------------------------------------------------------------- */}
      {/* ROUTE MODE: COMPACT FLOATING DUAL CARD                            */}
      {/* ----------------------------------------------------------------- */}
      {isRouteMode ? (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-2.5 transition-all">
          <div className="flex items-center gap-2">
            {/* Left Connector Graphic */}
            <div className="flex flex-col items-center justify-center pl-0.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-white shadow-xs" />
              <div className="w-0.5 h-5 bg-gradient-to-b from-blue-500 to-emerald-500 my-0.5 rounded-full opacity-60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>

            {/* Input Stack */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="relative flex items-center bg-slate-100/80 rounded-lg px-2.5 py-1 border border-slate-200/50 focus-within:bg-white focus-within:border-blue-500 transition-all">
                <input
                  type="text"
                  className="w-full bg-transparent text-[11px] font-medium text-slate-800 outline-none placeholder-slate-400 truncate"
                  placeholder="Choose starting point"
                  value={activeInput === "origin" ? query : originText}
                  onFocus={() => {
                    setActiveInput("origin");
                    setQuery("");
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="relative flex items-center bg-slate-100/80 rounded-lg px-2.5 py-1 border border-slate-200/50 focus-within:bg-white focus-within:border-emerald-500 transition-all">
                <input
                  type="text"
                  className="w-full bg-transparent text-[11px] font-medium text-slate-800 outline-none placeholder-slate-400 truncate"
                  placeholder="Choose destination"
                  value={
                    activeInput === "destination" ? query : destinationText
                  }
                  onFocus={() => {
                    setActiveInput("destination");
                    setQuery("");
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-between items-center self-stretch py-0.5 gap-1 shrink-0">
              <button
                onClick={swapOriginAndDestination}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Swap"
              >
                <ArrowDownUp size={14} />
              </button>

              <button
                onClick={clearNavigation}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------- */
        /* STANDARD MODE: MINIMAL FLOATING CAPSULE PILL                      */
        /* ----------------------------------------------------------------- */
        <div className="flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg shadow-black/5 border border-slate-200/80 pl-3.5 pr-1 py-1 transition-all hover:bg-white hover:shadow-xl">
          <Search size={15} className="text-slate-400 mr-2 shrink-0" />

          <input
            type="text"
            className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none placeholder-slate-400 truncate"
            placeholder="Search pandal or metro..."
            value={query}
            onFocus={() => setActiveInput("single")}
            onChange={(e) => setQuery(e.target.value)}
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full shrink-0 mr-1"
            >
              <X size={13} />
            </button>
          )}

          <button
            onClick={() => setIsRouteMode(true)}
            className="flex items-center justify-center w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm active:scale-95 transition-all shrink-0 ml-1"
            title="Directions"
          >
            <Navigation size={13} className="fill-white" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEARCH RESULTS DROPDOWN                                           */}
      {/* ----------------------------------------------------------------- */}
      {activeInput && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 divide-y divide-slate-100">
          {activeInput === "origin" && (
            <button
              onClick={() => {
                setOriginPandal(null);
                setActiveInput(null);
                setQuery("");
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/70 flex items-center gap-2.5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Navigation size={13} className="fill-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Your Location
                </p>
                <p className="text-[10px] text-blue-600">
                  Current GPS position
                </p>
              </div>
            </button>
          )}

          {suggestions.map((p) => (
            <button
              key={p._id}
              onClick={() => handleSelectSuggestion(p)}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    p.confidenceLevel === "HIGH"
                      ? "bg-pink-100 text-pink-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <MapPin size={13} />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {p.area || "Kolkata"}
                  </p>
                </div>
              </div>

              {p.confidenceLevel === "HIGH" && (
                <span className="shrink-0 px-2 py-0.5 text-[9px] font-bold bg-pink-50 text-pink-600 rounded-full border border-pink-100 flex items-center gap-0.5">
                  <Sparkles size={9} /> VIP
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
