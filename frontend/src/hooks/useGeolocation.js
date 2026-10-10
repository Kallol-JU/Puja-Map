import { useEffect } from "react";
import useMapStore from "../store/useMapStore";

export default function useGeolocation() {
  const setUserLocation = useMapStore((state) => state.setUserLocation);
  const setGpsStatus = useMapStore((state) => state.setGpsStatus);
  const setGpsError = useMapStore((state) => state.setGpsError);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    setGpsStatus("acquiring");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed, //meters/second
        });
        setGpsStatus("active");
        setGpsError(null);
      },
      (err) => {
        console.error("GPS Error:", err);
        if (err.code === 1) {
          setGpsStatus("denied");
          setGpsError(
            "Location access denied. Please enable it in browser settings.",
          );
        } else {
          setGpsStatus("error");
          setGpsError(err.message);
        }
      },
      {
        enableHighAccuracy: true, // Forces device hardware GPS instead of IP location
        maximumAge: 10000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation, setGpsStatus, setGpsError]);
}
