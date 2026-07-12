import mongoose, { Document, Schema } from "mongoose";

export interface IDailyLog {
  userId: mongoose.Types.ObjectId;
  date: string; // Format: YYYY-MM-DD
  waterIntakeLiters: number;
  steps: number;
}

export interface IDailyLogDocument extends Document, IDailyLog {
  createdAt: Date;
  updatedAt: Date;
}

const dailyLogSchema = new Schema<IDailyLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    waterIntakeLiters: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Ensure unique log per user per day
dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyLog = mongoose.model<IDailyLogDocument>("DailyLog", dailyLogSchema);
