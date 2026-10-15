import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);

  try {
    // Drop the conflicting old index
    await mongoose.connection
      .collection("pandals")
      .dropIndex("navigationPoint_2dsphere");
    console.log("✅ Old index dropped successfully!");
  } catch (err) {
    console.log("⚠️ Note:", err.message);
  }

  await mongoose.disconnect();
  console.log("🚀 All clear! You can now run: node seedPandals.mjs");
}

main();
