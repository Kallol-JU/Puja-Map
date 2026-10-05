import { useEffect } from "react";
import CoreMap from "../components/Map/CoreMap";
import SearchBar from "../components/Search/SearchBar";
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import useMapStore from "../store/useMapStore";
import useGeolocation from "../hooks/useGeolocation";
import ProximityAlert from "../components/Pandal/ProximityAlert";
import useProximity from "../hooks/useProximity";

export default function MapPage() {
  useGeolocation();
  useProximity();
  const setNearbyPandals = useMapStore((state) => state.setNearbyPandals);

  useEffect(() => {
    const mockPandals = [
      {
        _id: "1",
        name: "Sreebhumi Sporting Club",
        location: { coordinates: [88.3995, 22.5979] },
        area: "Lake Town",
      },
      {
        _id: "2",
        name: "College Square",
        location: { coordinates: [88.3889847, 22.5651179] },
        area: "College Street",
      },
    ];
    setNearbyPandals(mockPandals);
  }, [setNearbyPandals]);

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden">
      <SearchBar />
      <ProximityAlert />
      <CoreMap />

      <PandalBottomSheet />
    </div>
  );
}
