import express from "express";
import Pandal from "../models/Pandal.js";

const router = express.Router();

// @route   POST /api/pandals
// @desc    Add a new pandal (Admin use)
router.post("/", async (req, res) => {
  try {
    const pandal = new Pandal(req.body);
    const savedPandal = await pandal.save();
    res.status(201).json(savedPandal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @route   GET /api/pandals/nearby
// @desc    Get pandals near a user's location (Mobile App use)
// @query   ?lng=88.xxxx&lat=22.xxxx&maxDistance=5000 (distance in meters)
router.get("/nearby", async (req, res) => {
  try {
    const { lng, lat, maxDistance = 5000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: "Please provide lng and lat" });
    }

    const pandals = await Pandal.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(maxDistance), // in meters
        },
      },
    }).limit(50); // Don't overload the mobile device

    res.json(pandals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
