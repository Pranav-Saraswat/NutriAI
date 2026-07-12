import { createApp } from "../../backend/src/app.js";
import { connectDb } from "../../backend/src/config/db.js";
import express, { Request, Response, NextFunction } from "express";
import serverless from "serverless-http";

const app = express();
const apiApp = createApp();

let dbConnection: Promise<any>;

app.use(async (req: Request, _res: Response, next: NextFunction) => {
  try {
    dbConnection ||= connectDb();
    await dbConnection;
    next();
  } catch (error) {
    console.error("Database connection failed", error);
    next(new Error("Database connection failed. Check your MongoDB Atlas MONGO_URI, database user password, and Network Access allowlist."));
  }
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.url = req.url.replace(/^\/\.netlify\/functions\/api/, "");
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});

app.use(apiApp);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: err.message || "API request failed",
  });
});

export const handler = serverless(app);
