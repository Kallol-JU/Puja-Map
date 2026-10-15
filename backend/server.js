import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import pandalRoutes from "./routes/pandalRoutes.js";

dotenv.config();

connectDB();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "https://puja-map.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        /^https?:\/\/localhost:\d+$/.test(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation for origin: ${origin}`));
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

app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("🔥 Global Backend Error:", err.stack || err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`),
);

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing HTTP server gracefully...");
  server.close(() => console.log("HTTP server closed."));
});
