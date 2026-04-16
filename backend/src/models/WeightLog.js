import mongoose from "mongoose";

const { Schema } = mongoose;

const weightLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weightKg: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

weightLogSchema.index({ userId: 1, createdAt: -1 });

export const WeightLog = mongoose.model("WeightLog", weightLogSchema);
