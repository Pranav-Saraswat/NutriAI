import mongoose, { Document, Schema } from "mongoose";

export interface IFoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
  confidence: number;
}

export interface IMeal {
  userId: mongoose.Types.ObjectId;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string | null;
  items: IFoodItem[];
  confidenceScore: number;
  isCorrected: boolean;
  correctedAt?: Date | null;
  date: Date;
  notes?: string;
}

export interface IMealDocument extends Document, Omit<IMeal, "date"> {
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const foodItemSchema = new Schema<IFoodItem>({
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },
  portionSize: { type: String, required: true },
  confidence: { type: Number, required: true },
});

const mealSchema = new Schema<IMealDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    imageUrl: { type: String, default: null },
    items: { type: [foodItemSchema], default: [] },
    confidenceScore: { type: Number, default: 1.0 },
    isCorrected: { type: Boolean, default: false },
    correctedAt: { type: Date, default: null },
    date: { type: Date, required: true, default: Date.now, index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

mealSchema.index({ userId: 1, date: -1 });

export const Meal = mongoose.model<IMealDocument>("Meal", mealSchema);
