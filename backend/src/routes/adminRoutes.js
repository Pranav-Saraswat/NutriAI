import { Router } from "express";
import { authRequired, adminRequired } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";

const router = Router();

router.get("/admin/dashboard", authRequired, adminRequired, async (_req, res) => {
  const [totalUsers, totalMessages] = await Promise.all([
    User.countDocuments({}),
    ChatMessage.countDocuments({}),
  ]);

  return res.json({
    success: true,
    data: {
      total_users: totalUsers,
      total_messages: totalMessages,
      db_available: true,
    },
  });
});

export default router;
