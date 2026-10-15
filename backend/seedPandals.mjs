import "dotenv/config";
import mongoose from "mongoose";

// 🚀 LINKED TO YOUR REAL BACKEND MODEL
import Pandal from "./models/Pandal.js";

const { MONGO_URI } = process.env;
const DRY_RUN = process.argv.includes("--dry-run");

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "DurgaPujaMapSeeder/1.0 (contact@pujamap.app)";

const DEDUPE_RADIUS_M = 50;
const DELAY_BETWEEN_REQUESTS_MS = 10_000;
const QUERY_TIMEOUT_S = 60;
const MAX_START_SPAN_DEG = 0.75;
const MIN_SPAN_DEG = 0.1;
const MAX_ATTEMPTS_PER_TILE = 4;

const REGIONS = [
  ["Kolkata core", 22.45, 88.25, 22.7, 88.5],
  ["Howrah", 22.4, 87.95, 22.7, 88.28],
  ["North 24 Parganas", 22.68, 88.25, 23.1, 88.95],
  ["South 24 Parganas", 21.5, 88.0, 22.45, 89.1],
  ["Hooghly / Nadia / Murshidabad", 22.7, 87.6, 24.6, 88.8],
  ["Medinipur / Jhargram", 21.5, 86.7, 22.7, 88.0],
  ["Bankura / Purulia / Bardhaman / Birbhum", 22.7, 85.8, 24.5, 87.6],
  ["Malda / Dinajpur", 24.4, 87.7, 26.6, 89.1],
  ["Darjeeling / Jalpaiguri / Cooch Behar", 26.0, 87.8, 27.3, 89.9],
];

function buildQuery([s, w, n, e]) {
  return `
[out:json][timeout:${QUERY_TIMEOUT_S}][bbox:${s},${w},${n},${e}];
(
  nwr["religion"="hindu"];
  nwr["amenity"="community_centre"];
  nwr["amenity"="social_centre"];
  nwr["club"];
  nwr["event"];
);
out center tags qt;`;
}

const NAME_RE = new RegExp(
  [
    "puja",
    "pooja",
    "pujo",
    "pandal",
    "durga",
    "durgo",
    "sarbojanin",
    "barowari",
    "sangha",
    "sangh",
    "samiti",
    "samity",
    "club",
    "parishad",
    "sangsad",
    "udyog",
    "পূজা",
    "পুজো",
    "দুর্গা",
    "দুর্গো",
    "ক্লাব",
    "সংঘ",
    "সমিতি",
    "মণ্ডপ",
    "প্যান্ডেল",
  ].join("|"),
  "iu",
);
const NAME_KEYS = [
  "name",
  "name:en",
  "name:bn",
  "alt_name",
  "old_name",
  "short_name",
];

const EXCLUDE_KEYS = [
  "shop",
  "highway",
  "railway",
  "waterway",
  "boundary",
  "place",
  "route",
];
const EXCLUDE_AMENITY = new Set([
  "restaurant",
  "bar",
  "pub",
  "cafe",
  "fast_food",
  "nightclub",
  "bank",
  "school",
  "college",
  "university",
  "hospital",
  "clinic",
  "pharmacy",
  "cinema",
]);

function matchesPandal(tags) {
  if (EXCLUDE_KEYS.some((k) => tags[k] !== undefined)) return false;
  if (tags.amenity && EXCLUDE_AMENITY.has(tags.amenity)) return false;
  return NAME_KEYS.some((k) => tags[k] && NAME_RE.test(tags[k]));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let endpointIdx = 0;
const currentEndpoint = () => ENDPOINTS[endpointIdx % ENDPOINTS.length];
const rotateEndpoint = () => {
  endpointIdx++;
  console.warn(`  switching mirror -> ${currentEndpoint()}`);
};

async function waitForSlot(endpoint) {
  const statusUrl = `${new URL(endpoint).origin}/api/status`;
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(statusUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      if (/Rate limit:\s*0/i.test(text)) return;
      const free = text.match(/(\d+)\s+slots?\s+available now/i);
      if (free && Number(free[1]) > 0) return;

      const waits = [...text.matchAll(/in\s+(\d+)\s+seconds/gi)].map((m) =>
        Number(m[1]),
      );
      const wait = waits.length ? Math.min(...waits) + 1 : 10;
      console.log(`  no free slot; waiting ${wait}s`);
      await sleep(Math.min(wait, 120) * 1000);
    } catch {
      return;
    }
  }
}

