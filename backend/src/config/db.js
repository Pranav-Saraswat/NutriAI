import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise;

export const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required. Set your MongoDB Atlas connection string in Netlify.");
  }

  connectionPromise ||= mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await connectionPromise;
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};
