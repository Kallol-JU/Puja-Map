import { useEffect, useState } from "react";
import useMapStore from "../store/useMapStore";

const useGeolocation = () => {
  const setUserLocation = useMapStore((state) => state.setUserLocation);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          accuracy: position.coords.accuracy, // Useful for showing a larger/smaller blue dot radius
        });
        setError(null);
      },
      (err) => {
        console.error("GPS Error:", err.message);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  return { error };
};

export default useGeolocation;
