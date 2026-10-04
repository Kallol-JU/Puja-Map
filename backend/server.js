import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import pandalRoutes from "./routes/pandalRoutes.js"; // <-- ADD THIS

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/pandals", pandalRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "API is running beautifully" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