async function fetchTile(bbox) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_TILE; attempt++) {
    const endpoint = currentEndpoint();
    await waitForSlot(endpoint);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: new URLSearchParams({ data: buildQuery(bbox) }),
        signal: AbortSignal.timeout((QUERY_TIMEOUT_S + 30) * 1000),
      });

      if (res.ok) {
        const data = JSON.parse(await res.text());
        if (
          data.remark &&
          /timed out|out of memory|runtime error/i.test(data.remark)
        ) {
          console.warn(`  remark: ${data.remark}`);
          return { split: true };
        }
        return { elements: data.elements ?? [] };
      }

      if (res.status === 429) {
        const ra = Number(res.headers.get("retry-after"));
        const wait = ra > 0 ? ra : 60 * (attempt + 1);
        console.warn(`  429 rate limited; waiting ${wait}s`);
        await sleep(wait * 1000);
        rotateEndpoint();
        continue;
      }

      if ([502, 503, 504].includes(res.status)) {
        console.warn(`  HTTP ${res.status} (attempt ${attempt + 1})`);
        rotateEndpoint();
        if (attempt >= 1) return { split: true };
        await sleep(20_000);
        continue;
      }

      return {
        fatal: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`,
      };
    } catch (err) {
      console.warn(`  ${err.name}: ${err.message} (attempt ${attempt + 1})`);
      rotateEndpoint();
      if (attempt >= 1) return { split: true };
      await sleep(20_000);
    }
  }
  return { split: true };
}

function splitBbox([s, w, n, e], maxSpan) {
  const latParts = Math.ceil((n - s) / maxSpan);
  const lngParts = Math.ceil((e - w) / maxSpan);
  const tiles = [];
  for (let i = 0; i < latParts; i++) {
    for (let j = 0; j < lngParts; j++) {
      tiles.push([
        s + ((n - s) * i) / latParts,
        w + ((e - w) * j) / lngParts,
        s + ((n - s) * (i + 1)) / latParts,
        w + ((e - w) * (j + 1)) / lngParts,
      ]);
    }
  }
  return tiles;
}

const fmt = (b) => b.map((x) => x.toFixed(3)).join(",");

function getCoords(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  return lat == null || lon == null ? null : { lat, lon };
}

function buildAddress(tags) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
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

const stats = {
  tilesOk: 0,
  tilesSplit: 0,
  tilesGaveUp: 0,
  fetched: 0,
  seenThisRun: 0,
  notPandal: 0,
  dupById: 0,
  dupNearby: 0,
  inserted: 0,
};
const seenIds = new Set();

async function saveElements(elements) {
  for (const el of elements) {
    stats.fetched++;

    const osmId = `${el.type}/${el.id}`;
    if (seenIds.has(osmId)) {
      stats.seenThisRun++;
      continue;
    }
    seenIds.add(osmId);

    const tags = el.tags ?? {};
    const coords = getCoords(el);
    const name = (tags.name || tags["name:en"] || tags["name:bn"] || "").trim();
    if (!coords || !name || !matchesPandal(tags)) {
      stats.notPandal++;
      continue;
    }

    if (await Pandal.exists({ osmId })) {
      stats.dupById++;
      continue;
    }

    if (await existsNearby(coords.lon, coords.lat)) {
      stats.dupNearby++;
      continue;
    }

    if (!DRY_RUN) {
      await Pandal.create({
        name,
        location: { type: "Point", coordinates: [coords.lon, coords.lat] },
        sources: ["OpenStreetMap"],
        osmId,
        address: buildAddress(tags),
      });
    }
    stats.inserted++;
    console.log(
      `  + ${name}  (${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)})`,
    );
  }
}

async function processTile(bbox, label) {
  console.log(`> ${label} [${fmt(bbox)}]`);
  const result = await fetchTile(bbox);

  if (result.fatal) {
    console.error(`  ! fatal for this tile: ${result.fatal}`);
    stats.tilesGaveUp++;
    return;
  }

  if (result.split) {
    const [s, w, n, e] = bbox;
    if (Math.max(n - s, e - w) / 2 < MIN_SPAN_DEG) {
      console.error(`  ! giving up on ${fmt(bbox)} (already at minimum size)`);
      stats.tilesGaveUp++;
      return;
    }
    stats.tilesSplit++;
    console.warn(`  splitting into 4 smaller tiles`);
    const midLat = (s + n) / 2;
    const midLng = (w + e) / 2;
    const children = [
      [s, w, midLat, midLng],
      [s, midLng, midLat, e],
      [midLat, w, n, midLng],
      [midLat, midLng, n, e],
    ];
    for (const child of children) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      await processTile(child, `${label} (sub)`);
    }
    return;
  }

  stats.tilesOk++;
  console.log(`  ${result.elements.length} raw elements`);
  await saveElements(result.elements);
}

async function main() {
  if (!MONGO_URI) throw new Error("Set MONGO_URI in .env");

  await mongoose.connect(MONGO_URI);
  await Pandal.init();
  console.log(
    `Connected. ${DRY_RUN ? "[DRY RUN] " : ""}Starting OSM seed...\n`,
  );

  const tiles = REGIONS.flatMap(([label, ...bbox]) =>
    splitBbox(bbox, MAX_START_SPAN_DEG).map((t) => ({ label, bbox: t })),
  );
  console.log(`${tiles.length} starting tiles\n`);

  for (let i = 0; i < tiles.length; i++) {
    await processTile(
      tiles[i].bbox,
      `[${i + 1}/${tiles.length}] ${tiles[i].label}`,
    );
    if (i < tiles.length - 1) {
      console.log(`  (sleeping ${DELAY_BETWEEN_REQUESTS_MS / 1000}s)\n`);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
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
