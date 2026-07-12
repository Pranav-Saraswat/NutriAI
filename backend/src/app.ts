import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import mealRoutes from "./routes/mealRoutes.js"; // New

const defaultFrontendDistPath = path.resolve(process.cwd(), "frontend/dist");
const frontendDistPath = process.env.FRONTEND_DIST_DIR || defaultFrontendDistPath;
const frontendIndexPath = path.join(frontendDistPath, "index.html");

export const createApp = (): Express => {
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
  app.use(express.json({ limit: "5mb" })); // Increase limit to support large base64 uploads if needed

  // Serve image uploads statically
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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
  app.use("/api", mealRoutes); // New meal tracking routes

  if (existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath));
    app.get(/^\/(?!api(?:\/|$)|socket\.io(?:\/|$)).*/, (_req: Request, res: Response) => {
      return res.sendFile(frontendIndexPath);
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  });

  return app;
};
