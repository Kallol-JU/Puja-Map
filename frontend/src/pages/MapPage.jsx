import { useEffect } from "react";
import CoreMap from "../components/Map/CoreMap";
import SearchBar from "../components/Search/SearchBar"; // <-- Import this
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import useMapStore from "../store/useMapStore";
import useGeolocation from "../hooks/useGeolocation";

export default function MapPage() {
  useGeolocation();
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
        location: { coordinates: [88.3636, 22.576] },
        area: "College Street",
      },
    ];
    setNearbyPandals(mockPandals);
  }, [setNearbyPandals]);

  return (
    <div className="h-screen w-full relative bg-gray-50 overflow-hidden">
      <SearchBar />

      <CoreMap />

      <PandalBottomSheet />
    </div>
  );
}
