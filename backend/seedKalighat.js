import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import connectDB from "./config/db.js";
import Pandal from "./models/Pandal.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    const rawData = fs.readFileSync("./kalighatPandals.json", "utf-8");
    const rawPandals = JSON.parse(rawData);

    console.log(`⏳ Seeding ${rawPandals.length} Kalighat pandals...`);

    // Sanitize objects to match Pandal.js schema strictly
    const operations = rawPandals.map((item) => {
      const sanitized = {
        name: item.name,
        aliases: item.aliases || [
          `${item.name} Kalighat`,
          "Kalighat Metro Zone",
        ],
        area: item.area || "Kalighat",
        address: item.address || "Near Kalighat Metro Station",
        location: item.location || {
          type: "Point",
          coordinates: [88.3475, 22.518],
        },
        sources: ["PujoMap"], // Must match enum in Pandal.js
        confidenceLevel: item.confidenceLevel || "MEDIUM",
        isVerified: true,
      };

      return {
        updateOne: {
          filter: { name: sanitized.name }, // Filter only on schema fields
          update: { $set: sanitized },
          upsert: true,
        },
      };
    });

    const result = await Pandal.bulkWrite(operations);
    console.log(
      `✅ Database Seeding Complete!\n- Inserted: ${result.upsertedCount}\n- Updated: ${result.modifiedCount}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
