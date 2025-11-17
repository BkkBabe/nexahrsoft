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

  const httpServer = createServer(app);

  return httpServer;
}
