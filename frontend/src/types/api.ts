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

export interface WeightLog {
  id: string;
  weight_kg: number;
  created_at: string;
}

export interface AuthPayload {
  token: string;
  data: {
    user: UserProfile;
  };
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  confidence: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string | null;
  items: FoodItem[];
  confidenceScore: number;
  isCorrected: boolean;
  correctedAt?: string | null;
  date: string;
  notes?: string;
}

export interface DailySummary {
  date: string;
  targets: {
    calories: number;
    protein: number;
    water: number;
    steps: number;
  } | null;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
    steps: number;
  };
}

export interface WeeklyDayLog {
  date: string;
  calories: number;
  protein: number;
  water: number;
  steps: number;
  weight?: number;
}

export interface RecommendationItem {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

export interface RecommendationsResponse {
  recommendations: RecommendationItem[];
}

