import { useState, useRef, useEffect } from "react";
import Map, { NavigationControl, Source, Layer } from "react-map-gl/mapbox";
import useMapStore from "../../store/useMapStore";
import PandalMarker from "./PandalMarker";
import UserMarker from "./UserMarker";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// The visual style for the blue route line
const routeLayerStyle = {
  id: "route-line",
  type: "line",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#3b82f6", // Bright Tailwind Blue
    "line-width": 6,
    "line-opacity": 0.8,
  },
};

export default function CoreMap() {
  const mapRef = useRef(null);
  const nearbyPandals = useMapStore((state) => state.nearbyPandals);
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const activeRoute = useMapStore((state) => state.activeRoute); // <-- Read the route from state

  const [viewState, setViewState] = useState({
    longitude: 88.3889847,
    latitude: 22.5651179,
    zoom: 12,
  });

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

  // Adjust map bounds to show the entire route once it's calculated
  useEffect(() => {
    if (activeRoute && mapRef.current) {
      const coordinates = activeRoute.geometry.coordinates;
      // Get the bounding box of the route
      const bounds = coordinates.reduce(
        (bounds, coord) => {
          return [
            [
              Math.min(bounds[0][0], coord[0]),
              Math.min(bounds[0][1], coord[1]),
            ],
            [
              Math.max(bounds[1][0], coord[0]),
              Math.max(bounds[1][1], coord[1]),
            ],
          ];
        },
        [
          [coordinates[0][0], coordinates[0][1]],
          [coordinates[0][0], coordinates[0][1]],
        ],
      );

      mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
    }
  }, [activeRoute]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* Render the Navigation Line if it exists */}
      {activeRoute && (
        <Source id="route-source" type="geojson" data={activeRoute}>
          <Layer {...routeLayerStyle} />
        </Source>
      )}

      {nearbyPandals.map((pandal) => (
        <PandalMarker key={pandal._id} pandal={pandal} />
      ))}

      <UserMarker />
    </Map>
  );
}
