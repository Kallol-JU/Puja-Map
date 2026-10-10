import { Marker } from "react-map-gl/mapbox";
import useMapStore from "../../store/useMapStore";

export default function NavigationArrow() {
  const userLocation = useMapStore((state) => state.userLocation);
  const isNavigating = useMapStore((state) => state.isNavigating);

  // Only show the arrow when active navigation is happening
  if (!isNavigating || !userLocation) return null;

  // If the device doesn't supply a heading (like on a desktop PC), default to 0
  const rotation = userLocation.heading || 0;

  return (
    <Marker
      longitude={userLocation.lng}
      latitude={userLocation.lat}
      anchor="center"
      style={{ zIndex: 50 }} // Ensure it stays on top of the route line
    >
      <div
        className="transition-transform duration-700 ease-linear drop-shadow-2xl"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Perfect Google-style Navigation Arrow SVG */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 2L28 28L16 22L4 28L16 2Z"
            fill="#2563eb"
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Marker>
  );
}
