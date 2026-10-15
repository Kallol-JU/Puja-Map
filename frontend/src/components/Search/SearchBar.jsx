import { useState, useMemo, useRef, useEffect } from "react";
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

  // 🚀 SMART SEARCH: Prioritize Kolkata VIPs & Exact Matches FIRST
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
        // 1. Give top priority to VIP-Seed / HIGH confidence pandals
        const aIsVIP = a.confidenceLevel === "HIGH" ? 1 : 0;
        const bIsVIP = b.confidenceLevel === "HIGH" ? 1 : 0;
        if (aIsVIP !== bIsVIP) return bIsVIP - aIsVIP;

        // 2. Prioritize names that START with the query
        const aStartsWith = a.name?.toLowerCase().startsWith(q) ? 1 : 0;
        const bStartsWith = b.name?.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

        // 3. Prioritize Metro/Kolkata core areas over far districts
        const kolkataKeywords = [
          "metro",
          "kolkata",
          "salt lake",
          "behala",
          "howrah",
          "garia",
          "kasba",
        ];
        const aIsKolkata = kolkataKeywords.some((k) =>
          a.area?.toLowerCase().includes(k),
        )
          ? 1
          : 0;
        const bIsKolkata = kolkataKeywords.some((k) =>
          b.area?.toLowerCase().includes(k),
        )
          ? 1
          : 0;
        if (aIsKolkata !== bIsKolkata) return bIsKolkata - aIsKolkata;

        return 0;
      })
      .slice(0, 6);
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
    <div ref={dropdownRef} className="relative w-full max-w-md mx-auto">
      {/* ----------------------------------------------------------------- */}
      {/* ROUTE MODE: ELEGANT DUAL-INPUT MOBILE TOP SHEET                    */}
      {/* ----------------------------------------------------------------- */}
      {isRouteMode ? (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-gray-100/80 p-3 transition-all duration-200">
          <div className="flex items-center gap-2.5">
            {/* Left Connector Graphic */}
            <div className="flex flex-col items-center justify-center pl-1 shrink-0">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white shadow-sm" />
              <div className="w-0.5 h-7 bg-gradient-to-b from-blue-400 to-pink-500 my-1 rounded-full opacity-60" />
              <div className="w-3.5 h-3.5 rounded-full bg-pink-600 shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Input Stack */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* Origin Input */}
              <div className="relative flex items-center bg-gray-50/80 rounded-xl px-3 py-1.5 border border-gray-200/60 focus-within:bg-white focus-within:border-blue-500 transition-all">
                <input
                  type="text"
                  className="w-full bg-transparent text-xs font-semibold text-gray-800 outline-none placeholder-gray-400 truncate"
                  placeholder="Choose starting point"
                  value={activeInput === "origin" ? query : originText}
                  onFocus={() => {
                    setActiveInput("origin");
                    setQuery("");
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Destination Input */}
              <div className="relative flex items-center bg-gray-50/80 rounded-xl px-3 py-1.5 border border-gray-200/60 focus-within:bg-white focus-within:border-pink-500 transition-all">
                <input
                  type="text"
                  className="w-full bg-transparent text-xs font-semibold text-gray-800 outline-none placeholder-gray-400 truncate"
                  placeholder="Choose destination pandal"
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

            {/* Right Buttons Stack */}
            <div className="flex flex-col justify-between items-center self-stretch py-0.5 gap-2 shrink-0">
              <button
                onClick={swapOriginAndDestination}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Swap locations"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>

              <button
                onClick={clearNavigation}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Close directions"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------------------- */
        /* STANDARD MODE: MINIMAL FLOATING PILL                              */
        /* ----------------------------------------------------------------- */
        <div className="flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100/80 px-4 py-2.5 transition-all">
          <svg
            className="w-4 h-4 text-gray-400 mr-2.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            className="w-full text-xs font-medium text-gray-800 bg-transparent outline-none placeholder-gray-400 truncate"
            placeholder="Search pandal or metro station..."
            value={query}
            onFocus={() => setActiveInput("single")}
            onChange={(e) => setQuery(e.target.value)}
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-gray-400 hover:text-gray-600 mr-1 shrink-0"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <button
            onClick={() => setIsRouteMode(true)}
            className="ml-1.5 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
            title="Directions Mode"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEARCH RESULTS DROPDOWN WITH BADGES                               */}
      {/* ----------------------------------------------------------------- */}
      {activeInput && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 divide-y divide-gray-50">
          {/* Default Option when changing Origin */}
          {activeInput === "origin" && (
            <button
              onClick={() => {
                setOriginPandal(null);
                setActiveInput(null);
                setQuery("");
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50/60 flex items-center gap-3 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Your Location</p>
                <p className="text-[10px] text-blue-600">
                  Use current GPS position
                </p>
              </div>
            </button>
          )}

          {/* Suggestion Items */}
          {suggestions.map((p) => (
            <button
              key={p._id}
              onClick={() => handleSelectSuggestion(p)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    p.confidenceLevel === "HIGH"
                      ? "bg-pink-100 text-pink-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {p.area || "Kolkata"}
                  </p>
                </div>
              </div>

              {/* VIP Badge */}
              {p.confidenceLevel === "HIGH" && (
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-pink-50 text-pink-600 rounded-full border border-pink-100">
                  VIP
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
