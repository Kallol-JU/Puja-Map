import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Pandal from "../models/Pandal.js";

dotenv.config();

const SAHAJ_ENDPOINT =
  "https://sahaj.wb.gov.in/SiteController/codex_puja_map_google_data";

// West Bengal roughly falls in this bounding box
const isValidCoordinate = (lat, lng) => {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  return (
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= 21.5 &&
    numLat <= 27.5 &&
    numLng >= 85.8 &&
    numLng <= 89.9
  );
};

const runAuditAndImport = async () => {
  console.log("Fetching 2026 Puja data from WB SAHAJ portal...");

  try {
    const response = await axios.get(SAHAJ_ENDPOINT, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Extract the 'records' array based on the API response structure
    let rawData = response.data;
    if (rawData && Array.isArray(rawData.records)) {
      rawData = rawData.records;
    } else {
      console.log(
        "❌ ERROR: Could not find the 'records' array in the response.",
      );
      process.exit(1);
    }

    let audit = {
      totalFound: rawData.length,
      validRecords: 0,
      missingCoordinates: 0,
      outOfBounds: 0,
      duplicates: 0,
    };

    const cleanPandals = [];
    const seenCoordinates = new Set();

    rawData.forEach((record) => {
      // Map exact SAHAJ keys from the API response
      const name = String(record.gen_organization_club || "").trim();
      const area = String(record.jurisdiction_name || "West Bengal").trim();
      const address = String(record.gen_address_of_the_pandal || "").trim();
      const lat = record.latitude;
      const lng = record.longitude;

      // 1. Missing data check
      if (!name || !lat || !lng) {
        audit.missingCoordinates++;
        return;
      }

      // 2. Geographic bounds check
      if (!isValidCoordinate(lat, lng)) {
        audit.outOfBounds++;
        return;
      }

      // 3. Duplicate check (prevent stacking markers exactly on top of each other)
      const coordKey = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
      if (seenCoordinates.has(coordKey)) {
        audit.duplicates++;
        return;
      }
      seenCoordinates.add(coordKey);

      // 4. Format for our MongoDB schema
      cleanPandals.push({
        name: name,
        location: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        navigationPoint: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        area: area,
        address: address,
        district: area, // SAHAJ provides jurisdiction, which aligns well with district
        isVerified: true,
        verificationSource: "admin",
      });
    });

    audit.validRecords = cleanPandals.length;

    console.log("\n=== SAHAJ DATA AUDIT REPORT ===");
    console.log(`Total Records Fetched : ${audit.totalFound}`);
    console.log(`Missing Coordinates   : ${audit.missingCoordinates}`);
    console.log(`Out of Bounds (Errors): ${audit.outOfBounds}`);
    console.log(`Duplicates Removed    : ${audit.duplicates}`);
    console.log(`CLEAN VALID RECORDS   : ${audit.validRecords}`);
    console.log("===============================\n");

    if (audit.validRecords === 0) {
      console.log("No valid records found. Exiting.");
      process.exit(0);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Clearing old pandal data...");
    await Pandal.deleteMany();

    console.log(`Inserting ${audit.validRecords} clean SAHAJ data records...`);
    // Insert in batches if necessary, but 25k records usually inserts fine in one go
    await Pandal.insertMany(cleanPandals);

    await Pandal.syncIndexes();
    console.log("Success! Real 2026 SAHAJ data is now in your database.");

    process.exit(0);
  } catch (error) {
    console.error("Error in data pipeline:", error.message);
    process.exit(1);
  }
};

runAuditAndImport();
