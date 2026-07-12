import { Router, Request, Response } from "express";
import { authRequired } from "../middleware/auth.js";
import { WeightLog } from "../models/WeightLog.js";
import { calculateDailyTargets } from "../utils/dailyTargets.js";
import { IUserDocument } from "../models/User.js";

const router = Router();

interface ProfilePayload {
  name?: string;
  age?: string | number;
  height?: string | number;
  weight?: string | number;
  gender?: string;
  goal_type?: string;
  activity_level?: string;
  target_weight?: string | number | null;
  dietary_preferences?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
}

const validateProfileForm = (payload: ProfilePayload, requireName = false): string[] => {
  const errors: string[] = [];
  const age = Number(payload.age);
  const height = Number(payload.height);
  const weight = Number(payload.weight);
  const targetWeight = payload.target_weight !== undefined && payload.target_weight !== null && payload.target_weight !== ""
    ? Number(payload.target_weight)
    : null;

  if (requireName && String(payload.name || "").trim().length < 2) {
    errors.push("Name must be at least 2 characters.");
  }
  if (isNaN(age) || !(age >= 1 && age <= 120)) {
    errors.push("Age must be between 1 and 120.");
  }
  if (isNaN(height) || !(height >= 50 && height <= 250)) {
    errors.push("Height must be between 50 and 250 cm.");
  }
  if (isNaN(weight) || !(weight >= 20 && weight <= 300)) {
    errors.push("Weight must be between 20 and 300 kg.");
  }
  if (!payload.gender || !["male", "female", "other"].includes(payload.gender)) {
    errors.push("Please select a valid gender.");
  }
  if (!payload.goal_type || !["weight_loss", "muscle_gain", "maintain", "improve_health"].includes(payload.goal_type)) {
    errors.push("Please select a valid goal.");
  }
  if (!payload.activity_level || !["sedentary", "light", "moderate", "active", "very_active"].includes(payload.activity_level)) {
    errors.push("Please select a valid activity level.");
  }
  if (targetWeight !== null && (isNaN(targetWeight) || !(targetWeight >= 20 && targetWeight <= 300))) {
    errors.push("Target weight must be between 20 and 300 kg.");
  }

  return errors;
};

const applyProfilePayload = (user: IUserDocument, payload: ProfilePayload, includeName = false): void => {
  if (includeName) {
    user.name = String(payload.name || "").trim();
  }
  user.age = Number(payload.age);
  user.gender = payload.gender as "male" | "female" | "other";
  user.heightCm = Number(payload.height);
  user.weightKg = Number(payload.weight);
  user.goalType = payload.goal_type as "weight_loss" | "muscle_gain" | "maintain" | "improve_health";
  user.targetWeight = payload.target_weight ? Number(payload.target_weight) : null;
  user.activityLevel = payload.activity_level as "sedentary" | "light" | "moderate" | "active" | "very_active";
  user.dietaryPreferences = payload.dietary_preferences || null;
  user.allergies = payload.allergies || null;
  user.medicalConditions = payload.medical_conditions || null;
};

router.get("/user", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  return res.json({
    success: true,
    data: {
      ...req.user.toSafeObject(),
      daily_targets: calculateDailyTargets(req.user),
    },
  });
});

router.post("/profile-setup", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const errors = validateProfileForm(req.body || {}, false);
  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  applyProfilePayload(req.user, req.body || {}, false);
  await req.user.save();

  return res.json({ success: true, message: "Profile completed.", data: req.user.toSafeObject() });
});

router.put("/profile", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const errors = validateProfileForm(req.body || {}, true);
  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  applyProfilePayload(req.user, req.body || {}, true);
  await req.user.save();

  return res.json({ success: true, message: "Profile updated.", data: req.user.toSafeObject() });
});

router.get("/weight-log", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const logs = await WeightLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  return res.json({
    success: true,
    data: logs.map((log) => ({
      id: log._id.toString(),
      weight_kg: log.weightKg,
      created_at: log.createdAt,
    })),
  });
});

router.post("/weight-log", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const weight = Number(req.body?.weight_kg);
  if (!(weight > 0)) {
    return res.status(400).json({ success: false, error: "Invalid weight." });
  }

  await WeightLog.create({ userId: req.user._id, weightKg: weight });
  req.user.weightKg = weight;
  await req.user.save();

  return res.json({ success: true, message: "Weight logged." });
});

export default router;
