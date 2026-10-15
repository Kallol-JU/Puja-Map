import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters for Bidhannagar (Salt Lake) & New Town
const EAST_VIP_PANDALS = [
  // --- FROM THE SCREENSHOT ---
  {
    name: "EC Block Durga Puja",
    lat: 22.5898,
    lng: 88.4116,
    area: "Salt Lake",
  },
  {
    name: "AD Block Durga Puja",
    lat: 22.605,
    lng: 88.404,
    area: "Bangur / Salt Lake",
  },
  {
    name: "BD Block Durga Puja",
    lat: 22.5936,
    lng: 88.4111,
    area: "Salt Lake",
  },
  { name: "HA Block Durga Puja", lat: 22.576, lng: 88.4066, area: "Salt Lake" },
  {
    name: "IB Block Durga Puja",
    lat: 22.5714,
    lng: 88.4086,
    area: "Salt Lake",
  },

  // --- OTHER SALT LAKE MEGA PANDALS ---
  { name: "FD Block Sarbojanin", lat: 22.588, lng: 88.411, area: "Salt Lake" },
  {
    name: "BJ Block Sarbojanin",
    lat: 22.5925,
    lng: 88.4215,
    area: "Salt Lake",
  },
  { name: "AK Block Sarbojanin", lat: 22.59, lng: 88.42, area: "Salt Lake" },
  { name: "AE Block (Part 1)", lat: 22.597, lng: 88.413, area: "Salt Lake" },
  { name: "AG Block Sarbojanin", lat: 22.595, lng: 88.415, area: "Salt Lake" },
  { name: "CJ Block Sarbojanin", lat: 22.591, lng: 88.418, area: "Salt Lake" },
  { name: "Labony Estate", lat: 22.584, lng: 88.41, area: "Salt Lake" },
  {
    name: "Salt Lake Stadium Area (Yuva Bharati)",
    lat: 22.569,
    lng: 88.4,
    area: "Salt Lake",
  },

  // --- NEW TOWN & RAJARHAT ---
  { name: "New Town Sarbojanin", lat: 22.5855, lng: 88.468, area: "New Town" },
  { name: "Balaka Abasan", lat: 22.582, lng: 88.463, area: "New Town" },
  { name: "CE Block, New Town", lat: 22.58, lng: 88.47, area: "New Town" },
  {
    name: "Chinar Park (Mitali Sangha)",
    lat: 22.622,
    lng: 88.455,
    area: "New Town / Chinar Park",
  },
  {
    name: "AA I (Action Area 1) Durga Puja",
    lat: 22.5775,
    lng: 88.48,
    area: "New Town",
  },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${EAST_VIP_PANDALS.length} curated Bidhannagar & New Town VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of EAST_VIP_PANDALS) {
    const hit = await Pandal.findOne({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          $maxDistance: 75, // 75 meters catch radius for existing OpenStreetMap points
        },
      },
    }).lean();

    if (hit) {
      console.log(
        `  ~ Upgrading OSM Entry: ${p.name} (Matched with ${hit.name})`,
      );
      await Pandal.updateOne(
        { _id: hit._id },
        {
          $set: {
            name: p.name, // Gives it the polished block name
            confidenceLevel: "HIGH",
            isVerified: true,
            area: p.area,
          },
          $addToSet: { sources: "VIP-Seed" },
        },
      );
      upgraded++;
      continue;
    }

    await Pandal.create({
      name: p.name,
      location: { type: "Point", coordinates: [p.lng, p.lat] },
      area: p.area,
      sources: ["Manual", "VIP-Seed"],
      confidenceLevel: "HIGH",
      isVerified: true,
    });
    console.log(`  + Inserted New: ${p.name}`);
    inserted++;
  }

  console.log(`\n--- Done! Inserted: ${inserted} | Upgraded: ${upgraded} ---`);
}

main()
  .catch(console.error)
  .finally(() => mongoose.disconnect());
