import { Router, Request, Response } from "express";
import fs from "fs";
import { authRequired } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { Meal, IMealDocument } from "../models/Meal.js";
import { DailyLog } from "../models/DailyLog.js";
import { WeightLog } from "../models/WeightLog.js";
import { aiMealService } from "../services/aiMealService.js";
import { calculateDailyTargets } from "../utils/dailyTargets.js";
import { llmService } from "../services/llmService.js";
import { env } from "../config/env.js";

const router = Router();

// Helper to convert local file to base64
const fileToBase64 = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
};

// 1. Analyze Meal Image or Text
router.post(
  "/meals/analyze",
  authRequired,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const description = req.body?.description;

      // Case A: Image Analysis
      if (req.file) {
        const filePath = req.file.path;
        const mimeType = req.file.mimetype;
        const base64Image = fileToBase64(filePath);

        // Analyze image using AI Service
        const aiResult = await aiMealService.analyzeMealImage(base64Image, mimeType);

        if (!aiResult.success || !aiResult.data) {
          return res.status(502).json({
            success: false,
            error: aiResult.error || "AI Vision failed to recognize this image.",
          });
        }

        // Return analyzed data and temporary image path
        const relativeUrl = `/uploads/${req.file.filename}`;
        return res.json({
          success: true,
          data: {
            ...aiResult.data,
            imageUrl: relativeUrl,
          },
        });
      }

      // Case B: Text Analysis
      if (description && String(description).trim()) {
        const aiResult = await aiMealService.analyzeMealText(String(description).trim());

        if (!aiResult.success || !aiResult.data) {
          return res.status(502).json({
            success: false,
            error: aiResult.error || "AI analysis of meal description failed.",
          });
        }

        return res.json({
          success: true,
          data: {
            ...aiResult.data,
            imageUrl: null,
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: "Please upload an image or provide a meal description.",
      });
    } catch (error: any) {
      console.error("Meal analysis endpoint error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred during meal analysis.",
      });
    }
  }
);

