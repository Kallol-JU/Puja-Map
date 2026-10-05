import mongoose from "mongoose";
import dotenv from "dotenv";
import Pandal from "./models/Pandal.js";

dotenv.config();

const realPandals = [
  {
    name: "Sreebhumi Sporting Club",
    aliases: ["Sree Bhumi", "Sribhumi"],
    location: { type: "Point", coordinates: [88.399658, 22.598285] },
    navigationPoint: { type: "Point", coordinates: [88.3985, 22.5978] }, // VIP Road drop-off
    area: "Lake Town",
    district: "Kolkata",
    isVerified: true,
  },
  {
    name: "College Square Sarbojanin",
    aliases: ["College Square", "Kolkata University Pandal"],
    location: { type: "Point", coordinates: [88.36363, 22.576054] },
    navigationPoint: { type: "Point", coordinates: [88.363, 22.5765] }, // College Street gate
    area: "College Street",
    district: "Kolkata",
    isVerified: true,
  },
  {
    name: "Suruchi Sangha",
    aliases: ["New Alipore Suruchi", "Suruchi"],
    location: { type: "Point", coordinates: [88.326202, 22.520445] },
    navigationPoint: { type: "Point", coordinates: [88.3255, 22.52] },
    area: "New Alipore",
    district: "Kolkata",
    isVerified: true,
  },
  {
    name: "Bagbazar Sarbojanin",
    aliases: ["Bagbazar", "Bagbazaar"],
    location: { type: "Point", coordinates: [88.3644, 22.6041] },
    navigationPoint: { type: "Point", coordinates: [88.3638, 22.6045] },
    area: "Bagbazar",
    district: "Kolkata",
    isVerified: true,
  },
  {
    name: "Santosh Mitra Square",
    aliases: ["Lebutala", "Santosh Mitra"],
    location: { type: "Point", coordinates: [88.366224, 22.565431] },
    navigationPoint: { type: "Point", coordinates: [88.3658, 22.565] },
    area: "Sealdah",
    district: "Kolkata",
    isVerified: true,
  },
  {
    name: "Ramkrishnapur Sarbojanin",
    aliases: ["Ramkrishnapur", "Howrah Ramkrishnapur"],
    location: { type: "Point", coordinates: [88.33081, 22.58572] },
    navigationPoint: { type: "Point", coordinates: [88.3299, 22.5855] },
    area: "Ramkrishnapur",
    district: "Howrah",
    isVerified: true,
  },
  {
    name: "Salkia Alapatty",
    aliases: ["Alapatty", "Salkia Puja"],
    location: { type: "Point", coordinates: [88.34785, 22.60153] },
    navigationPoint: { type: "Point", coordinates: [88.347, 22.601] },
    area: "Salkia",
    district: "Howrah",
    isVerified: true,
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Pandal.deleteMany(); // Clear fake data
    console.log("Cleared old pandal data");

    await Pandal.insertMany(realPandals);
    console.log("Successfully seeded verified West Bengal pandals");

    // Ensure geospatial indexes are built
    await Pandal.syncIndexes();
    console.log("Geospatial indexes built");

    process.exit();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
