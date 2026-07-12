import dotenv from "dotenv";

dotenv.config();

const asBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const mongoUri = process.env.MONGO_URI || (isProduction ? "" : "mongodb://localhost:27017/nutriai_db");

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri,
  mongoDbName: process.env.MONGO_DB_NAME || "nutriai_db",
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  chatMaxTokens: Number(process.env.CHAT_MAX_TOKENS || 1200),
  chatHistoryLimit: Number(process.env.CHAT_HISTORY_LIMIT || 30),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  trustProxy: asBool(process.env.TRUST_PROXY, false),
};
