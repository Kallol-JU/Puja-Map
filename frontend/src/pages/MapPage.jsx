import { useState, useRef, useEffect } from "react"; // Added useEffect here
import CoreMap from "../components/Map/CoreMap";
import SearchBar from "../components/Search/SearchBar";
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import ProximityAlert from "../components/Pandal/ProximityAlert";
import ActiveNavPanel from "../components/Navigation/ActiveNavPanel";
import MapControls from "../components/Map/MapControls";
import AddPandalModal from "../components/Pandal/AddPandalModal";

import useGeolocation from "../hooks/useGeolocation";
import useProximity from "../hooks/useProximity";
import { useNavigation } from "../hooks/useNavigation";
import useMapStore from "../store/useMapStore";

export default function MapPage() {
  // ALL hooks must go inside this bracket!
  useGeolocation();
  useProximity();

  // Grab the data from Claude's upgraded hook
  const { updatePosition, upcomingStep, distanceToManeuver } = useNavigation();

  // Your standard state hooks
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isNavigating = useMapStore((state) => state.isNavigating);
  const userLocation = useMapStore((state) => state.userLocation);
  const mapRef = useRef(null);

  const handleRecenter = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16,
        duration: 1200,
      });
    } else {
      alert("Locating you... Please ensure GPS permissions are granted.");
    }
  };

  // Feed live GPS coordinates to the turn-by-turn math
  useEffect(() => {
    if (isNavigating && userLocation && updatePosition) {
      updatePosition([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, isNavigating, updatePosition]);

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden select-none">
      {/* Passed Claude's step data directly to the UI panel */}
      {isNavigating ? (
        <ActiveNavPanel step={upcomingStep} distance={distanceToManeuver} />
      ) : (
        <SearchBar />
      )}

      <ProximityAlert />

      <CoreMap mapRef={mapRef} />

      <MapControls
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRecenter={handleRecenter}
      />

      <PandalBottomSheet />

      <AddPandalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
