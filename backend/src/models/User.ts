import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
  email: string;
  passwordHash: string;
  name: string;
  age?: number;
  gender?: "male" | "female" | "other" | null;
  heightCm?: number;
  weightKg?: number;
  goalType?: "weight_loss" | "muscle_gain" | "maintain" | "improve_health" | null;
  targetWeight?: number | null;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  dietaryPreferences?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  role: "user" | "admin";
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document, Omit<IUser, "createdAt" | "updatedAt"> {
  _id: mongoose.Types.ObjectId;
  setPassword(password: string): Promise<void>;
  checkPassword(password: string): Promise<boolean>;
  getBmi(): number | null;
  getBmiCategory(): string | null;
  getProfileSummary(): string;
  toSafeObject(): {
    id: string;
    email: string;
    role: "user" | "admin";
    name: string;
    age?: number;
    gender: "male" | "female" | "other" | null;
    height_cm?: number;
    weight_kg?: number;
    goal_type?: "weight_loss" | "muscle_gain" | "maintain" | "improve_health" | null;
    target_weight?: number | null;
    activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
    dietary_preferences?: string | null;
    allergies?: string | null;
    medical_conditions?: string | null;
    bmi: number | null;
    bmi_category: string | null;
    created_at: Date;
    last_login?: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    age: Number,
    gender: { type: String, enum: ["male", "female", "other", null], default: null },
    heightCm: Number,
    weightKg: Number,
    goalType: {
      type: String,
      enum: ["weight_loss", "muscle_gain", "maintain", "improve_health", null],
      default: null,
    },
    targetWeight: { type: Number, default: null },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active", null],
      default: null,
    },
    dietaryPreferences: { type: String, default: null },
    allergies: { type: String, default: null },
    medicalConditions: { type: String, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password: string): Promise<void> {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.checkPassword = async function checkPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash || "");
};

userSchema.methods.getBmi = function getBmi(): number | null {
  if (!this.heightCm || !this.weightKg) return null;
  return this.weightKg / ((this.heightCm / 100) ** 2);
};

userSchema.methods.getBmiCategory = function getBmiCategory(): string | null {
  const bmi = this.getBmi();
  if (!bmi) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

userSchema.methods.getProfileSummary = function getProfileSummary(): string {
  const summary: string[] = [];
  if (this.name) summary.push(`Name: ${this.name}`);
  if (this.age) summary.push(`Age: ${this.age} years old`);
  if (this.gender) summary.push(`Gender: ${this.gender}`);
  if (this.heightCm && this.weightKg) {
    const bmi = this.getBmi();
    summary.push(`Height: ${this.heightCm}cm | Weight: ${this.weightKg}kg | BMI: ${bmi?.toFixed(1)} (${this.getBmiCategory()})`);
  }
  if (this.goalType) summary.push(`Goal: ${this.goalType}`);
  if (this.targetWeight) summary.push(`Target Weight: ${this.targetWeight}kg`);
  if (this.activityLevel) summary.push(`Activity Level: ${this.activityLevel}`);
  if (this.dietaryPreferences) summary.push(`Diet: ${this.dietaryPreferences}`);
  if (this.allergies) summary.push(`Allergies: ${this.allergies}`);
  if (this.medicalConditions) summary.push(`Medical Conditions: ${this.medicalConditions}`);
  return summary.length ? summary.join("\n") : "Profile incomplete.";
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const bmi = this.getBmi();
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    name: this.name,
    age: this.age,
    gender: this.gender,
    height_cm: this.heightCm,
    weight_kg: this.weightKg,
    goal_type: this.goalType,
    target_weight: this.targetWeight,
    activity_level: this.activityLevel,
    dietary_preferences: this.dietaryPreferences,
    allergies: this.allergies,
    medical_conditions: this.medicalConditions,
    bmi,
    bmi_category: this.getBmiCategory(),
    created_at: this.createdAt,
    last_login: this.lastLogin,
  };
};

export const User = mongoose.model<IUserDocument>("User", userSchema);
