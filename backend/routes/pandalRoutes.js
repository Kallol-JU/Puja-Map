import express from "express";
import Pandal from "../models/Pandal.js";
import axios from "axios";
const router = express.Router();

// @route   GET /api/pandals/nearby
// @desc    Get pandals within the current map viewport (Spatial Query)
router.get("/nearby", async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;

    if (!lng || !lat) {
      return res
        .status(400)
        .json({ message: "Longitude and latitude are required" });
    }

    const pandals = await Pandal.find({
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius), // meters
        },
      },
    }).limit(100);

    res.json(pandals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/pandals/search
// @desc    Search pandals by name, sorted by distance to user
router.get("/search", async (req, res) => {
  try {
    const { q, lng, lat } = req.query;
    if (!q || q.trim() === "") return res.json([]);

    let query = {
      isVerified: true,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { aliases: { $regex: q, $options: "i" } },
        { area: { $regex: q, $options: "i" } },
      ],
    };

    // If user GPS is provided, sort search results by proximity
    if (lng && lat) {
      const pandals = await Pandal.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: "distance",
            key: "location",
            spherical: true,
            query: query,
          },
        },
        { $limit: 10 },
      ]);
      return res.json(pandals);
    }

    // Fallback if user denied GPS permission
    const pandals = await Pandal.find(query).limit(10);
    res.json(pandals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/pandals/:id
// @desc    Get detailed info for a single pandal
router.get("/:id", async (req, res) => {
  try {
    const pandal = await Pandal.findById(req.params.id);
    if (!pandal) return res.status(404).json({ message: "Pandal not found" });
    res.json(pandal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/admin/pending", async (req, res) => {
  try {
    const pending = await Pandal.find({ isVerified: false }).sort({
      createdAt: -1,
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/admin/approve/:id", async (req, res) => {
  try {
    const pandal = await Pandal.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true },
    );
    res.json(pandal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/admin/delete/:id", async (req, res) => {
  try {
    await Pandal.findByIdAndDelete(req.params.id);
    res.json({ message: "Spam pandal deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name || !lat || !lng) {
      return res
        .status(400)
        .json({ message: "Name, latitude, and longitude are required." });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    let verifiedName = name.trim();
    let area = "West Bengal";
    let address = "";
    let isGoogleVerified = false;
    if (apiKey) {
      try {
        // Search Google Places near the user's GPS coordinates
        const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${parsedLat},${parsedLng}&radius=150&keyword=${encodeURIComponent(name)}&key=${apiKey}`;
        const googleRes = await axios.get(googleUrl);

        if (googleRes.data.results && googleRes.data.results.length > 0) {
          const match = googleRes.data.results[0];
          verifiedName = match.name; // Uses official Google title
          address = match.vicinity || "";
          isGoogleVerified = true;
        } else {
          // Fallback: Reverse geocode the coordinates for area/address
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${parsedLat},${parsedLng}&key=${apiKey}`;
          const geoRes = await axios.get(geocodeUrl);
          if (geoRes.data.results && geoRes.data.results.length > 0) {
            address = geoRes.data.results[0].formatted_address;
            const compound = geoRes.data.results[0].address_components;
            const sublocality = compound.find(
              (c) =>
                c.types.includes("sublocality") || c.types.includes("locality"),
            );
            if (sublocality) area = sublocality.long_name;
          }
        }
      } catch (err) {
        console.warn("Google API verification skipped/failed:", err.message);
      }
    }

    // 2. Save the Pandal in MongoDB
    const newPandal = new Pandal({
      name: verifiedName,
      aliases: [name.trim()],
      location: {
        type: "Point",
        coordinates: [parsedLng, parsedLat],
      },
      navigationPoint: {
        type: "Point",
        coordinates: [parsedLng, parsedLat],
      },
      area: area,
      address: address,
      district: area,
      sources: ["Manual"],
      confidenceLevel: isGoogleVerified ? "HIGH" : "MEDIUM",
      isVerified: false,
    });

    await newPandal.save();
    res
      .status(201)
      .json({ message: "Pandal added successfully!", pandal: newPandal });
  } catch (error) {
    console.error("Error adding pandal:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
