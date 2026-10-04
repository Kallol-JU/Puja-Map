import { Marker } from "react-map-gl/mapbox";
import useMapStore from "../../store/useMapStore";

export default function UserMarker() {
  const userLocation = useMapStore((state) => state.userLocation);

  // If we don't have GPS coordinates yet, render nothing
  if (!userLocation) return null;

  return (
    <Marker
      longitude={userLocation.lng}
      latitude={userLocation.lat}
      anchor="center"
    >
      <div className="relative flex items-center justify-center">
        {/* The outer pulsing circle */}
        <div className="absolute w-8 h-8 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
        {/* The inner solid dot */}
        <div className="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
      </div>
    </Marker>
  );
}
