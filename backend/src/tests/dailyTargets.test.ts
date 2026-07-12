import { calculateDailyTargets, ITargetUser } from "../utils/dailyTargets.js";

describe("Daily Targets Calculation", () => {
  it("should return null if any required user attribute is missing", () => {
    const incompleteUser: ITargetUser = {
      age: 25,
      gender: "male",
      heightCm: 180,
      // weightKg is missing
      activityLevel: "moderate",
      goalType: "muscle_gain",
    };
    expect(calculateDailyTargets(incompleteUser)).toBeNull();
  });

  it("should calculate correct targets for a sedentary male on muscle gain", () => {
    const user: ITargetUser = {
      age: 30,
      gender: "male",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "sedentary",
      goalType: "muscle_gain",
    };
    // BMR = 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // Maintenance = 1780 * 1.2 = 2136
    // Calorie Target = 2136 + 250 = 2386
    // Protein Target = 80 * 2.0 = 160g
    // Water Target = Max(2.0, 80 * 0.033) = Max(2.0, 2.64) = 2.6L
    // Steps Target = 8000
    const targets = calculateDailyTargets(user);
    expect(targets).not.toBeNull();
    expect(targets?.maintenance_calories).toBe(2136);
    expect(targets?.calorie_target).toBe(2386);
    expect(targets?.protein_grams).toBe(160);
    expect(targets?.water_liters).toBe(2.6);
    expect(targets?.steps_goal).toBe(8000);
  });

  it("should calculate correct targets for an active female on weight loss", () => {
    const user: ITargetUser = {
      age: 25,
      gender: "female",
      heightCm: 165,
      weightKg: 65,
      activityLevel: "active",
      goalType: "weight_loss",
    };
    // BMR = 10 * 65 + 6.25 * 165 - 5 * 25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25 (approx 1395)
    // Maintenance = 1395 * 1.725 = 2406
    // Calorie Target = 2406 - 400 = 2006
    // Protein Target = 65 * 1.8 = 117g
    // Water Target = Max(2.0, 65 * 0.033) = Max(2.0, 2.145) = 2.1L
    // Steps Target = 10000
    const targets = calculateDailyTargets(user);
    expect(targets).not.toBeNull();
    expect(targets?.calorie_target).toBe(2007);
    expect(targets?.protein_grams).toBe(117);
    expect(targets?.water_liters).toBe(2.1);
    expect(targets?.steps_goal).toBe(10000);
  });
});
