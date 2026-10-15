import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import pandalRoutes from "./routes/pandalRoutes.js"; // <-- ADD THIS
import compression from "compression";
dotenv.config();
connectDB();

const app = express();

app.use(compression());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // Will set this on Render
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use("/api/pandals", pandalRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "API is running beautifully" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
