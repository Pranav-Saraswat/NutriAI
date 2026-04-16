export interface DailyTargets {
  maintenance_calories: number;
  calorie_target: number;
  protein_grams: number;
  water_liters: number;
  steps_goal: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "user" | "admin";
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_type: "weight_loss" | "muscle_gain" | "maintain" | "improve_health" | null;
  target_weight: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  dietary_preferences: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  bmi: number | null;
  bmi_category: string | null;
  created_at: string;
  last_login: string | null;
  daily_targets?: DailyTargets;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface AuthPayload {
  token: string;
  data: {
    user: UserProfile;
  };
}
