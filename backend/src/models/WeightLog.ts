import mongoose, { Document, Schema } from "mongoose";

export interface IWeightLog {
  userId: mongoose.Types.ObjectId;
  weightKg: number;
  createdAt: Date;
}

export interface IWeightLogDocument extends Document, Omit<IWeightLog, "createdAt"> {
  createdAt: Date;
}

const weightLogSchema = new Schema<IWeightLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weightKg: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

weightLogSchema.index({ userId: 1, createdAt: -1 });

export const WeightLog = mongoose.model<IWeightLogDocument>("WeightLog", weightLogSchema);
