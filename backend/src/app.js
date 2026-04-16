import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultFrontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendDistPath = process.env.FRONTEND_DIST_DIR || defaultFrontendDistPath;
const frontendIndexPath = path.join(frontendDistPath, "index.html");

export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", userRoutes);
  app.use("/api", chatRoutes);
  app.use("/api", adminRoutes);

  if (existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath));
    app.get(/^\/(?!api(?:\/|$)|socket\.io(?:\/|$)).*/, (_req, res) => {
      return res.sendFile(frontendIndexPath);
    });
  }

  app.use((err, _req, res, _next) => {
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  });

  return app;
};
