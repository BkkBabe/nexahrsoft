import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { registerUserSchema, loginUserSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: "nexaadmin",
  password: "nexa123!",
};

// Default user credentials (for development/testing)
const DEFAULT_USER = {
  username: "nexauser",
  password: "nexa123!",
  email: "nexauser@nexahr.com",
  name: "Nexa User",
  mobileNumber: "+1234567890",
};

// Seed default user (call this on server startup)
async function seedDefaultUser() {
  try {
    // Check if default user already exists
    const existingUser = await storage.getUserByUsername(DEFAULT_USER.username);
    if (!existingUser) {
      console.log("Seeding default user...");
      const passwordHash = await bcrypt.hash(DEFAULT_USER.password, 10);
      await storage.createUser({
        username: DEFAULT_USER.username,
        email: DEFAULT_USER.email,
        name: DEFAULT_USER.name,
        passwordHash,
        mobileNumber: DEFAULT_USER.mobileNumber,
        role: "user",
        isApproved: true, // Default user is pre-approved
      });
      console.log("Default user created successfully!");
    }
  } catch (error) {
    console.error("Error seeding default user:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed default user on startup
  await seedDefaultUser();

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
    // Debug logging
    console.log('Session check:', {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userId: req.session?.userId,
      cookie: req.session?.cookie,
    });

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

  // User registration endpoint (with password)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      const { name, username, email, password, mobileNumber } = validatedData;

      // Check if user already exists
      const existingUser = await storage.getUserByEmailOrUsername(email, username);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email or username already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user (pending approval)
      const user = await storage.createUser({
        email,
        username,
        name,
        passwordHash,
        mobileNumber,
        authId: null,
        role: "user",
        isApproved: false,
      });

      // Do NOT set session for unapproved users - they must wait for admin approval
      // Only set session if user is pre-approved (shouldn't happen in normal registration)
      if (user.isApproved) {
        req.session.userId = user.id;
        req.session.isAdmin = false;
      }

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          name: user.name, 
          isApproved: user.isApproved 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      const { usernameOrEmail, password } = validatedData;

      // Find user by username or email
      const user = await storage.getUserByEmailOrUsername(usernameOrEmail, usernameOrEmail);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is approved BEFORE setting session
      if (!user.isApproved) {
        // Do NOT set session for unapproved users
        return res.status(403).json({ message: "Account pending approval" });
      }

      // Only set session for approved users
      req.session.userId = user.id;
      req.session.isAdmin = false;

      // Debug logging
      console.log('Login successful, session created:', {
        userId: req.session.userId,
        sessionId: req.sessionID,
        cookie: req.session.cookie,
        headers: req.headers,
      });

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email,
          username: user.username, 
          name: user.name,
          isApproved: user.isApproved 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Google OAuth login route (using Replit Auth)
  app.get("/api/login", (req, res) => {
    // This will be handled by Replit Auth in future implementation
    // For now, redirect to Google OAuth placeholder
    res.redirect("https://replit.com/oidc");
  });

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

  // Company settings routes
  app.get("/api/company/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (error) {
      console.error("Get company settings error:", error);
      res.status(500).json({ message: "Failed to get company settings" });
    }
  });

  // Get upload URL for logo (admin only)
  app.post("/api/company/upload-logo", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURLForPublicAsset(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Get logo upload URL error:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Get upload URL for favicon (admin only)
  app.post("/api/company/upload-favicon", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURLForPublicAsset(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Get favicon upload URL error:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Update company settings (admin only)
  app.put("/api/company/settings", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { logoUrl, faviconUrl, companyName } = req.body;
      const objectStorageService = new ObjectStorageService();
      
      const updates: any = {};
      if (companyName) updates.companyName = companyName;
      if (logoUrl) {
        updates.logoUrl = objectStorageService.normalizePublicAssetPath(logoUrl);
      }
      if (faviconUrl) {
        updates.faviconUrl = objectStorageService.normalizePublicAssetPath(faviconUrl);
      }

      const updatedSettings = await storage.updateCompanySettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update company settings error:", error);
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
