import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

export const authRequired = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid session" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

export const adminRequired = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  return next();
};

export const signAuthToken = (userId) => jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
