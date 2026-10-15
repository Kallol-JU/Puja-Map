import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;

// Curated heavy-hitters organized by Central & South Kolkata Metro Stations
const METRO_VIP_PANDALS = [
  // --- CENTRAL, CHANDNI & ESPLANADE METRO ---
  {
    name: "Janbazar Sammilita",
    lat: 22.5601,
    lng: 88.354,
    area: "Esplanade Metro",
  },
  {
    name: "Taltala Sarbojanin",
    lat: 22.559,
    lng: 88.362,
    area: "Esplanade Metro",
  },
  {
    name: "Entally Sarbojanin",
    lat: 22.557,
    lng: 88.368,
    area: "Central Metro",
  },

  // --- NETAJI BHAVAN & RABINDRA SADAN METRO ---
  {
    name: "Chakraberia Sarbojanin",
    lat: 22.534,
    lng: 88.349,
    area: "Netaji Bhavan Metro",
  },
  {
    name: "Bhowanipore 75 Pally",
    lat: 22.5295,
    lng: 88.3455,
    area: "Netaji Bhavan Metro",
  },
  {
    name: "Harish Park Sarbojanin",
    lat: 22.531,
    lng: 88.344,
    area: "Netaji Bhavan Metro",
  },

  // --- JATIN DAS PARK METRO ---
  {
    name: "Maddox Square",
    lat: 22.5285,
    lng: 88.3533,
    area: "Jatin Das Park Metro",
  },
  {
    name: "Tridhara Sammilani",
    lat: 22.5175,
    lng: 88.354,
    area: "Jatin Das Park Metro",
  },
  {
    name: "Forward Club",
    lat: 22.5255,
    lng: 88.351,
    area: "Jatin Das Park Metro",
  },

  // --- KALIGHAT METRO (The Mega Hub) ---
  {
    name: "Deshapriya Park",
    lat: 22.5186,
    lng: 88.3524,
    area: "Kalighat Metro",
  },
  {
    name: "Ekdalia Evergreen",
    lat: 22.5218,
    lng: 88.3675,
    area: "Kalighat Metro",
  },
  { name: "Singhi Park", lat: 22.5205, lng: 88.3665, area: "Kalighat Metro" },
  {
    name: "Ballygunge Cultural Association",
    lat: 22.519,
    lng: 88.362,
    area: "Kalighat Metro",
  },
  {
    name: "Samaj Sebi Sangha",
    lat: 22.5175,
    lng: 88.3625,
    area: "Kalighat Metro",
  },
  { name: "Hindustan Park", lat: 22.517, lng: 88.364, area: "Kalighat Metro" },
  {
    name: "Badamtala Ashar Sangha",
    lat: 22.5204,
    lng: 88.3444,
    area: "Kalighat Metro",
  },
  { name: "66 Pally", lat: 22.5195, lng: 88.344, area: "Kalighat Metro" },
  { name: "Chetla Agrani", lat: 22.518, lng: 88.3365, area: "Kalighat Metro" },

  // --- RABINDRA SAROBAR METRO ---
  {
    name: "Mudiali Club",
    lat: 22.5115,
    lng: 88.344,
    area: "Rabindra Sarobar Metro",
  },
  {
    name: "Shibmandir Sarbojanin",
    lat: 22.5125,
    lng: 88.346,
    area: "Rabindra Sarobar Metro",
  },
  {
    name: "Suruchi Sangha",
    lat: 22.5022,
    lng: 88.3305,
    area: "Rabindra Sarobar Metro",
  },
  {
    name: "Jodhpur Park",
    lat: 22.5065,
    lng: 88.3615,
    area: "Rabindra Sarobar Metro",
  },
  {
    name: "Babubagan Sarbojanin",
    lat: 22.5035,
    lng: 88.3635,
    area: "Rabindra Sarobar Metro",
  },

  // --- FURTHER SOUTH (Gariahat, Dhakuria, Behala, Naktala) ---
  {
    name: "Bosepukur Sitala Mandir",
    lat: 22.5152,
    lng: 88.384,
    area: "Ballygunge / Kasba",
  },
  {
    name: "Bosepukur Talbagan",
    lat: 22.514,
    lng: 88.3855,
    area: "Ballygunge / Kasba",
  },
  {
    name: "Naktala Udayan Sangha",
    lat: 22.4725,
    lng: 88.377,
    area: "Gitanjali Metro",
  },
  { name: "Barisha Club", lat: 22.476, lng: 88.314, area: "Behala / Taratala" },
  {
    name: "Sree Sangha (Behala)",
    lat: 22.48,
    lng: 88.318,
    area: "Behala / Taratala",
  },
];

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();

  console.log(
    `Injecting ${METRO_VIP_PANDALS.length} curated Central & South Kolkata VIPs...\n`,
  );

  let inserted = 0;
  let upgraded = 0;

  for (const p of METRO_VIP_PANDALS) {
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
