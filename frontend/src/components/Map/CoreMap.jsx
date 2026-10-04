import { useState, useRef } from "react";
import Map, { NavigationControl } from "react-map-gl/mapbox";
import useMapStore from "../../store/useMapStore";
import PandalMarker from "./PandalMarker";
import UserMarker from "./UserMarker";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function CoreMap() {
  const mapRef = useRef(null);

  const nearbyPandals = useMapStore((state) => state.nearbyPandals);

  const [viewState, setViewState] = useState({
    longitude: 88.3639,
    latitude: 22.5726,
    zoom: 12,
  });

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

      {nearbyPandals.map((pandal) => (
        <PandalMarker key={pandal._id} pandal={pandal} />
      ))}
      <UserMarker />
    </Map>
  );
}
