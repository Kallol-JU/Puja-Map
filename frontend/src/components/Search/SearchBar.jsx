import { useEffect } from "react";
import { Search, X, MapPin, Loader2, Navigation } from "lucide-react";
import axios from "axios";
import useMapStore from "../../store/useMapStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SearchBar() {
  const searchQuery = useMapStore((state) => state.searchQuery);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const searchResults = useMapStore((state) => state.searchResults);
  const setSearchResults = useMapStore((state) => state.setSearchResults);
  const isSearching = useMapStore((state) => state.isSearching);
  const setIsSearching = useMapStore((state) => state.setIsSearching);

  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);
  const userLocation = useMapStore((state) => state.userLocation); // Get live GPS

  // Helper to cleanly format distance returned from MongoDB
  const formatDistance = (meters) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)} m away`;
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Build query params, attaching GPS if the user has allowed location access
        const params = { q: searchQuery };
        if (userLocation) {
          params.lng = userLocation.lng;
          params.lat = userLocation.lat;
        }

        const res = await axios.get(`${API_URL}/pandals/search`, { params });
        setSearchResults(res.data);
      } catch (error) {
        console.error("Search API error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // 300ms Debounce to prevent spamming the database while typing
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, userLocation, setSearchResults, setIsSearching]);

  const handleSelect = (pandal) => {
    setSelectedPandal(pandal);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-orange-500">
        <Search className="text-gray-400 mr-2 ml-1" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pandal (e.g. Salkia or Suruchi)..."
          className="w-full bg-transparent outline-none text-gray-800 text-sm font-medium"
        />

        {isSearching ? (
          <Loader2 size={18} className="text-orange-500 animate-spin" />
        ) : searchQuery ? (
          <X
            size={18}
            className="text-gray-400 cursor-pointer hover:text-gray-700 transition-colors"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
          />
        ) : null}
      </div>

      {/* Disambiguation Dropdown */}
      {searchResults.length > 0 && (
        <div className="mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-50">
          {searchResults.map((item) => (
            <div
              key={item._id}
              onClick={() => handleSelect(item)}
              className="p-3 hover:bg-orange-50 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-bold text-gray-800 text-sm">
                  {item.name}
                </div>
                <div className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-gray-400" />
                  {item.area}

                  {/* Render distance if MongoDB provided it via $geoNear */}
                  {item.distance && (
                    <>
                      <span className="mx-1 text-gray-300">•</span>
                      <Navigation size={10} className="text-blue-500" />
                      <span className="text-blue-600">
                        {formatDistance(item.distance)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Verification Badge */}
              {item.isVerified && (
                <div className="bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Verified
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* "No Results" State */}
      {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
        <div className="mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 text-center text-sm text-gray-500 font-medium">
          No pandals found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
