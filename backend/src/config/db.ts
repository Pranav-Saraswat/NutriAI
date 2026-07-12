import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDb = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required. Set your MongoDB Atlas connection string in Netlify.");
  }

  connectionPromise ||= mongoose.connect(env.mongoUri, {
    dbName: env.mongoDbName,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 6000,
  });

  try {
    await connectionPromise;
    return mongoose;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};
