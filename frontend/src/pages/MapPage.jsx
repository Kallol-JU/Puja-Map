import { useState, useRef, useEffect } from "react";
import CoreMap from "../components/Map/CoreMap";
import SearchBar from "../components/Search/SearchBar";
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import ProximityAlert from "../components/Pandal/ProximityAlert";
import ActiveNavPanel from "../components/Navigation/ActiveNavPanel";
import MapControls from "../components/Map/MapControls";
import AddPandalModal from "../components/Pandal/AddPandalModal";
import InstallPrompt from "../components/UI/InstallPrompt";

import useGeolocation from "../hooks/useGeolocation";
import useProximity from "../hooks/useProximity";
import { useNavigation } from "../hooks/useNavigation";
import useMapStore from "../store/useMapStore";

export default function MapPage() {
  useGeolocation();
  useProximity();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const pandals = useMapStore((state) => state.pandals);
  const fetchPandals = useMapStore((state) => state.fetchPandals);
  const setSelectedPandal = useMapStore((state) => state.setSelectedPandal);
  const selectedPandal = useMapStore((state) => state.selectedPandal);
  const destinationPandal = useMapStore((state) => state.destinationPandal);
  const activeRoute = useMapStore((state) => state.activeRoute);
  const routeGeometry = useMapStore((state) => state.routeGeometry);
  const isNavigating = useMapStore((state) => state.isNavigating);
  const userLocation = useMapStore((state) => state.userLocation);

  const { step, distanceToManeuver, isRerouting, snappedPosition } =
    useNavigation();

  const destination = destinationPandal ?? selectedPandal;
  const mapRef = useRef(null);

  useEffect(() => {
    fetchPandals();
  }, [fetchPandals]);

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

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden select-none">
      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <CoreMap
          mapRef={mapRef}
          pandals={pandals}
          isNavigating={isNavigating}
          activeRoute={activeRoute}
          routeGeometry={routeGeometry}
          selectedPandal={selectedPandal}
          destinationPandal={destination}
          userLocation={userLocation}
          snappedPosition={snappedPosition}
          onPandalSelect={(pandal) => setSelectedPandal(pandal)}
        />
      </div>

      {/* TOP BAR */}
      {isNavigating ? (
        <div className="pointer-events-none absolute top-3 left-0 right-0 z-20 flex justify-center px-4 pt-[env(safe-area-inset-top)]">
          <div className="pointer-events-auto w-full max-w-md">
            <ActiveNavPanel
              step={step}
              distance={distanceToManeuver}
              destinationPandal={destination}
              isRerouting={isRerouting}
            />
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-0 top-4 z-10 w-full px-4">
          <div className="pointer-events-auto mx-auto max-w-md rounded-full bg-white shadow-lg">
            <SearchBar />
          </div>
        </div>
      )}

      <ProximityAlert />

      {/* FLOATING CONTROLS */}
      <div className="pointer-events-none absolute bottom-8 right-4 z-10 flex flex-col gap-4">
        <div className="pointer-events-auto">
          <MapControls
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRecenter={handleRecenter}
          />
        </div>
      </div>

      {/* PANDAL BOTTOM SHEET */}
      <PandalBottomSheet />

      <AddPandalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <InstallPrompt />
    </div>
  );
}
