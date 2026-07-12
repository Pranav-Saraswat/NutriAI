import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage {
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IChatMessageDocument extends Document, Omit<IChatMessage, "createdAt"> {
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ userId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessageDocument>("ChatMessage", chatMessageSchema);
