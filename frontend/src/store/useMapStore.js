import { create } from "zustand";

const useMapStore = create((set) => ({
  // 0. Global Pandal Data
  pandals: [],
  setPandals: (pandals) => set({ pandals }),

  fetchPandals: async () => {
    try {
      const response = await fetch("http://localhost:5000/api/pandals");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      set({ pandals: Array.isArray(data) ? data : [] });
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

  // 5. Proximity State (Restored for useProximity hook)
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
