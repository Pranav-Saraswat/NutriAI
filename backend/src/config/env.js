import dotenv from "dotenv";

dotenv.config();

const asBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/nutriai_db",
  mongoDbName: process.env.MONGO_DB_NAME || "nutriai_db",
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  trustProxy: asBool(process.env.TRUST_PROXY, false),
};
