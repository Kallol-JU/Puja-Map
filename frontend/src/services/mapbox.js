import axios from "axios";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const getDirections = async (startLng, startLat, endLng, endLat) => {
  try {
    // Using driving profile to safely route across bridges/highways
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    const response = await axios.get(url);

    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
};
