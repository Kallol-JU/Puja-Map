import { create } from "zustand";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://puja-map.onrender.com/api"
).replace(/\/$/, "");

const CACHE_KEY = "pujomap_pandals_cache";

// 🚀 Strips non-essential properties so payload fits easily in localStorage (<500KB)
const minimizeForCache = (pandals) => {
  if (!Array.isArray(pandals)) return [];
  return pandals.map((p) => ({
    _id: p._id,
    name: p.name,
    area: p.area,
    confidenceLevel: p.confidenceLevel,
    location: p.location,
    navigationPoint: p.navigationPoint,
  }));
};

const getCachedPandals = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (err) {
    return [];
  }
};

const useMapStore = create((set) => ({
  pandals: getCachedPandals(),
  setPandals: (pandals) => set({ pandals }),

  fetchPandals: async () => {
    try {
      const response = await fetch(`${API_URL}/pandals`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        set({ pandals: data });
        // Strip heavy fields before writing to localStorage
        try {
          const lightweightData = minimizeForCache(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(lightweightData));
        } catch (e) {
          console.warn("Could not save to localStorage cache:", e);
        }
      }
    } catch (error) {
      console.error("Error fetching pandals into store:", error);
    }
  },

  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),

  gpsStatus: "idle",
  setGpsStatus: (status) => set({ gpsStatus: status }),

  gpsError: null,
  setGpsError: (error) => set({ gpsError: error }),

  isRouteMode: false,
  setIsRouteMode: (status) => set({ isRouteMode: status }),

  originPandal: null,
  setOriginPandal: (pandal) => set({ originPandal: pandal }),

  destinationPandal: null,
  setDestinationPandal: (pandal) => set({ destinationPandal: pandal }),

  swapOriginAndDestination: () =>
    set((state) => ({
      originPandal: state.destinationPandal,
      destinationPandal: state.originPandal,
    })),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  isSearching: false,
  setIsSearching: (status) => set({ isSearching: status }),

  selectedPandal: null,
  setSelectedPandal: (pandal) => set({ selectedPandal: pandal }),

  activeRoute: null,
  setActiveRoute: (route) => set({ activeRoute: route }),

  routeStats: null,
  setRouteStats: (stats) => set({ routeStats: stats }),

  isNavigating: false,
  setIsNavigating: (status) => set({ isNavigating: status }),

  nearbyPandals: [],
  setNearbyPandals: (pandals) => set({ nearbyPandals: pandals }),

  activeProximityPandal: null,
  setActiveProximityPandal: (pandal) => set({ activeProximityPandal: pandal }),

  routeGeometry: null,
  setRouteGeometry: (geometry) => set({ routeGeometry: geometry }),

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
