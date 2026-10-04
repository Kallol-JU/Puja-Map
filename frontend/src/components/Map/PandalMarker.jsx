import { Marker } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import useMapStore from "../../store/useMapStore";

export default function PandalMarker({ pandal }) {
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);

  // MongoDB and Mapbox use [longitude, latitude]
  const [lng, lat] = pandal.location.coordinates;

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation(); // Prevents the map itself from registering a click
        setSelectedPandal(pandal);
      }}
    >
      <div className="cursor-pointer transform hover:scale-110 transition-transform flex flex-col items-center">
        <MapPin
          className="text-red-600 fill-red-100 drop-shadow-md"
          size={32}
        />
        <div className="bg-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow text-gray-800 whitespace-nowrap border border-gray-200 mt-1">
          {pandal.name}
        </div>
      </div>
    </Marker>
  );
}
