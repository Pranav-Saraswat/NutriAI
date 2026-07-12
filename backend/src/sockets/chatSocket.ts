import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import { env } from "../config/env.js";
import { User, IUserDocument } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { greetingResponse, isShortGreeting, llmService } from "../services/llmService.js";

interface DecodedToken {
  userId: string;
}

const resolveUser = async (socket: Socket): Promise<IUserDocument | null> => {
  const token = socket.handshake?.auth?.token;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, env.jwtSecret) as DecodedToken;
    return await User.findById(payload.userId);
  } catch {
    return null;
  }
};

export const attachChatSocket = (io: Server): void => {
  io.on("connection", async (socket: Socket) => {
    const user = await resolveUser(socket);
    if (!user) {
      socket.emit("chat_error", { error: "Authentication failed" });
      socket.disconnect(true);
      return;
    }

    socket.on("chat_message", async (data?: { message?: string }) => {
      const userMessage = String(data?.message || "").trim();
      if (!userMessage) return;

      const recent = await ChatMessage.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(env.chatHistoryLimit)
        .lean();

      const chatHistory = recent.reverse().map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));
      chatHistory.push({ role: "user", content: userMessage });

      await ChatMessage.create({ userId: user._id, role: "user", content: userMessage });

      if (isShortGreeting(userMessage)) {
        socket.emit("chat_status", { status: "typing" });
        socket.emit("chat_token", { token: greetingResponse });
        await ChatMessage.create({ userId: user._id, role: "assistant", content: greetingResponse });
        socket.emit("chat_status", { status: "done" });
        return;
      }

      socket.emit("chat_status", { status: "typing" });

      const result = await llmService.chatStream(
        userMessage,
        user.getProfileSummary(),
        chatHistory,
        (token: string) => socket.emit("chat_token", { token })
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
