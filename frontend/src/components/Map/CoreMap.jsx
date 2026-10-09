import { useState, useRef, useEffect, useMemo } from "react";
import Map, { NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import axios from "axios";
import useMapStore from "../../store/useMapStore";
import UserMarker from "./UserMarker";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// --- 1. Mapbox Layer Styles (Google Maps Vibe) ---

// The blue navigation route
const routeLayerStyle = {
  id: "route-line",
  type: "line",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.8 },
};

// Clustered circles (zoomed out)
const clusterLayer = {
  id: "clusters",
  type: "circle",
  source: "pandals",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#f28b82",
      10,
      "#ea4335",
      50,
      "#c5221f",
    ],
    "circle-radius": ["step", ["get", "point_count"], 15, 10, 18, 50, 22],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
  },
};

// The number inside the cluster
const clusterCountLayer = {
  id: "cluster-count",
  type: "symbol",
  source: "pandals",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
  },
  paint: { "text-color": "#ffffff" },
};

// Clean minimal dots for individual pandals
const unclusteredPointLayer = {
  id: "unclustered-point",
  type: "circle",
  source: "pandals",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#ea4335", // Google Maps Red
    "circle-radius": 6,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
  },
};

// Smart text labels (Collision detection prevents overlapping!)
const unclusteredLabelLayer = {
  id: "unclustered-label",
  type: "symbol",
  source: "pandals",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "text-field": ["get", "name"],
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-size": 11,
    "text-offset": [0, 1.2],
    "text-anchor": "top",
    "text-allow-overlap": false, // This is the magic that stops the clutter
  },
  paint: {
    "text-color": "#3c4043",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
};

export default function CoreMap() {
  const mapRef = useRef(null);

  const nearbyPandals = useMapStore((state) => state.nearbyPandals);
  const setNearbyPandals = useMapStore((state) => state.setNearbyPandals);
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);
  const activeRoute = useMapStore((state) => state.activeRoute);

  const [viewState, setViewState] = useState({
    longitude: 88.3639,
    latitude: 22.5726,
    zoom: 12,
  });

  // --- 2. Convert raw MongoDB data into Mapbox GeoJSON ---
  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: nearbyPandals.map((pandal) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: pandal.location.coordinates,
        },
        properties: {
          id: pandal._id,
          name: pandal.name,
        },
      })),
    };
  }, [nearbyPandals]);

  // --- 3. Handle Interactions (Clicks & Data Fetching) ---

  useEffect(() => {
    const fetchPandals = async () => {
      try {
        const res = await axios.get(`${API_URL}/pandals/nearby`, {
          params: {
            lng: viewState.longitude,
            lat: viewState.latitude,
            radius: 8000,
          },
        });
        setNearbyPandals(res.data);
      } catch (error) {
        console.error("Failed to fetch nearby pandals:", error);
      }
    };
    const timer = setTimeout(fetchPandals, 400);
    return () => clearTimeout(timer);
  }, [viewState.longitude, viewState.latitude, setNearbyPandals]);

  useEffect(() => {
    if (selectedPandal && mapRef.current && !activeRoute) {
      mapRef.current.flyTo({
        center: [
          selectedPandal.location.coordinates[0],
          selectedPandal.location.coordinates[1],
        ],
        zoom: 15.5,
        duration: 1500,
      });
    }
  }, [selectedPandal, activeRoute]);

  useEffect(() => {
    if (activeRoute && mapRef.current) {
      const coordinates = activeRoute.geometry.coordinates;
      const bounds = coordinates.reduce(
        (bounds, coord) => [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])],
        ],
        [
          [coordinates[0][0], coordinates[0][1]],
          [coordinates[0][0], coordinates[0][1]],
        ],
      );
      mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
    }
  }, [activeRoute]);

  // Handle clicking on Native Mapbox Layers
  const onMapClick = (event) => {
    const feature = event.features[0];
    if (!feature) return;

    // If they clicked a pandal dot or text
    if (
      feature.layer.id === "unclustered-point" ||
      feature.layer.id === "unclustered-label"
    ) {
      const pandalId = feature.properties.id;
      const clicked = nearbyPandals.find((p) => p._id === pandalId);
      if (clicked) setSelectedPandal(clicked);
    }

    // If they clicked a cluster, zoom in to expand it
    if (feature.layer.id === "clusters") {
      const clusterId = feature.properties.cluster_id;
      const mapboxSource = mapRef.current.getSource("pandals");

      mapboxSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        mapRef.current.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom + 1,
          duration: 500,
        });
      });
    }
  };

  // Change cursor to pointer when hovering over clickable things
  const onMouseEnter = () =>
    (mapRef.current.getCanvas().style.cursor = "pointer");
  const onMouseLeave = () => (mapRef.current.getCanvas().style.cursor = "");

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={[
        "clusters",
        "unclustered-point",
        "unclustered-label",
      ]}
      onClick={onMapClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {activeRoute && (
        <Source id="route-source" type="geojson" data={activeRoute}>
          <Layer {...routeLayerStyle} />
        </Source>
      )}

      {/* The new WebGL Data Layer replaces PandalMarker.jsx */}
      <Source
        id="pandals"
        type="geojson"
        data={geoJsonData}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredPointLayer} />
        <Layer {...unclusteredLabelLayer} />
      </Source>

      <UserMarker />
    </Map>
  );
}
