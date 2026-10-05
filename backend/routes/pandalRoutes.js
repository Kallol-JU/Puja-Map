import express from "express";
import Pandal from "../models/Pandal.js";

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

export default router;
