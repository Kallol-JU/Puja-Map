import { useEffect } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
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

  // Debounced API Call
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await axios.get(`${API_URL}/pandals/search`, {
          params: { q: searchQuery },
        });
        setSearchResults(res.data);
      } catch (error) {
        console.error("Search error:", error);

        // MOCK FALLBACK: Just in case your backend isn't running while testing the UI
        const mockDb = [
          {
            _id: "1",
            name: "Sreebhumi Sporting Club",
            area: "Lake Town",
            location: { coordinates: [88.3995, 22.5979] },
          },
          {
            _id: "2",
            name: "College Square",
            area: "College Street",
            location: { coordinates: [88.3636, 22.576] },
          },
        ];
        setSearchResults(
          mockDb.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        );
      } finally {
        setIsSearching(false);
      }
    };

    // Wait 300ms after the user stops typing before calling the API
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setSearchResults, setIsSearching]);

  const handleSelect = (pandal) => {
    setSelectedPandal(pandal);
    setSearchQuery(""); // Clear the input
    setSearchResults([]); // Hide the dropdown
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex items-center">
        <Search className="text-gray-400 mr-2 ml-1" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pandal (e.g. Sreebhumi)..."
          className="w-full bg-transparent outline-none text-gray-800 text-sm font-medium"
        />

        {isSearching ? (
          <Loader2 size={18} className="text-orange-500 animate-spin" />
        ) : searchQuery ? (
          <X
            size={18}
            className="text-gray-400 cursor-pointer hover:text-gray-600"
            onClick={() => setSearchQuery("")}
          />
        ) : null}
      </div>

      {/* Disambiguation Dropdown */}
      {searchResults.length > 0 && (
        <div className="mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
          {searchResults.map((item) => (
            <div
              key={item._id}
              onClick={() => handleSelect(item)}
              className="p-3 border-b border-gray-50 hover:bg-orange-50 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-semibold text-gray-800 text-sm">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  {item.area}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
