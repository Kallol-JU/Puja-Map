import { useState, useEffect } from "react";
import Map, {
  Marker,
  GeolocateControl,
  NavigationControl,
} from "react-map-gl/mapbox";
import axios from "axios";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [pandals, setPandals] = useState([]);
  const [viewState, setViewState] = useState({
    longitude: 88.3639, // Kolkata longitude
    latitude: 22.5726, // Kolkata latitude
    zoom: 12,
  });

  // Fetch nearby pandals when the map moves
  useEffect(() => {
    const fetchPandals = async () => {
      try {
        const res = await axios.get(`${API_URL}/pandals/nearby`, {
          params: {
            lng: viewState.longitude,
            lat: viewState.latitude,
            maxDistance: 10000, // 10km radius
          },
        });
        setPandals(res.data);
      } catch (error) {
        console.error("Error fetching pandals:", error);
      }
    };

    // Small delay to prevent too many API calls while dragging the map
    const timeoutId = setTimeout(() => fetchPandals(), 500);
    return () => clearTimeout(timeoutId);
  }, [viewState.longitude, viewState.latitude]);

  return (
    <div className="h-screen w-full relative">
      {/* Search Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white rounded-full shadow-lg p-3 flex items-center">
          <MapPin className="text-orange-500 mr-2" size={24} />
          <input
            type="text"
            placeholder="Search a Pandal (e.g. Sreebhumi)"
            className="w-full bg-transparent outline-none text-gray-800"
          />
        </div>
      </div>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        <GeolocateControl position="bottom-right" trackUserLocation={true} />
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Render Pandal Markers */}
        {pandals.map((pandal) => (
          <Marker
            key={pandal._id}
            longitude={pandal.location.coordinates[0]}
            latitude={pandal.location.coordinates[1]}
            anchor="bottom"
          >
            <div className="cursor-pointer transform hover:scale-110 transition-transform">
              <MapPin className="text-red-600 fill-red-200" size={32} />
              <div className="bg-white text-xs font-bold px-1 rounded shadow-md mt-1 text-center whitespace-nowrap">
                {pandal.name}
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
