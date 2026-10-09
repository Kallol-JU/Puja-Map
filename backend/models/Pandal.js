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
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] }, // [lng, lat]
    },

    area: { type: String, trim: true },
    address: { type: String, trim: true },
    district: { type: String, index: true },

    // Data Provenance & Trust System
    sources: [
      {
        type: String,
        enum: ["SAHAJ", "PujoMap", "KolkataKhoj", "PujorShohor", "Manual"],
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
pandalSchema.index({ navigationPoint: "2dsphere" });
pandalSchema.index({ name: "text", aliases: "text" });

export default mongoose.model("Pandal", pandalSchema);
