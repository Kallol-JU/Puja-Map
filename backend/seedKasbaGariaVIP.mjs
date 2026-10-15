import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters for Kasba, Jadavpur, Santoshpur, and Garia
const KASBA_GARIA_VIP_PANDALS = [
  // --- KASBA & HALTU ---
  { name: "Rajdanga Naba Uday Sangha", lat: 22.51, lng: 88.391, area: "Kasba" },
  { name: "Bosepukur Sitala Mandir", lat: 22.5152, lng: 88.384, area: "Kasba" },
  { name: "Bosepukur Talbagan", lat: 22.514, lng: 88.3855, area: "Kasba" },
  { name: "Kasba Shakti Sangha", lat: 22.5135, lng: 88.393, area: "Kasba" },
  {
    name: "Haltu Nabin Sangha",
    lat: 22.508,
    lng: 88.382,
    area: "Haltu / Kasba",
  },

  // --- JADAVPUR, DHAKURIA & SELIMPUR ---
  {
    name: "Selimpur Pally",
    lat: 22.505,
    lng: 88.371,
    area: "Selimpur / Dhakuria",
  },
  { name: "Jadavpur 95 Pally", lat: 22.495, lng: 88.372, area: "Jadavpur" },
  {
    name: "Babubagan Sarbojanin",
    lat: 22.5035,
    lng: 88.3635,
    area: "Dhakuria",
  }, // Upgrading just in case
  { name: "Jodhpur Park", lat: 22.5065, lng: 88.3615, area: "Jodhpur Park" },

  // --- SANTOSHPUR ---
  {
    name: "Santoshpur Lake Pally",
    lat: 22.497,
    lng: 88.381,
    area: "Santoshpur",
  },
  {
    name: "Santoshpur Trikon Park",
    lat: 22.4965,
    lng: 88.385,
    area: "Santoshpur",
  },
  {
    name: "Santoshpur Avenue South",
    lat: 22.495,
    lng: 88.383,
    area: "Santoshpur",
  },

  // --- GARIA, NAKTALA & BANSDRONI ---
  { name: "Naktala Udayan Sangha", lat: 22.4725, lng: 88.377, area: "Naktala" },
  { name: "Garia Naba Durga", lat: 22.463, lng: 88.379, area: "Garia" },
  { name: "Garia Mitali Sangha", lat: 22.465, lng: 88.38, area: "Garia" },
  {
    name: "Baghajatin Tarun Sangha",
    lat: 22.484,
    lng: 88.375,
    area: "Baghajatin",
  },
  {
    name: "Bansdroni Sarbojaneen Durgotsav Park",
    lat: 22.476,
    lng: 88.345,
    area: "Bansdroni",
  },
  { name: "Ramgarh United", lat: 22.479, lng: 88.371, area: "Garia / Ramgarh" },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${KASBA_GARIA_VIP_PANDALS.length} curated Kasba & Garia VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of KASBA_GARIA_VIP_PANDALS) {
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
