import { createRequire } from "node:module";
import { createApp } from "../../backend/src/app.js";
import { connectDb } from "../../backend/src/config/db.js";

const require = createRequire(new URL("../../backend/package.json", import.meta.url));
const express = require("express");
const serverless = require("serverless-http");

const app = express();
const apiApp = createApp();

let dbConnection;

app.use(async (req, _res, next) => {
  try {
    dbConnection ||= connectDb();
    await dbConnection;
    next();
  } catch (error) {
    next(error);
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

export const handler = serverless(app);
