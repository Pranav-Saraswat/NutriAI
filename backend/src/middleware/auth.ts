import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { User, IUserDocument } from "../models/User.js";

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

interface DecodedToken {
  userId: string;
}

const getTokenFromRequest = (req: Request): string | null => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

export const authRequired = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const payload = jwt.verify(token, env.jwtSecret) as DecodedToken;
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid session" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

export const adminRequired = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Admin access required" });
  }
  return next();
};

export const signAuthToken = (userId: string): string =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
