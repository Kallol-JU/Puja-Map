import { create } from "zustand";

const useMapStore = create((set) => ({
  // 1. User Location State
  userLocation: null, // { lng, lat, accuracy }
  setUserLocation: (location) => set({ userLocation: location }),

  // 2. Search & UI State
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),

  isSearching: false,
  setIsSearching: (status) => set({ isSearching: status }),

  // 3. Map & Navigation State
  selectedPandal: null,
  setSelectedPandal: (pandal) => set({ selectedPandal: pandal }),

  activeRoute: null, // GeoJSON for the blue navigation line
  setActiveRoute: (route) => set({ activeRoute: route }),

  // 4. Proximity State (Pandals currently loaded on map)
  nearbyPandals: [],
  setNearbyPandals: (pandals) => set({ nearbyPandals: pandals }),

  // Reset navigation when closing a pandal card
  clearNavigation: () =>
    set({
      selectedPandal: null,
      activeRoute: null,
      searchQuery: "",
      searchResults: [],
    }),
}));

export default useMapStore;
