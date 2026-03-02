import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { env } from "../config/env";
import type { JwtPayload } from "../middleware/auth";
import { authenticate } from "../middleware/auth";

const router = Router();

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d"; // 7 days

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// POST /api/auth/login — authenticate and return JWT
router.post("/login", async (req, res) => {
  try {
    const body = req.body as Partial<LoginRequest>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.active) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!env.JWT_SECRET) {
      console.error("[Auth] JWT_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Generate JWT
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as "admin" | "regular",
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    console.log(`[Auth] User logged in: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/register — create new user (first user or admin-only)
router.post("/register", async (req, res) => {
  try {
    const body = req.body as Partial<RegisterRequest>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check if any users exist
    const userCount = await db.select().from(users);
    const isFirstUser = userCount.length === 0;

    // If not first user, require authentication
    if (!isFirstUser) {
      return res.status(403).json({ error: "Registration is restricted. Contact an administrator." });
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user (first user is admin)
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: isFirstUser ? "admin" : "regular",
        sectionPermissions: isFirstUser 
          ? ["dashboard", "people", "tasks", "sources", "processing", "settings", "reports"]
          : ["dashboard", "people", "tasks", "sources", "reports"],
        assignedPeopleIds: [],
        active: true,
      })
      .returning();

    if (!env.JWT_SECRET) {
      console.error("[Auth] JWT_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Generate JWT
    const payload: JwtPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as "admin" | "regular",
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    console.log(`[Auth] New user registered: ${newUser.email} (${newUser.role})`);

    res.status(201).json({
      token,
      user: {
        id: newUser.id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /api/auth/me — get current user profile
router.get("/me", authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      sectionPermissions: user.sectionPermissions,
      assignedPeopleIds: user.assignedPeopleIds,
    });
  } catch (error) {
    console.error("[Auth] Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// POST /api/auth/refresh — refresh JWT token
router.post("/refresh", authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!env.JWT_SECRET) {
      console.error("[Auth] JWT_SECRET not configured");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Generate new JWT with latest role from auth middleware
    const token = jwt.sign(
      {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      } satisfies JwtPayload,
      env.JWT_SECRET,
      {
      expiresIn: JWT_EXPIRES_IN,
      },
    );

    res.json({ token });
  } catch (error) {
    console.error("[Auth] Token refresh error:", error);
    res.status(500).json({ error: "Token refresh failed" });
  }
});

export { router as authRouter };
