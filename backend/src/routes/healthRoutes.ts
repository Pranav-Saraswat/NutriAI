import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  const isConnected = mongoose.connection.readyState === 1;
  const statusCode = isConnected ? 200 : 503;

  return res.status(statusCode).json({
    success: isConnected,
    app: "ok",
    database: isConnected ? "ok" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

export default router;
