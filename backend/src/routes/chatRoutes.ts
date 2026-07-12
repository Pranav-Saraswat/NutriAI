import { Router, Request, Response } from "express";
import { authRequired } from "../middleware/auth.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { env } from "../config/env.js";
import { greetingResponse, isShortGreeting, llmService } from "../services/llmService.js";

const router = Router();

router.post("/chat", authRequired, async (req: Request, res: Response) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    if (!userMessage) {
      return res.status(400).json({ success: false, error: "Empty message" });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const recent = await ChatMessage.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(env.chatHistoryLimit)
      .lean();

    const chatHistory = recent.reverse().map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));
    chatHistory.push({ role: "user", content: userMessage });

    await ChatMessage.create({ userId: req.user._id, role: "user", content: userMessage });

    if (isShortGreeting(userMessage)) {
      await ChatMessage.create({ userId: req.user._id, role: "assistant", content: greetingResponse });
      return res.json({ success: true, response: greetingResponse });
    }

    const result = await llmService.chat(userMessage, req.user.getProfileSummary(), chatHistory);

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || "AI service unavailable" });
    }

    await ChatMessage.create({ userId: req.user._id, role: "assistant", content: result.response });

    return res.json({ success: true, response: result.response });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Something went wrong while processing your message." });
  }
});

router.delete("/chat-history", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  await ChatMessage.deleteMany({ userId: req.user._id });
  return res.json({ success: true, message: "Chat history cleared" });
});

router.get("/chat-history", authRequired, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const messages = await ChatMessage.find({ userId: req.user._id })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  return res.json({
    success: true,
    data: messages.map((msg) => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt,
    })),
  });
});

export default router;
