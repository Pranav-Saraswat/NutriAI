export const calculateDailyTargets = (user) => {
  if (!user || !user.age || !user.heightCm || !user.weightKg || !user.gender) {
    return null;
  }

  const bmr = user.gender === "male"
    ? 10 * user.weightKg + 6.25 * user.heightCm - 5 * user.age + 5
    : 10 * user.weightKg + 6.25 * user.heightCm - 5 * user.age - 161;

  const activityMultiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[user.activityLevel] || 1.2;

  const maintenanceCalories = Math.round(bmr * activityMultiplier);
  let calorieTarget = maintenanceCalories;
  if (user.goalType === "weight_loss") calorieTarget -= 400;
  if (user.goalType === "muscle_gain") calorieTarget += 250;

  const proteinMultiplier = {
    weight_loss: 1.8,
    muscle_gain: 2.0,
    maintain: 1.6,
    improve_health: 1.5,
  }[user.goalType] || 1.6;

  return {
    maintenance_calories: maintenanceCalories,
    calorie_target: Math.max(calorieTarget, 1200),
    protein_grams: Math.round(user.weightKg * proteinMultiplier),
    water_liters: Number(Math.max(2.0, user.weightKg * 0.033).toFixed(1)),
    steps_goal: user.goalType === "weight_loss" ? 10000 : 8000,
  };
};
