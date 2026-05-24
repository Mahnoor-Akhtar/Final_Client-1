import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { User, UserRole, Student, Teacher } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { randomUUID } from "crypto";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecure_college_cms_secret_key_12345";

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.redirect(`http://localhost:5173/app?token=${token}`);
  }
);

// Register
router.post("/register", async (req, res) => {
  const { password, options } = req.body;
  const email = req.body.email ? req.body.email.toLowerCase().trim() : "";

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: { message: "User already exists" } });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const fullName = options?.data?.full_name || email.split("@")[0];

    const newUser = await User.create({
      email,
      password: hashedPassword,
      raw_user_meta_data: { full_name: fullName },
    });

    // Auto-detect role based on email
    let role = "student";
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.endsWith("@admin.com") || lowerEmail.includes("admin")) {
      role = "admin";
    } else if (lowerEmail.endsWith("@teacher.com") || lowerEmail.includes("teacher")) {
      role = "teacher";
    }

    // Create UserRole record
    await UserRole.create({
      user_id: newUser._id,
      role,
    });

    // Create student/teacher profile
    const profileDetails = options?.data || {};
    if (role === "student") {
      await Student.create({
        user_id: newUser._id,
        roll_number: profileDetails.roll_number || ("ROLL-" + Math.floor(1000 + Math.random() * 9000)),
        full_name: fullName,
        email: email,
        department_id: profileDetails.department_id || "dept-cs",
        degree: profileDetails.degree || "BSCS",
        semester: Number(profileDetails.semester) || 1,
      });
      console.log(`Auto-created Student profile during registration for: ${email}`);
    } else if (role === "teacher") {
      await Teacher.create({
        user_id: newUser._id,
        employee_id: profileDetails.employee_id || ("EMP-" + Math.floor(1000 + Math.random() * 9000)),
        full_name: fullName,
        email: email,
        department_id: profileDetails.department_id || "dept-cs",
        qualification: profileDetails.qualification || "MS CS",
        salary: 80000,
      });
      console.log(`Auto-created Teacher profile during registration for: ${email}`);
    }

    // Create session token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userPayload = {
      id: newUser._id,
      email: newUser.email,
      raw_user_meta_data: newUser.raw_user_meta_data,
    };

    const sessionPayload = {
      access_token: token,
      token_type: "bearer",
      expires_in: 604800,
      user: {
        id: newUser._id,
        aud: "authenticated",
        role: "authenticated",
        email: newUser.email,
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        user_metadata: newUser.raw_user_meta_data,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt,
      },
    };

    return res.status(200).json({
      data: {
        user: userPayload,
        session: sessionPayload,
      },
      error: null,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: { message: error.message } });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { password } = req.body;
  const email = req.body.email ? req.body.email.toLowerCase().trim() : "";

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: { message: "User does not exist. Please register first." } });
    }

    // User exists, verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: { message: "Invalid credentials" } });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const sessionPayload = {
      access_token: token,
      token_type: "bearer",
      expires_in: 604800,
      user: {
        id: user._id,
        aud: "authenticated",
        role: "authenticated",
        email: user.email,
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        user_metadata: user.raw_user_meta_data,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    };

    return res.status(200).json({
      data: {
        session: sessionPayload,
        user: {
          id: user._id,
          email: user.email,
          raw_user_meta_data: user.raw_user_meta_data,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: { message: error.message } });
  }
});

// Logout
router.post("/logout", (req, res) => {
  return res.status(200).json({ error: null });
});

// Change password (authenticated)
router.post("/change-password", requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: { message: "Both old and new passwords are required" } });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: { message: "New password must be at least 6 characters" } });
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: { message: "User not found" } });
    if (!user.password) {
      return res.status(400).json({ error: { message: "Password change not available for this account" } });
    }
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ error: { message: "Current password is incorrect" } });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await User.updateMany({ id: req.user.id }, { $set: { password: hashed } });
    return res.status(200).json({ error: null, data: { ok: true } });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { newPassword } = req.body;
  const email = req.body.email ? req.body.email.toLowerCase().trim() : "";
  if (!email || !newPassword) {
    return res.status(400).json({ error: { message: "Email and new password are required" } });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: { message: "New password must be at least 6 characters" } });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: { message: "User with this email does not exist" } });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updateMany({ email: email.toLowerCase() }, { $set: { password: hashedPassword } });
    return res.status(200).json({ error: null, data: { ok: true } });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

// Me (Get Current User Session)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
