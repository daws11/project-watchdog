import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { db } from "../db";
import { users } from "../db/schema";
import { and, eq } from "drizzle-orm";

export interface JwtPayload {
  userId: number;
  email: string;
  role: "admin" | "regular";
}

export interface AuthenticatedUser extends JwtPayload {
  sectionPermissions: string[];
  assignedPeopleIds: string[];
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!env.JWT_SECRET) {
      console.error("[Auth] JWT_SECRET not configured");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, payload.userId), eq(users.active, true)),
      });

      if (!user) {
        res.status(401).json({ error: "Unauthorized: User not found or deactivated" });
        return;
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role as "admin" | "regular",
        sectionPermissions: user.sectionPermissions,
        assignedPeopleIds: user.assignedPeopleIds,
      };
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: "Unauthorized: Token expired" });
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: "Unauthorized: Invalid token" });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("[Auth] Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Middleware to require specific role
 */
export const requireRole =
  (requiredRole: "admin" | "regular") =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Not authenticated" });
      return;
    }

    // Admins can access everything
    if (req.user.role === "admin") {
      next();
      return;
    }

    // Check if user has required role
    if (req.user.role !== requiredRole) {
      res.status(403).json({
        error: `Forbidden: ${requiredRole} role required`,
      });
      return;
    }

    next();
  };

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole("admin");

export const authorizeSection =
  (section: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Not authenticated" });
      return;
    }

    if (req.user.role === "admin") {
      next();
      return;
    }

    if (!req.user.sectionPermissions.includes(section)) {
      res.status(403).json({ error: `Forbidden: Missing ${section} access` });
      return;
    }

    next();
  };
