import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters organized by North Kolkata Metro Stations
const METRO_VIP_PANDALS = [
  // --- SHYAMBAZAR METRO ---
  {
    name: "Bagbazar Sarbojanin",
    lat: 22.6023,
    lng: 88.3685,
    area: "Shyambazar Metro",
  },
  {
    name: "Jagat Mukherjee Park",
    lat: 22.6025,
    lng: 88.3701,
    area: "Shyambazar Metro",
  },
  {
    name: "Tala Prattoy",
    lat: 22.6075,
    lng: 88.3752,
    area: "Shyambazar Metro",
  },
  {
    name: "Sikdar Bagan Sadharan Durgotsab",
    lat: 22.5995,
    lng: 88.3705,
    area: "Shyambazar Metro",
  },

  // --- SHOBHABAZAR SUTANUTI METRO ---
  {
    name: "Kumartuli Park",
    lat: 22.5985,
    lng: 88.3621,
    area: "Shobhabazar Metro",
  },
  {
    name: "Kumartuli Sarbojanin",
    lat: 22.5975,
    lng: 88.3628,
    area: "Shobhabazar Metro",
  },
  {
    name: "Ahiritola Jubak Brinda",
    lat: 22.595,
    lng: 88.3565,
    area: "Shobhabazar Metro",
  },
  {
    name: "Ahiritola Sarbojanin",
    lat: 22.596,
    lng: 88.3575,
    area: "Shobhabazar Metro",
  },
  {
    name: "Shovabazar Rajbari (Bonedi Bari)",
    lat: 22.5971,
    lng: 88.364,
    area: "Shobhabazar Metro",
  },
  {
    name: "Hatibagan Sarbojanin",
    lat: 22.5975,
    lng: 88.3681,
    area: "Shobhabazar Metro",
  },
  {
    name: "Nalin Sarkar Street",
    lat: 22.5992,
    lng: 88.3685,
    area: "Shobhabazar Metro",
  },

  // --- GIRISH PARK METRO ---
  {
    name: "Kashi Bose Lane",
    lat: 22.5925,
    lng: 88.3662,
    area: "Girish Park Metro",
  },
  {
    name: "Chaltabagan Lohapatty",
    lat: 22.5878,
    lng: 88.366,
    area: "Girish Park Metro",
  },
  {
    name: "Simla Byayam Samity",
    lat: 22.5855,
    lng: 88.3655,
    area: "Girish Park Metro",
  },
  {
    name: "Swami Vivekananda Sporting Club",
    lat: 22.589,
    lng: 88.364,
    area: "Girish Park Metro",
  },

  // --- MAHATMA GANDHI (MG) ROAD METRO ---
  {
    name: "Mohammad Ali Park",
    lat: 22.5805,
    lng: 88.361,
    area: "MG Road Metro",
  },
  { name: "College Square", lat: 22.5768, lng: 88.3638, area: "MG Road Metro" },
  {
    name: "Jorasanko Sadharan Durgotsav",
    lat: 22.584,
    lng: 88.359,
    area: "MG Road Metro",
  },

  // --- CENTRAL METRO ---
  {
    name: "Santosh Mitra Square (Lebutala)",
    lat: 22.5714,
    lng: 88.3664,
    area: "Central Metro",
  },

  // --- DUM DUM / BELGACHIA METRO ---
  {
    name: "Belgachia Sadharan Durgotsab",
    lat: 22.6045,
    lng: 88.386,
    area: "Belgachia Metro",
  },
  {
    name: "Netaji Colony (Lowland)",
    lat: 22.63,
    lng: 88.385,
    area: "Dum Dum Metro",
  },
  {
    name: "Bangali Sangha (Sinthee)",
    lat: 22.6285,
    lng: 88.381,
    area: "Dum Dum Metro",
  },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${METRO_VIP_PANDALS.length} curated North Kolkata Metro VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of METRO_VIP_PANDALS) {
    const hit = await Pandal.findOne({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          $maxDistance: 75, // Slightly larger radius to catch OSM variations
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
            name: p.name, // Overwrite messy OSM name with clean VIP name
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
