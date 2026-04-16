import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const userSchema = new Schema(
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
    targetWeight: Number,
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active", null],
      default: null,
    },
    dietaryPreferences: String,
    allergies: String,
    medicalConditions: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.checkPassword = async function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash || "");
};

userSchema.methods.getBmi = function getBmi() {
  if (!this.heightCm || !this.weightKg) return null;
  return this.weightKg / ((this.heightCm / 100) ** 2);
};

userSchema.methods.getBmiCategory = function getBmiCategory() {
  const bmi = this.getBmi();
  if (!bmi) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

userSchema.methods.getProfileSummary = function getProfileSummary() {
  const summary = [];
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

export const User = mongoose.model("User", userSchema);
