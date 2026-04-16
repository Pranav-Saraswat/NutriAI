import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { llmService } from "../services/llmService.js";

const resolveUser = async (socket) => {
  const token = socket.handshake?.auth?.token;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return User.findById(payload.userId);
  } catch {
    return null;
  }
};

export const attachChatSocket = (io) => {
  io.on("connection", async (socket) => {
    const user = await resolveUser(socket);
    if (!user) {
      socket.emit("chat_error", { error: "Authentication failed" });
      socket.disconnect(true);
      return;
    }

    socket.on("chat_message", async (data) => {
      const userMessage = String(data?.message || "").trim();
      if (!userMessage) return;

      const recent = await ChatMessage.find({ userId: user._id }).sort({ createdAt: -1 }).limit(15).lean();
      const chatHistory = recent.reverse().map((msg) => ({ role: msg.role, content: msg.content }));
      chatHistory.push({ role: "user", content: userMessage });

      await ChatMessage.create({ userId: user._id, role: "user", content: userMessage });
      socket.emit("chat_status", { status: "typing" });

      const result = await llmService.chatStream(
        userMessage,
        user.getProfileSummary(),
        chatHistory,
        (token) => socket.emit("chat_token", { token })
      );

      if (!result.success) {
        socket.emit("chat_error", { error: result.error || "AI service unavailable" });
        return;
      }

      await ChatMessage.create({ userId: user._id, role: "assistant", content: result.response });
      socket.emit("chat_status", { status: "done" });
    });
  });
};
