import { Router } from "express";
import { User } from "../models/User.js";
import { authRequired, signAuthToken } from "../middleware/auth.js";

const router = Router();
const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;

router.post("/register", async (req, res) => {
  try {
    const { name = "", email = "", password = "", confirm_password = "" } = req.body || {};
    const normalizedEmail = String(email).trim().toLowerCase();
    const errors = [];

    if (String(name).trim().length < 2) errors.push("Name must be at least 2 characters.");
    if (!emailRegex.test(normalizedEmail)) errors.push("Please enter a valid email address.");
    if (String(password).length < 8) errors.push("Password must be at least 8 characters.");
    if (password !== confirm_password) errors.push("Passwords do not match.");

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: "This email is already registered. Please login instead." });
    }

    const user = new User({ email: normalizedEmail, name: String(name).trim() });
    await user.setPassword(password);
    await user.save();

    return res.status(201).json({ success: true, message: "Account created successfully! Please log in." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email = "", password = "" } = req.body || {};
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ success: false, error: "Invalid email or password. Please try again." });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signAuthToken(user._id.toString());
    return res.json({
      success: true,
      token,
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out successfully." });
});

router.get("/me", authRequired, (req, res) => {
  return res.json({ success: true, data: req.user.toSafeObject() });
});

export default router;
