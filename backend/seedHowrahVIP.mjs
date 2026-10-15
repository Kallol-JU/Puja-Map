import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters for Howrah, Shibpur, Salkia, and Bally
const HOWRAH_VIP_PANDALS = [
  // --- SHIBPUR & CHATTERJEEHAT ---
  {
    name: "Olabibitala Sarbojanin",
    lat: 22.5785,
    lng: 88.318,
    area: "Shibpur",
  },
  { name: "Shibpur Sangrami", lat: 22.572, lng: 88.32, area: "Shibpur" },
  {
    name: "Shibpur Shastitala Barowari",
    lat: 22.575,
    lng: 88.323,
    area: "Shibpur",
  },
  {
    name: "Chatterjeehat Yubak Sangha",
    lat: 22.576,
    lng: 88.306,
    area: "Chatterjeehat",
  },

  // --- KADAMTALA, BANTRA & ICHAPUR ---
  {
    name: "Kadamtala Tarun Sangha",
    lat: 22.593,
    lng: 88.322,
    area: "Kadamtala",
  },
  {
    name: "Ichapur Sevadal",
    lat: 22.595,
    lng: 88.305,
    area: "Kadamtala / Ichapur",
  },
  { name: "Bantra Sammilani", lat: 22.589, lng: 88.324, area: "Bantra" },
  { name: "Bantra Rajbari", lat: 22.588, lng: 88.322, area: "Bantra" },

  // --- SALKIA ---
  { name: "Salkia Alapani", lat: 22.605, lng: 88.341, area: "Salkia" },
  {
    name: "Salkia Chhatra Byayam Samity",
    lat: 22.607,
    lng: 88.342,
    area: "Salkia",
  },
  { name: "Salkia Tarun Dal", lat: 22.603, lng: 88.3435, area: "Salkia" },

  // --- BALLY & BELUR ---
  { name: "Bally Kalyan Samity", lat: 22.648, lng: 88.342, area: "Bally" },
  { name: "Bally Shanti Sangha", lat: 22.65, lng: 88.344, area: "Bally" },
  { name: "Belur Shramik Pally", lat: 22.632, lng: 88.346, area: "Belur" },

  // --- RAMRAJATALA & SANTRAGACHI ---
  {
    name: "Ramrajatala Barowari",
    lat: 22.582,
    lng: 88.291,
    area: "Ramrajatala",
  },
  {
    name: "Santragachi Kedarnath Institution (Bhanumati)",
    lat: 22.5825,
    lng: 88.278,
    area: "Santragachi",
  },
  {
    name: "Nandibagan Sarbojanin",
    lat: 22.5865,
    lng: 88.298,
    area: "Ramrajatala / Santragachi",
  },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${HOWRAH_VIP_PANDALS.length} curated Howrah VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of HOWRAH_VIP_PANDALS) {
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
            name: p.name,
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
