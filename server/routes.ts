import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: "nexaadmin",
  password: "nexa123!",
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        username: z.string(),
        password: z.string(),
      });

      const { username, password } = schema.parse(req.body);

      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.userId = "admin";
        req.session.isAdmin = true;
        return res.json({ success: true, message: "Admin login successful" });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      return res.status(400).json({ message: "Invalid request" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Get current session
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    if (req.session.userId) {
      if (req.session.isAdmin) {
        return res.json({
          authenticated: true,
          isAdmin: true,
          user: { id: "admin", name: "Admin", email: "admin@nexahr.com" },
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({
          authenticated: true,
          isAdmin: false,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isApproved: user.isApproved,
          },
        });
      }
    }

    return res.json({ authenticated: false });
  });

  // User logout
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // User registration endpoint (for email-based signup)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      });

      const { email, name } = schema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create new user (pending approval)
      const user = await storage.createUser({
        email,
        name,
        authId: null,
        role: "user",
        isApproved: false,
      });

      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = false;

      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, isApproved: user.isApproved } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // TODO: Add Google OAuth login routes
  // This will be implemented later using openid-client v6 or passport-google-oauth20

  // Admin middleware - check if user is admin
  const requireAdmin = (req: Request, res: Response, next: any) => {
    if (!req.session.isAdmin) {
      return res.status(403).json({ message: "Unauthorized - Admin access required" });
    }
    next();
  };

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Approve user (admin only)
  app.post("/api/admin/users/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await storage.approveUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error("Approve user error:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