// 2. Log a Meal
router.post("/meals", authRequired, async (req: Request, res: Response) => {
  try {
    const { name, calories, protein, carbs, fat, items, imageUrl, notes, date } = req.body;

    if (!name || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
      return res.status(400).json({ success: false, error: "Missing required nutrition values." });
    }

    const mealDate = date ? new Date(date) : new Date();

    const meal = await Meal.create({
      userId: req.user!._id,
      name,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
      imageUrl: imageUrl || null,
      items: items || [],
      confidenceScore: req.body.confidenceScore || 1.0,
      isCorrected: req.body.isCorrected || false,
      correctedAt: req.body.isCorrected ? new Date() : null,
      date: mealDate,
      notes: notes || "",
    });

    return res.status(201).json({ success: true, data: meal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to log meal." });
  }
});

// 3. Get Meals History
router.get("/meals", authRequired, async (req: Request, res: Response) => {
  try {
    const queryDate = req.query.date as string; // Expects YYYY-MM-DD
    const filter: any = { userId: req.user!._id };

    if (queryDate) {
      const start = new Date(queryDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(queryDate);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    const meals = await Meal.find(filter).sort({ date: -1 });
    return res.json({ success: true, data: meals });
  } catch (error: any) {
    return res.json({ success: false, error: error.message });
  }
});

// 4. Update Logged Meal (Correction)
router.put("/meals/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const mealId = req.params.id;
    const { name, calories, protein, carbs, fat, items, notes } = req.body;

    const meal = await Meal.findOne({ _id: mealId, userId: req.user!._id });
    if (!meal) {
      return res.status(404).json({ success: false, error: "Meal log not found." });
    }

    meal.name = name ?? meal.name;
    meal.calories = calories !== undefined ? Number(calories) : meal.calories;
    meal.protein = protein !== undefined ? Number(protein) : meal.protein;
    meal.carbs = carbs !== undefined ? Number(carbs) : meal.carbs;
    meal.fat = fat !== undefined ? Number(fat) : meal.fat;
    meal.items = items ?? meal.items;
    meal.notes = notes ?? meal.notes;
    meal.isCorrected = true;
    meal.correctedAt = new Date();

    await meal.save();
    return res.json({ success: true, data: meal });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to update meal." });
  }
});

// 5. Delete Logged Meal
router.delete("/meals/:id", authRequired, async (req: Request, res: Response) => {
  try {
    const result = await Meal.deleteOne({ _id: req.params.id, userId: req.user!._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Meal log not found." });
    }
    return res.json({ success: true, message: "Meal log deleted." });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get Daily Summary (Macros, Water, Steps)
router.get("/meals/daily-summary", authRequired, async (req: Request, res: Response) => {
  try {
    const queryDate = (req.query.date as string) || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const start = new Date(queryDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(queryDate);
    end.setHours(23, 59, 59, 999);

    // Get daily targets
    const targets = calculateDailyTargets(req.user);

    // Sum logged meals
    const meals = await Meal.find({ userId: req.user!._id, date: { $gte: start, $lte: end } });
    const mealTotals = meals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Find daily logs (water, steps)
    const log = await DailyLog.findOne({ userId: req.user!._id, date: queryDate });

    const totalWater = log ? log.waterIntakeLiters : 0;
    const totalSteps = log ? log.steps : 0;

    const summary = {
      date: queryDate,
      targets: targets ? {
        calories: targets.calorie_target,
        protein: targets.protein_grams,
        water: targets.water_liters,
        steps: targets.steps_goal,
      } : null,
      totals: {
        ...mealTotals,
        water: totalWater,
        steps: totalSteps,
      },
    };

    return res.json({ success: true, data: summary });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Get Weekly Summary
router.get("/meals/weekly-summary", authRequired, async (req: Request, res: Response) => {
  try {
    const results = [];
    const today = new Date();

    // Query 7 days of dates in range
    const startOfRange = new Date();
    startOfRange.setDate(today.getDate() - 6);
    startOfRange.setHours(0, 0, 0, 0);

    const meals = await Meal.find({
      userId: req.user!._id,
      date: { $gte: startOfRange },
    }).lean();

    const dateStrings = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      dateStrings.push(d.toISOString().split("T")[0]);
    }

    const dailyLogs = await DailyLog.find({
      userId: req.user!._id,
      date: { $in: dateStrings },
    }).lean();

    const weightLogs = await WeightLog.find({
      userId: req.user!._id,
      createdAt: { $gte: startOfRange },
    }).sort({ createdAt: 1 }).lean();

    // Map logs in memory
    for (const dateStr of dateStrings) {
      const targetDate = new Date(dateStr);
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateStr);
      end.setHours(23, 59, 59, 999);

      // Sum meals
      const dayMeals = meals.filter(
        (m) => m.date >= start && m.date <= end
      );
      const calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
      const protein = dayMeals.reduce((sum, m) => sum + m.protein, 0);

      // Water & steps
      const dayLog = dailyLogs.find((dl) => dl.date === dateStr);
      const water = dayLog ? dayLog.waterIntakeLiters : 0;
      const steps = dayLog ? dayLog.steps : 0;

      // Weight (take the closest one logged on or before this day, or on this day)
      const dayWeights = weightLogs.filter(
        (wl) => {
          const wlDate = new Date(wl.createdAt);
          return wlDate <= end;
        }
      );
      const weight = dayWeights.length > 0 ? dayWeights[dayWeights.length - 1].weightKg : req.user!.weightKg;

      results.push({
        date: dateStr,
        calories,
        protein,
        water,
        steps,
        weight,
      });
    }

    return res.json({ success: true, data: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Log water or steps
router.post("/daily-log", authRequired, async (req: Request, res: Response) => {
  try {
    const { date, waterIntakeLiters, steps } = req.body;
    const targetDate = date || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const update: any = {};
    if (waterIntakeLiters !== undefined) update.waterIntakeLiters = Number(waterIntakeLiters);
    if (steps !== undefined) update.steps = Number(steps);

    const log = await DailyLog.findOneAndUpdate(
      { userId: req.user!._id, date: targetDate },
      { $set: update },
      { new: true, upsert: true }
    );

    return res.json({ success: true, data: log });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to log daily activities." });
  }
});

// 9. Personalized Meal Recommendations
router.get("/meals/recommendations", authRequired, async (req: Request, res: Response) => {
  try {
    // 1. Get targets and logged totals for today
    const queryDate = new Date().toISOString().split("T")[0];
    const start = new Date(queryDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(queryDate);
    end.setHours(23, 59, 59, 999);

    const targets = calculateDailyTargets(req.user);
    const meals = await Meal.find({ userId: req.user!._id, date: { $gte: start, $lte: end } });
    const caloriesLogged = meals.reduce((sum, m) => sum + m.calories, 0);
    const proteinLogged = meals.reduce((sum, m) => sum + m.protein, 0);

    const remainingCalories = targets ? Math.max(0, targets.calorie_target - caloriesLogged) : 2000;
    const remainingProtein = targets ? Math.max(0, targets.protein_grams - proteinLogged) : 120;

    // 2. Query LLM to generate recommendations
    const userSummary = req.user!.getProfileSummary();
    const prompt = `Based on the user's fitness goal and remaining targets for today, recommend 3 meal or snack options.
Remaining Targets:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein} g

User Profile:
${userSummary}

You must respond with a raw JSON object and nothing else. Do not include markdown code block formatting (such as \`\`\`json ... \`\`\`). The JSON object must match this schema strictly:
{
  "recommendations": [
    {
      "title": "Short title of recommendation (e.g., Post-Workout Berry Shake)",
      "calories": Estimated calories (integer),
      "protein": Estimated protein in grams (integer),
      "carbs": Estimated carbohydrates in grams (integer),
      "fat": Estimated fat in grams (integer),
      "description": "Short description of the food, why it fits, and how to prepare it"
    }
  ]
}`;

    if (!llmService.client) {
      return res.json({
        success: true,
        data: {
          recommendations: [
            {
              title: "High Protein Greek Yogurt Bowl",
              calories: 250,
              protein: 25,
              carbs: 20,
              fat: 3,
              description: "Combine 200g of non-fat Greek yogurt with mixed berries, a dash of honey, and 15g of almonds. Perfect high-protein snack for muscle recovery.",
            },
            {
              title: "Lemon Herb Tuna Salad Lettuce Wraps",
              calories: 320,
              protein: 35,
              carbs: 10,
              fat: 14,
              description: "Mix canned tuna with 1 tbsp olive oil mayonnaise, celery, lemon juice, salt, and pepper. Serve inside large Romaine lettuce leaves.",
            },
          ],
        },
      });
    }

    const response = await llmService.client.chat.completions.create({
      model: env.groqModel,
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI engine");
    }

    const parsed = JSON.parse(content.trim());
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("AI recommendation failed:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to generate recommendations." });
  }
});

export default router;
