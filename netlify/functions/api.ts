import { createRequire } from "node:module";
import { createApp } from "../../backend/dist/app.js";
import { connectDb } from "../../backend/dist/config/db.js";
import express from "express";
import serverless from "serverless-http";

const app = express();
const apiApp = createApp();

let dbConnection: Promise<any>;

app.use(async (req, _res, next) => {
  try {
    dbConnection ||= connectDb();
    await dbConnection;
    next();
  } catch (error) {
    console.error("Database connection failed", error);
    next(new Error("Database connection failed. Check your MongoDB Atlas MONGO_URI, database user password, and Network Access allowlist."));
  }
});

app.use((req, _res, next) => {
  req.url = req.url.replace(/^\/\.netlify\/functions\/api/, "");
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});

app.use(apiApp);

app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({
    success: false,
    error: err.message || "API request failed",
  });
});

export const handler = serverless(app);
