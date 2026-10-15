import mongoose from "mongoose";

const pandalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Track colloquial names from different sources
    aliases: [{ type: String, trim: true }],

    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    navigationPoint: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] }, // [lng, lat]
    },

    area: { type: String, trim: true },
    address: { type: String, trim: true },
    district: { type: String, index: true },

    // 🚀 NEW: Required for the Google scraper to prevent duplicate imports
    googlePlaceId: { type: String, index: true, sparse: true },
    osmId: { type: String, index: true, sparse: true },

    sources: [
      {
        type: String,

        enum: [
          "SAHAJ",
          "PujoMap",
          "KolkataKhoj",
          "PujorShohor",
          "Manual",
          "GooglePlaces",
          "OpenStreetMap",
          "VIP-Seed",
        ],
      },
    ],

    confidenceLevel: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
    },

    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

pandalSchema.index({ location: "2dsphere" });
pandalSchema.index({ navigationPoint: "2dsphere" }, { sparse: true });
pandalSchema.index({ name: "text", aliases: "text" });

export default mongoose.model("Pandal", pandalSchema);
