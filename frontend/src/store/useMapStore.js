import { create } from "zustand";
import { get, set } from "idb-keyval";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://puja-map.onrender.com/api"
).replace(/\/$/, "");

const CACHE_KEY = "pujomap_pandals_cache";

try {
  localStorage.removeItem(CACHE_KEY);
} catch (e) {
  // Ignore
}

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

const useMapStore = create((storeSet) => {
  get(CACHE_KEY)
    .then((cached) => {
      if (Array.isArray(cached) && cached.length > 0) {
        storeSet({ pandals: cached });
      }
    })
    .catch((err) => console.warn("IndexedDB read error:", err));

  return {
    pandals: [],
    setPandals: (pandals) => storeSet({ pandals }),

    fetchPandals: async () => {
      try {
        const response = await fetch(`${API_URL}/pandals`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          storeSet({ pandals: data });

          try {
            const lightweightData = minimizeForCache(data);
            await set(CACHE_KEY, lightweightData);
          } catch (e) {
            console.warn("Could not save to IndexedDB cache:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching pandals into store:", error);
      }
    },

    userLocation: null,
    setUserLocation: (location) => storeSet({ userLocation: location }),

    gpsStatus: "idle",
    setGpsStatus: (status) => storeSet({ gpsStatus: status }),

    gpsError: null,
    setGpsError: (error) => storeSet({ gpsError: error }),

    isRouteMode: false,
    setIsRouteMode: (status) => storeSet({ isRouteMode: status }),

    originPandal: null,
    setOriginPandal: (pandal) => storeSet({ originPandal: pandal }),

    destinationPandal: null,
    setDestinationPandal: (pandal) => storeSet({ destinationPandal: pandal }),

    swapOriginAndDestination: () =>
      storeSet((state) => ({
        originPandal: state.destinationPandal,
        destinationPandal: state.originPandal,
      })),

    searchQuery: "",
    setSearchQuery: (query) => storeSet({ searchQuery: query }),

    searchResults: [],
    setSearchResults: (results) => storeSet({ searchResults: results }),

    isSearching: false,
    setIsSearching: (status) => storeSet({ isSearching: status }),

    selectedPandal: null,
    setSelectedPandal: (pandal) => storeSet({ selectedPandal: pandal }),

    activeRoute: null,
    setActiveRoute: (route) => storeSet({ activeRoute: route }),

    routeStats: null,
    setRouteStats: (stats) => storeSet({ routeStats: stats }),

    isNavigating: false,
    setIsNavigating: (status) => storeSet({ isNavigating: status }),

    nearbyPandals: [],
    setNearbyPandals: (pandals) => storeSet({ nearbyPandals: pandals }),

    activeProximityPandal: null,
    setActiveProximityPandal: (pandal) =>
      storeSet({ activeProximityPandal: pandal }),

    routeGeometry: null,
    setRouteGeometry: (geometry) => storeSet({ routeGeometry: geometry }),

    clearNavigation: () =>
      storeSet({
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
  };
});

export default useMapStore;
