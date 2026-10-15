import { create } from "zustand";

// Dynamically retrieve backend API URL from Vite environment variables
const API_URL = (
  import.meta.env.VITE_API_URL || "https://puja-map.onrender.com/api"
).replace(/\/$/, "");

const CACHE_KEY = "pujomap_pandals_cache";

// 🚀 Instant Cache Reader: Loads saved pandals synchronously on app boot
const getCachedPandals = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (err) {
    console.warn("Failed to read pandals from cache:", err);
    return [];
  }
};

const useMapStore = create((set) => ({
  // 0. Global Pandal Data (Defaults to local cache for 0-second load)
  pandals: getCachedPandals(),
  setPandals: (pandals) => set({ pandals }),

  fetchPandals: async () => {
    try {
      const response = await fetch(`${API_URL}/pandals`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        set({ pandals: data });
        // Update local cache asynchronously for future 0-second boots
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to write pandals to cache:", e);
        }
      }
    } catch (error) {
      console.error("Error fetching pandals into store:", error);
    }
  },

  // 1. User Location State
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),

  gpsStatus: "idle",
  setGpsStatus: (status) => set({ gpsStatus: status }),

  gpsError: null,
  setGpsError: (error) => set({ gpsError: error }),

  // 2. Google Maps Direction & Route Search State
  isRouteMode: false,
  setIsRouteMode: (status) => set({ isRouteMode: status }),

  originPandal: null, // null defaults to "Your Location"
  setOriginPandal: (pandal) => set({ originPandal: pandal }),

  destinationPandal: null,
  setDestinationPandal: (pandal) => set({ destinationPandal: pandal }),

  swapOriginAndDestination: () =>
    set((state) => ({
      originPandal: state.destinationPandal,
      destinationPandal: state.originPandal,
    })),

  // 3. Search & UI State
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  isSearching: false,
  setIsSearching: (status) => set({ isSearching: status }),

  selectedPandal: null,
  setSelectedPandal: (pandal) => set({ selectedPandal: pandal }),

  // 4. Map & Navigation State
  activeRoute: null,
  setActiveRoute: (route) => set({ activeRoute: route }),

  routeStats: null,
  setRouteStats: (stats) => set({ routeStats: stats }),

  isNavigating: false,
  setIsNavigating: (status) => set({ isNavigating: status }),

  // 5. Proximity State
  nearbyPandals: [],
  setNearbyPandals: (pandals) => set({ nearbyPandals: pandals }),

  activeProximityPandal: null,
  setActiveProximityPandal: (pandal) => set({ activeProximityPandal: pandal }),

  routeGeometry: null,
  setRouteGeometry: (geometry) => set({ routeGeometry: geometry }),

  // 6. Reset navigation & route state
  clearNavigation: () =>
    set({
      selectedPandal: null,
      originPandal: null,
      destinationPandal: null,
      isRouteMode: false,
      activeRoute: null,
      routeStats: null,
      searchQuery: "",
      searchResults: [],
      isNavigating: false,
      activeProximityPandal: null,
    }),
}));

export default useMapStore;
