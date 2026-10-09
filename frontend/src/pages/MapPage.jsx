import CoreMap from "../components/Map/CoreMap";
import SearchBar from "../components/Search/SearchBar";
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import ProximityAlert from "../components/Pandal/ProximityAlert";
import ActiveNavPanel from "../components/Navigation/ActiveNavPanel"; // <-- Import

import useGeolocation from "../hooks/useGeolocation";
import useProximity from "../hooks/useProximity";
import useNavigation from "../hooks/useNavigation"; // <-- Import Hook
import useMapStore from "../store/useMapStore";

export default function MapPage() {
  useGeolocation();
  useProximity();
  useNavigation(); // <-- Start the re-routing engine

  const isNavigating = useMapStore((state) => state.isNavigating);

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden">
      {/* If navigating, show Nav Panel. Otherwise, show Search */}
      {isNavigating ? <ActiveNavPanel /> : <SearchBar />}

      <ProximityAlert />
      <CoreMap />
      <PandalBottomSheet />
    </div>
  );
}
