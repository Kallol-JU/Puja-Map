import { useEffect } from "react";
import CoreMap from "../components/Map/CoreMap";
import PandalBottomSheet from "../components/Pandal/PandalBottomSheet";
import useMapStore from "../store/useMapStore";
import useGeolocation from "../hooks/useGeolocation";

export default function MapPage() {
  // 1. Start tracking user GPS in the background
  useGeolocation();

  const setNearbyPandals = useMapStore((state) => state.setNearbyPandals);

  // 2. Load mock data into Zustand store on mount
  useEffect(() => {
    const mockPandals = [
      {
        _id: "1",
        name: "Sreebhumi Sporting Club",
        location: { coordinates: [88.3995, 22.5979] },
      },
      {
        _id: "2",
        name: "College Square",
        location: { coordinates: [88.3636, 22.576] },
      },
    ];
    setNearbyPandals(mockPandals);
  }, [setNearbyPandals]);

  return (
    <div className="h-screen w-full relative bg-gray-50">
      <CoreMap />
      <PandalBottomSheet />
    </div>
  );
}
