import "dotenv/config";
import mongoose from "mongoose";
import Pandal from "./models/Pandal.js";

const { MONGO_URI, GOOGLE_PLACES_API_KEY } = process.env;
const DRY_RUN = process.argv.includes("--dry-run");
const USE_FILTER = !process.argv.includes("--no-filter");

const DEDUPE_RADIUS_M = 50;
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.formattedAddress",
  "nextPageToken",
].join(",");

const QUERIES = [
  "Durga Puja Pandal",
  "Durga Puja",
  "Sarbojanin Durgotsav",
  "Barowari Puja",
  "Puja Committee",
];

const SEARCH_CENTERS = [
  ["Kolkata North (Shyambazar)", 22.6004, 88.3731, 5000],
  ["Kolkata Central (College St)", 22.5726, 88.3639, 5000],
  ["Kolkata South (Ballygunge)", 22.523, 88.365, 5000],
  ["Kolkata Far South (Behala)", 22.496, 88.32, 6000],
  ["Kolkata East (Salt Lake)", 22.58, 88.415, 6000],
  ["New Town / Rajarhat", 22.58, 88.47, 7000],
  ["Dum Dum / Baguiati", 22.63, 88.42, 7000],
  ["Garia / Jadavpur", 22.48, 88.39, 6000],
  ["Howrah City", 22.5958, 88.2636, 6000],
  ["Howrah Shibpur / Bally", 22.63, 88.32, 6000],
  ["Howrah Liluah / Belur", 22.64, 88.35, 5000],
  ["Howrah Uluberia", 22.47, 88.11, 15000],
  ["Barasat", 22.72, 88.48, 15000],
  ["Barrackpore", 22.765, 88.37, 12000],
  ["Hooghly (Chinsurah)", 22.9, 88.39, 20000],
  ["South 24 Parganas (Baruipur)", 22.36, 88.43, 20000],
  ["Durgapur", 23.5204, 87.3119, 20000],
  ["Asansol", 23.6739, 86.9524, 20000],
  ["Bardhaman", 23.2324, 87.8615, 20000],
  ["Krishnanagar", 23.4058, 88.49, 20000],
  ["Kharagpur", 22.346, 87.232, 20000],
  ["Midnapore", 22.4257, 87.3199, 20000],
  ["Bankura", 23.2324, 87.065, 20000],
  ["Purulia", 23.3321, 86.3616, 20000],
  ["Berhampore", 24.1, 88.25, 20000],
  ["Malda", 25.0108, 88.1411, 20000],
  ["Siliguri", 26.7271, 88.3953, 25000],
  ["Darjeeling", 27.041, 88.2663, 15000],
  ["Cooch Behar", 26.325, 89.45, 20000],
];

const NAME_HINT =
  /puja|pandal|durga|durgo|sarbojanin|barowari|sangha|sangh|samiti|samity|club|parishad|committee|association|udyog|milan|sammelani|sangsad|mandap|mondop|temple|mandir/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postWithRetry(body, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** i);
      continue;
    }
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text}`);
  }
  throw new Error("Places API: retries exhausted");
}

async function* searchAllPages(textQuery, lat, lng, radius) {
  const baseBody = {
    textQuery,
    pageSize: 20,
    languageCode: "en",
    regionCode: "IN",
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    },
  };

  let pageToken;
  do {
    const data = await postWithRetry(
      pageToken ? { ...baseBody, pageToken } : baseBody,
    );
    for (const place of data.places ?? []) yield place;
    pageToken = data.nextPageToken;
    if (pageToken) await sleep(250);
  } while (pageToken);
}

async function existsNearby(lng, lat) {
  const hit = await Pandal.findOne(
    {
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: DEDUPE_RADIUS_M,
        },
      },
    },
    { _id: 1 },
  ).lean();
  return Boolean(hit);
}

async function main() {
  if (!MONGO_URI || !GOOGLE_PLACES_API_KEY) {
    throw new Error("Set MONGO_URI and GOOGLE_PLACES_API_KEY in .env");
  }

  await mongoose.connect(MONGO_URI);
  await Pandal.init();
  console.log(`Connected. ${DRY_RUN ? "[DRY RUN] " : ""}Starting seed...\n`);

  const stats = {
    fetched: 0,
    seenThisRun: 0,
    filteredOut: 0,
    dupById: 0,
    dupNearby: 0,
    inserted: 0,
    errors: 0,
  };
  const seenIds = new Set();

  for (const [label, lat, lng, radius] of SEARCH_CENTERS) {
    console.log(`> ${label}`);

    for (const query of QUERIES) {
      try {
        for await (const place of searchAllPages(query, lat, lng, radius)) {
          stats.fetched++;

          if (seenIds.has(place.id)) {
            stats.seenThisRun++;
            continue;
          }
          seenIds.add(place.id);

          const name = place.displayName?.text?.trim();
          const pLat = place.location?.latitude;
          const pLng = place.location?.longitude;
          if (!name || pLat == null || pLng == null) continue;

          if (USE_FILTER && !NAME_HINT.test(name)) {
            stats.filteredOut++;
            continue;
          }

          if (await Pandal.exists({ googlePlaceId: place.id })) {
            stats.dupById++;
            continue;
          }

          if (await existsNearby(pLng, pLat)) {
            stats.dupNearby++;
            continue;
          }

          if (!DRY_RUN) {
            await Pandal.create({
              name,
              location: { type: "Point", coordinates: [pLng, pLat] },
              address: place.formattedAddress,
              sources: ["GooglePlaces"],
              googlePlaceId: place.id,
            });
          }
          stats.inserted++;
          console.log(`  + ${name}  (${pLat.toFixed(5)}, ${pLng.toFixed(5)})`);
        }
      } catch (err) {
        stats.errors++;
        console.error(`  ! "${query}" @ ${label} failed: ${err.message}`);
      }
    }
  }

  console.log("\n--- Summary ---");
  console.table(stats);
  if (DRY_RUN) console.log("Dry run: nothing was written.");
}

main()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
