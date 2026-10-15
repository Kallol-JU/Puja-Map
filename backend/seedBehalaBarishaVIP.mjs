import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters for Behala & Barisha
const BEHALA_VIP_PANDALS = [
  // --- FROM THE SCREENSHOT ---
  {
    name: "Parnashree Palli",
    lat: 22.5028,
    lng: 88.3125,
    area: "Behala & Barisha",
  },
  {
    name: "Evergreen Club",
    lat: 22.4935,
    lng: 88.317,
    area: "Behala & Barisha",
  },
  {
    name: "Naskarpur Sarbojanin",
    lat: 22.4895,
    lng: 88.32,
    area: "Behala & Barisha",
  },
  { name: "Behala Young", lat: 22.495, lng: 88.316, area: "Behala & Barisha" },

  // --- OTHER BEHALA & BARISHA GIANTS ---
  { name: "Behala Club", lat: 22.4925, lng: 88.321, area: "Behala & Barisha" },
  {
    name: "Behala Natun Dal",
    lat: 22.4965,
    lng: 88.3185,
    area: "Behala & Barisha",
  },
  {
    name: "Behala Buroshibtala Janakalyan Sangha",
    lat: 22.4985,
    lng: 88.3225,
    area: "Behala & Barisha",
  },
  { name: "Barisha Club", lat: 22.476, lng: 88.314, area: "Behala & Barisha" },
  {
    name: "Barisha Sarbojanin",
    lat: 22.4755,
    lng: 88.3135,
    area: "Behala & Barisha",
  },
  {
    name: "Behala Friends",
    lat: 22.491,
    lng: 88.3195,
    area: "Behala & Barisha",
  },
  {
    name: "Behala 11 Pally",
    lat: 22.494,
    lng: 88.318,
    area: "Behala & Barisha",
  },
  {
    name: "Sree Sangha (Behala)",
    lat: 22.48,
    lng: 88.318,
    area: "Behala & Barisha",
  },
  { name: "Ajeya Hati", lat: 22.485, lng: 88.315, area: "Behala & Barisha" },
  {
    name: "Barisha Sabuj Kuri",
    lat: 22.473,
    lng: 88.3155,
    area: "Behala & Barisha",
  },
  {
    name: "Sahapur Pragatishil",
    lat: 22.508,
    lng: 88.33,
    area: "Behala & Barisha",
  },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${BEHALA_VIP_PANDALS.length} curated Behala & Barisha VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of BEHALA_VIP_PANDALS) {
    const hit = await Pandal.findOne({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          $maxDistance: 75,
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
