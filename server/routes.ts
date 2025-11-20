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
    // Security: Verify admin session before issuing signed URL
    // Note: This validates admin session and file metadata (type/size) but the presigned URL
    // itself cannot enforce these constraints on the actual upload. For production use,
    // consider server-mediated uploads or signed URLs with content-type/length constraints.
    // For MVP with trusted admins, this provides reasonable protection.
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const uploadSchema = z.object({
        filename: z.string().min(1),
        contentType: z.string().regex(/^image\/(png|jpeg|jpg|gif|svg\+xml|webp)$/i),
        size: z.number().max(5 * 1024 * 1024), // 5MB max
      });

      const validation = uploadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid file. Must be an image (PNG, JPEG, GIF, SVG, WebP) under 5MB" 
        });
      }

      const { filename } = validation.data;
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
    // Security: Verify admin session
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const uploadSchema = z.object({
        filename: z.string().min(1),
        contentType: z.string().regex(/^image\/(x-icon|png|jpeg|jpg|vnd\.microsoft\.icon)$/i),
        size: z.number().max(1 * 1024 * 1024), // 1MB max
      });

      const validation = uploadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid file. Must be an icon or image (ICO, PNG, JPEG) under 1MB" 
        });
      }

      const { filename } = validation.data;
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

  // ==================== GEOCODING ENDPOINTS ====================
  
  // Simple in-memory cache for geocoding results
  const geocodeCache = new Map<string, { address: string, timestamp: number }>();
  const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Reverse geocode coordinates to address
  app.get("/api/geocode/reverse", async (req: Request, res: Response) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    try {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      // Round coordinates to 5 decimal places for cache key (~1 meter precision)
      const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

      // Check cache
      const cached = geocodeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GEOCODE_CACHE_TTL) {
        return res.json({ 
          coordinates: `${latitude}, ${longitude}`,
          address: cached.address,
          cached: true
        });
      }

      // Call Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NexaHR HRMS App'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const data = await response.json();
      const address = data.display_name || `${latitude}, ${longitude}`;

      // Cache the result
      geocodeCache.set(cacheKey, { address, timestamp: Date.now() });

      res.json({ 
        coordinates: `${latitude}, ${longitude}`,
        address,
        cached: false
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ 
        message: "Failed to geocode coordinates",
        coordinates: `${lat}, ${lon}`
      });
    }
  });

  // ==================== ATTENDANCE ENDPOINTS ====================
  
  // Clock in (supports multiple clock-ins per day)
  app.post("/api/attendance/clock-in", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const { photoUrl, latitude, longitude, override } = req.body;
      
      // Get all records for today to check for recent clock-ins
      const todayRecords = await storage.getAttendanceRecordsByUserAndDateRange(userId, date, date);
      
      // Check if there's a recent clock-in (within 5 minutes) and user hasn't confirmed override
      if (!override) {
        const recentClockIn = todayRecords.find(record => {
          const clockInTime = new Date(record.clockInTime);
          const diffMinutes = (now.getTime() - clockInTime.getTime()) / (1000 * 60);
          return diffMinutes < 5;
        });
        
        if (recentClockIn) {
          return res.status(400).json({ 
            message: "You clocked in less than 5 minutes ago. Do you want to continue?",
            requiresConfirmation: true
          });
        }
      }

      // Create new attendance record (allows multiple per day)
      const record = await storage.createAttendanceRecord({
        userId,
        date,
        clockInTime: now,
        clockOutTime: null,
        photoUrl: photoUrl || null,
        latitude: latitude || null,
        longitude: longitude || null,
      });

      res.json({ success: true, record });
    } catch (error) {
      console.error("Clock in error:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Clock out (clocks out the most recent uncompleted record)
  app.post("/api/attendance/clock-out", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get all today's records
      const todayRecords = await storage.getAttendanceRecordsByUserAndDateRange(userId, date, date);
      
      // Find the most recent record without clock-out time
      const openRecord = todayRecords
        .filter(r => !r.clockOutTime)
        .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())[0];
      
      if (!openRecord) {
        return res.status(400).json({ message: "No active clock-in found. Please clock in first." });
      }

      // Update with clock out time
      const updated = await storage.updateAttendanceRecord(openRecord.id, {
        clockOutTime: now,
      });

      res.json({ success: true, record: updated });
    } catch (error) {
      console.error("Clock out error:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get today's attendance records (returns all records for today)
  app.get("/api/attendance/today", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const records = await storage.getAttendanceRecordsByUserAndDateRange(userId, date, date);
      res.json({ records });
    } catch (error) {
      console.error("Get today attendance error:", error);
      res.status(500).json({ message: "Failed to get attendance records" });
    }
  });

  // Get attendance records with date range
  app.get("/api/attendance/records", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      
      // Default to current month if no dates provided
      const now = new Date();
      const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const defaultEndDate = now.toISOString().split('T')[0];
      
      const records = await storage.getAttendanceRecordsByUserAndDateRange(
        userId,
        startDate || defaultStartDate,
        endDate || defaultEndDate
      );
      
      res.json({ records });
    } catch (error) {
      console.error("Get attendance records error:", error);
      res.status(500).json({ message: "Failed to get attendance records" });
    }
  });

  // Admin: Get all users' attendance records
  app.get("/api/admin/attendance/records", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      
      // Default to current month if no dates provided
      const now = new Date();
      const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const defaultEndDate = now.toISOString().split('T')[0];
      
      const records = await storage.getAllUsersAttendanceByDateRange(
        startDate || defaultStartDate,
        endDate || defaultEndDate
      );
      
      res.json({ records });
    } catch (error) {
      console.error("Get all attendance records error:", error);
      res.status(500).json({ message: "Failed to get attendance records" });
    }
  });

  // Admin: Update attendance buffer settings
  app.put("/api/admin/attendance/buffer", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const schema = z.object({
        attendanceBufferMinutes: z.number().min(0).max(120), // Max 2 hours buffer
      });

      const { attendanceBufferMinutes } = schema.parse(req.body);
      const updatedSettings = await storage.updateCompanySettings({ attendanceBufferMinutes });
      
      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      console.error("Update attendance buffer error:", error);
      res.status(500).json({ message: "Failed to update attendance buffer" });
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
