import mongoose from "mongoose";

const pandalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    aliases: [{ type: String, trim: true }],

    // Display location (the idol/center of the pandal)
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // MUST BE: [longitude, latitude]
    },

    // The actual entrance/drop-off point for walking/driving navigation
    navigationPoint: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // MUST BE: [longitude, latitude]
    },

    area: { type: String, required: true, trim: true },
    district: { type: String, default: "Kolkata" },

    // Verification System to build trust
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Create geospatial indexes for location-based queries
pandalSchema.index({ location: "2dsphere" });
pandalSchema.index({ navigationPoint: "2dsphere" });
// Text index for fast searching by name
pandalSchema.index({ name: "text", aliases: "text" });

export default mongoose.model("Pandal", pandalSchema);
