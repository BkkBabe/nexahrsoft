import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { registerUserSchema, loginUserSchema } from "@shared/schema";
import { ObjectStorageService } from "./objectStorage";
import { Resend } from "resend";

// Initialize Resend email client
const resend = process.env.RESEND_API ? new Resend(process.env.RESEND_API) : null;

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: "nexaadmin",
  password: "nexa123!",
};

// Generate temporary password for welcome emails
function generateTempPassword(employeeCode: string): string {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${employeeCode}@${randomPart}`;
}

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

      // First check hardcoded master admin credentials
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        req.session.userId = "admin";
        req.session.isAdmin = true;
        return res.json({ success: true, message: "Admin login successful" });
      }

      // Then check database users with role='admin'
      const user = await storage.getUserByUsername(username);
      
      // If user exists but is not an admin, reject with helpful message
      if (user && user.role !== "admin") {
        return res.status(403).json({ message: "Please use the Employee Login page to access your account" });
      }
      
      if (user && user.role === "admin" && user.isApproved) {
        // Security: Only allow login if user has a valid password hash
        if (!user.passwordHash) {
          console.log(`Admin login rejected: User ${username} has no password set`);
          return res.status(401).json({ message: "Invalid credentials" });
        }
        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (passwordValid) {
          req.session.userId = user.id;
          req.session.isAdmin = true;
          return res.json({ success: true, message: "Admin login successful" });
        }
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
        // Check if it's the master admin or a database admin user
        if (req.session.userId === "admin") {
          return res.json({
            authenticated: true,
            isAdmin: true,
            user: { id: "admin", name: "Admin", email: "admin@nexahr.com" },
          });
        }
        // Database admin user
        const adminUser = await storage.getUser(req.session.userId);
        if (adminUser) {
          return res.json({
            authenticated: true,
            isAdmin: true,
            user: {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
            },
          });
        }
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
            mustChangePassword: user.mustChangePassword || false,
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

  // Change password endpoint (for first-time login or voluntary change)
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const schema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }).refine((data) => data.currentPassword !== data.newPassword, {
        message: "New password must be different from current password",
        path: ["newPassword"],
      });

      const { currentPassword, newPassword } = schema.parse(req.body);

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update user
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      });

      res.json({ 
        success: true, 
        message: "Password changed successfully" 
      });
    } catch (error) {
      console.error("Change password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
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

      // Create new user (approved by default)
      const user = await storage.createUser({
        email,
        username,
        name,
        passwordHash,
        mobileNumber,
        authId: null,
        role: "user",
        isApproved: true,
      });

      // Set session for the user
      req.session.userId = user.id;
      req.session.isAdmin = false;

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

      // Admin users cannot log in through user login - they must use admin login
      if (user.role === "admin") {
        return res.status(403).json({ message: "Please use the Admin Login page to access your account" });
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
          isApproved: user.isApproved,
          mustChangePassword: user.mustChangePassword || false
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
      res.json(users);
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

  // Update user (admin only) with audit logging
  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Whitelist allowed fields - prevent updating sensitive fields like role, passwordHash
      const allowedFields = ['name', 'email', 'department', 'designation', 'employeeCode', 'section', 'shortName', 'mobileNumber', 'gender', 'joinDate', 'resignDate', 'nricFin', 'fingerId'];
      
      // Validate and sanitize input
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        department: z.string().optional(),
        designation: z.string().optional(),
        employeeCode: z.string().optional(),
        section: z.string().optional(),
        shortName: z.string().optional(),
        mobileNumber: z.string().optional(),
        gender: z.string().optional(),
        joinDate: z.string().optional(),
        resignDate: z.string().optional(),
        nricFin: z.string().optional(),
        fingerId: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Only include allowed fields
      const updates: Partial<typeof validatedData> = {};
      for (const field of allowedFields) {
        if (field in validatedData) {
          (updates as any)[field] = (validatedData as any)[field];
        }
      }
      
      // Get the old user data first for audit logging
      const oldUser = await storage.getUser(id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create audit logs for each changed field
      const changedBy = 'admin'; // Admin username for audit trail
      
      for (const field of allowedFields) {
        if ((updates as any)[field] !== undefined) {
          const oldValue = (oldUser as any)[field];
          const newValue = (user as any)[field];
          
          // Only log if value actually changed
          if (String(oldValue ?? '') !== String(newValue ?? '')) {
            await storage.createAuditLog({
              userId: id,
              changedBy,
              fieldChanged: field,
              oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
              newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
              changeType: 'update',
            });
          }
        }
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error("Update user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Reset user password (admin only) - manual override
  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const schema = z.object({
        reason: z.string().optional(),
      });
      
      const { reason } = schema.parse(req.body);
      
      // Get the user first
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate a cryptographically secure random password
      const newPassword = randomBytes(6).toString('base64').replace(/[+\/=]/g, '').slice(0, 10) + '!1';
      
      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update user with new password and set mustChangePassword flag
      await storage.updateUser(id, {
        passwordHash,
        mustChangePassword: true, // Force password change on next login
      });
      
      // Log the password override
      await storage.createPasswordOverrideLog({
        userId: id,
        changedBy: 'admin',
        reason: reason || null,
      });
      
      res.json({ 
        success: true, 
        password: newPassword,
        message: "Password reset successfully. User will be required to change password on next login." 
      });
    } catch (error) {
      console.error("Password reset error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Get password override logs (admin only)
  app.get("/api/admin/password-override-logs", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const logs = await storage.getAllPasswordOverrideLogs();
      res.json({ logs });
    } catch (error) {
      console.error("Get password override logs error:", error);
      res.status(500).json({ message: "Failed to get password override logs" });
    }
  });

  // Bulk import employees (admin only)
  app.post("/api/admin/users/import", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        employees: z.array(z.object({
          code: z.string(),
          name: z.string(),
          shortName: z.string().optional(),
          nricFin: z.string().optional(),
          gender: z.string().optional(),
          department: z.string().optional(),
          section: z.string().optional(),
          designation: z.string().optional(),
          fingerId: z.string().optional(),
          email: z.string().email(),
          joinDate: z.string().optional(),
          resignDate: z.string().optional(),
        })),
      });

      const { employees } = schema.parse(req.body);
      
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const emp of employees) {
        try {
          // Check if user already exists by email or employee code
          const existingByEmail = await storage.getUserByEmail(emp.email);
          const existingByCode = emp.code ? await storage.getUserByEmployeeCode(emp.code) : null;
          
          if (existingByEmail || existingByCode) {
            results.skipped++;
            continue;
          }

          // Generate username from employee code
          const username = emp.code.toLowerCase();
          
          // Generate initial password (employee code + last 4 of NRIC or random)
          const nricSuffix = emp.nricFin ? emp.nricFin.slice(-4) : Math.random().toString(36).substring(2, 6);
          const initialPassword = `${emp.code}${nricSuffix}`;
          const passwordHash = await bcrypt.hash(initialPassword, 10);

          await storage.createUser({
            email: emp.email.toLowerCase(),
            username,
            name: emp.name,
            passwordHash,
            role: "user",
            isApproved: true, // Pre-approve imported employees
            employeeCode: emp.code,
            shortName: emp.shortName || null,
            nricFin: emp.nricFin || null,
            gender: emp.gender || null,
            department: emp.department || null,
            section: emp.section || null,
            designation: emp.designation || null,
            fingerId: emp.fingerId || null,
            joinDate: emp.joinDate || null,
            resignDate: emp.resignDate || null,
          });
          
          results.created++;
        } catch (error: any) {
          results.errors.push(`${emp.name}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Imported ${results.created} employees, skipped ${results.skipped} existing`,
        ...results,
      });
    } catch (error) {
      console.error("Import employees error:", error);
      res.status(500).json({ message: "Failed to import employees" });
    }
  });

  // Create individual user (admin only)
  app.post("/api/admin/users/create", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        employeeCode: z.string().min(1, "Employee code is required"),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        department: z.string().optional(),
        designation: z.string().optional(),
        section: z.string().optional(),
        mobileNumber: z.string().optional(),
        gender: z.string().optional(),
        joinDate: z.string().optional(),
        sendWelcomeEmail: z.boolean().optional(),
        role: z.enum(["user", "admin"]).optional(),
      });

      const data = schema.parse(req.body);
      
      // Check if user already exists by email or employee code
      const existingByEmail = await storage.getUserByEmail(data.email);
      if (existingByEmail) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const existingByCode = await storage.getUserByEmployeeCode(data.employeeCode);
      if (existingByCode) {
        return res.status(400).json({ message: "User with this employee code already exists" });
      }

      // Generate username from employee code
      const username = data.employeeCode.toLowerCase();
      
      // Generate initial password (employee code + 4 random chars)
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const initialPassword = `${data.employeeCode}${randomSuffix}`;
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      const user = await storage.createUser({
        email: data.email.toLowerCase(),
        username,
        name: data.name,
        passwordHash,
        role: data.role || "user",
        isApproved: true,
        employeeCode: data.employeeCode,
        department: data.department || null,
        designation: data.designation || null,
        section: data.section || null,
        mobileNumber: data.mobileNumber || null,
        gender: data.gender || null,
        joinDate: data.joinDate || null,
        mustChangePassword: true,
      });

      res.json({
        success: true,
        user,
        initialPassword,
        message: `User ${data.name} created successfully`,
      });
    } catch (error: any) {
      console.error("Create user error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  // Get admin users (admin only)
  app.get("/api/admin/admins", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const adminUsers = users.filter((u: { role: string }) => u.role === "admin");
      res.json(adminUsers);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to get admin users" });
    }
  });

  // Update user role (promote/demote admin) - admin only
  app.patch("/api/admin/users/:id/role", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        role: z.enum(["user", "admin"]),
      });
      const { role } = schema.parse(req.body);

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const oldRole = user.role;
      await storage.updateUser(id, { role });
      
      // Determine the actor's identity for audit logging
      let changedByIdentifier: string;
      if (req.session.userId === "admin") {
        changedByIdentifier = "master_admin (nexaadmin)";
      } else {
        const actorUser = await storage.getUser(req.session.userId!);
        changedByIdentifier = actorUser ? `${actorUser.name} (${actorUser.email})` : req.session.userId!;
      }
      
      // Log the role change
      await storage.createAuditLog({
        userId: id,
        changedBy: changedByIdentifier,
        fieldChanged: "role",
        oldValue: oldRole,
        newValue: role,
        changeType: "update",
      });

      // If the acting admin demoted themselves, invalidate their admin session
      if (role === "user" && req.session.userId === id) {
        req.session.isAdmin = false;
        return res.json({ 
          success: true, 
          message: "Your admin access has been removed. You will be redirected.",
          selfDemoted: true 
        });
      }

      res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error: any) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: error.message || "Failed to update user role" });
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

  // Get upload URL for clock-in logo (admin only)
  app.post("/api/company/upload-clockin-logo", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const uploadSchema = z.object({
        filename: z.string().min(1),
        contentType: z.string().regex(/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/i),
        size: z.number().max(5 * 1024 * 1024), // 5MB max
      });

      const validation = uploadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid file. Must be an image (PNG, JPEG, GIF, WebP) under 5MB" 
        });
      }

      const { filename } = validation.data;
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURLForPublicAsset(filename);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Get clock-in logo upload URL error:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Update company settings (admin only)
  app.put("/api/company/settings", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { logoUrl, faviconUrl, companyName, clockInLogoUrl } = req.body;
      const objectStorageService = new ObjectStorageService();
      
      const updates: any = {};
      if (companyName) updates.companyName = companyName;
      if (logoUrl) {
        updates.logoUrl = objectStorageService.normalizePublicAssetPath(logoUrl);
      }
      if (faviconUrl) {
        updates.faviconUrl = objectStorageService.normalizePublicAssetPath(faviconUrl);
      }
      if (clockInLogoUrl) {
        updates.clockInLogoUrl = objectStorageService.normalizePublicAssetPath(clockInLogoUrl);
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
      const { latitude, longitude } = req.body as { latitude?: string; longitude?: string };
      
      // Get all today's records
      const todayRecords = await storage.getAttendanceRecordsByUserAndDateRange(userId, date, date);
      
      // Find the most recent record without clock-out time
      const openRecord = todayRecords
        .filter(r => !r.clockOutTime)
        .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())[0];
      
      if (!openRecord) {
        return res.status(400).json({ message: "No active clock-in found. Please clock in first." });
      }

      // Update with clock out time and location
      const updated = await storage.updateAttendanceRecord(openRecord.id, {
        clockOutTime: now,
        clockOutLatitude: latitude || null,
        clockOutLongitude: longitude || null,
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

  // Admin: Add attendance record for an employee (any date)
  app.post("/api/admin/attendance/add", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const schema = z.object({
        userId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        clockInTime: z.string(), // HH:mm format
        clockOutTime: z.string().optional(), // HH:mm format, optional
      });

      const { userId, date, clockInTime, clockOutTime } = schema.parse(req.body);

      // Parse the provided date
      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);

      // Check if employee exists
      const employee = await storage.getUser(userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if attendance already exists for this user on the target date
      const existingRecords = await storage.getAttendanceRecordsByUserAndDateRange(userId, date, date);
      if (existingRecords.length > 0) {
        return res.status(400).json({ message: `Attendance record already exists for this employee on ${date}` });
      }

      // Parse clock in time (HH:mm) to full datetime
      const [clockInHour, clockInMinute] = clockInTime.split(':').map(Number);
      const clockInDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), clockInHour, clockInMinute, 0);

      // Parse clock out time if provided
      let clockOutDateTime: Date | undefined;
      if (clockOutTime) {
        const [clockOutHour, clockOutMinute] = clockOutTime.split(':').map(Number);
        clockOutDateTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), clockOutHour, clockOutMinute, 0);
        
        // Validate clock out is after clock in
        if (clockOutDateTime <= clockInDateTime) {
          return res.status(400).json({ message: "Clock out time must be after clock in time" });
        }
      }

      // Create attendance record
      const record = await storage.createAttendanceRecord({
        userId,
        date: date,
        clockInTime: clockInDateTime,
        clockOutTime: clockOutDateTime || null,
      });

      // Create audit log entry - get admin identifier
      let adminName = "Master Admin";
      if (req.session.userId !== "admin") {
        const adminUser = await storage.getUser(req.session.userId!);
        adminName = adminUser ? `${adminUser.name} (${adminUser.email})` : req.session.userId!;
      }
      await storage.createAuditLog({
        userId,
        changedBy: adminName,
        fieldChanged: "attendance",
        oldValue: null,
        newValue: JSON.stringify({
          date: date,
          clockIn: clockInTime,
          clockOut: clockOutTime || null,
        }),
        changeType: "create",
      });

      res.json({ 
        success: true, 
        record,
        message: `Attendance added for ${employee.name} on ${date}` 
      });
    } catch (error) {
      console.error("Admin add attendance error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add attendance record" });
    }
  });

  // Admin: End clock-in for an employee (nexaadmin only)
  app.post("/api/admin/attendance/end-clockin", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Only master admin (nexaadmin) can end clock-ins
    if (req.session.userId !== "admin") {
      return res.status(403).json({ message: "Only master admin can end employee clock-ins" });
    }

    try {
      const schema = z.object({
        recordId: z.string().uuid(),
        clockOutTime: z.string(), // HH:mm format
      });

      const { recordId, clockOutTime } = schema.parse(req.body);

      // Get the attendance record
      const record = await storage.getAttendanceRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // Check if already clocked out
      if (record.clockOutTime) {
        return res.status(400).json({ message: "This attendance record already has a clock-out time" });
      }

      // Get the employee
      const employee = await storage.getUser(record.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Parse clock out time to full datetime using the record's date
      const recordDate = new Date(record.date);
      const [clockOutHour, clockOutMinute] = clockOutTime.split(':').map(Number);
      const clockOutDateTime = new Date(
        recordDate.getFullYear(), 
        recordDate.getMonth(), 
        recordDate.getDate(), 
        clockOutHour, 
        clockOutMinute, 
        0
      );

      // Validate clock out is after clock in
      const clockInDateTime = new Date(record.clockInTime);
      if (clockOutDateTime <= clockInDateTime) {
        return res.status(400).json({ message: "Clock out time must be after clock in time" });
      }

      // Update the attendance record
      const updatedRecord = await storage.updateAttendanceRecord(recordId, {
        clockOutTime: clockOutDateTime,
      });

      // Create audit log entry
      await storage.createAuditLog({
        userId: record.userId,
        changedBy: "Master Admin (nexaadmin)",
        fieldChanged: "attendance_clockout",
        oldValue: null,
        newValue: JSON.stringify({
          recordId,
          date: record.date,
          clockOut: clockOutTime,
        }),
        changeType: "update",
      });

      res.json({ 
        success: true, 
        record: updatedRecord,
        message: `Clock-out set for ${employee.name}` 
      });
    } catch (error) {
      console.error("Admin end clock-in error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to end clock-in" });
    }
  });

  // Admin: Delete attendance record (nexaadmin only)
  app.delete("/api/admin/attendance/:recordId", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Only master admin (nexaadmin) can delete attendance records
    if (req.session.userId !== "admin") {
      return res.status(403).json({ message: "Only master admin can delete attendance records" });
    }

    try {
      const { recordId } = req.params;

      // Get the attendance record first for audit logging
      const record = await storage.getAttendanceRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // Get employee info for the response message
      const employee = await storage.getUser(record.userId);

      // Delete the attendance record
      await storage.deleteAttendanceRecord(recordId);

      // Create audit log entry
      await storage.createAuditLog({
        userId: record.userId,
        changedBy: "Master Admin (nexaadmin)",
        fieldChanged: "attendance",
        oldValue: JSON.stringify({
          recordId,
          date: record.date,
          clockIn: record.clockInTime,
          clockOut: record.clockOutTime,
        }),
        newValue: null,
        changeType: "delete",
      });

      res.json({ 
        success: true, 
        message: `Attendance record deleted for ${employee?.name || 'Unknown'} on ${record.date}` 
      });
    } catch (error) {
      console.error("Admin delete attendance error:", error);
      res.status(500).json({ message: "Failed to delete attendance record" });
    }
  });

  // Admin: Get attendance audit logs
  app.get("/api/admin/attendance/audit-logs", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Get all audit logs for attendance-related changes
      const allLogs = await storage.getAuditLogsByFieldPrefix("attendance");
      
      // Enrich logs with user information
      const enrichedLogs = await Promise.all(allLogs.map(async (log) => {
        const user = await storage.getUser(log.userId);
        return {
          ...log,
          userName: user?.name || 'Unknown',
          employeeCode: user?.employeeCode || null,
        };
      }));

      res.json({ logs: enrichedLogs });
    } catch (error) {
      console.error("Get attendance audit logs error:", error);
      res.status(500).json({ message: "Failed to get audit logs" });
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

  // ==================== PAYSLIP ENDPOINTS ====================

  // Helper function to calculate hours from attendance records (rounded to nearest 0.5)
  function calculateTotalHoursFromRecords(records: any[]): number {
    const totalHours = records.reduce((sum, record) => {
      if (record.clockOutTime) {
        const hours = (new Date(record.clockOutTime).getTime() - new Date(record.clockInTime).getTime()) / (1000 * 60 * 60);
        return sum + Math.round(hours * 2) / 2; // Round to nearest 0.5
      }
      return sum;
    }, 0);
    return totalHours;
  }

  // Admin: Calculate hours for payslip generation
  app.get("/api/admin/payslips/calculate", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId, startDate, endDate } = req.query as { userId?: string; startDate?: string; endDate?: string };
      
      if (!userId || !startDate || !endDate) {
        return res.status(400).json({ message: "userId, startDate, and endDate are required" });
      }

      const records = await storage.getAttendanceRecordsByUserAndDateRange(userId, startDate, endDate);
      const totalHours = calculateTotalHoursFromRecords(records);

      res.json({
        userId,
        startDate,
        endDate,
        totalHours,
        recordCount: records.length,
      });
    } catch (error) {
      console.error("Calculate hours error:", error);
      res.status(500).json({ message: "Failed to calculate hours" });
    }
  });

  // Admin: Get all payslips
  app.get("/api/admin/payslips", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const payslips = await storage.getAllPayslips();
      res.json({ payslips });
    } catch (error) {
      console.error("Get all payslips error:", error);
      res.status(500).json({ message: "Failed to get payslips" });
    }
  });

  // Admin: Create payslip
  app.post("/api/admin/payslips", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const schema = z.object({
        userId: z.string(),
        periodStart: z.string(),
        periodEnd: z.string(),
        hourlyWage: z.number().min(0), // Cents
      });

      const data = schema.parse(req.body);

      // Calculate total hours from attendance records
      const records = await storage.getAttendanceRecordsByUserAndDateRange(
        data.userId,
        data.periodStart,
        data.periodEnd
      );
      const totalHours = calculateTotalHoursFromRecords(records);
      
      // Convert hours to half-hour increments (e.g., 8.5 hours = 17 half-hours)
      const totalHalfHours = Math.round(totalHours * 2);
      const totalPay = (data.hourlyWage * totalHalfHours) / 2; // Divide by 2 since wage is per hour but we have half-hours

      const payslip = await storage.createPayslip({
        userId: data.userId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        hourlyWage: data.hourlyWage,
        totalHours: totalHalfHours,
        totalPay: Math.round(totalPay),
        status: "draft",
        approvedAt: null,
        approvedBy: null,
      });

      res.json({ success: true, payslip });
    } catch (error) {
      console.error("Create payslip error:", error);
      res.status(500).json({ message: "Failed to create payslip" });
    }
  });

  // Admin: Approve payslip
  app.patch("/api/admin/payslips/:id/approve", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const adminId = req.session.userId!;

      const payslip = await storage.updatePayslip(id, {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: adminId,
      });

      if (!payslip) {
        return res.status(404).json({ message: "Payslip not found" });
      }

      res.json({ success: true, payslip });
    } catch (error) {
      console.error("Approve payslip error:", error);
      res.status(500).json({ message: "Failed to approve payslip" });
    }
  });

  // User: Get approved payslips
  app.get("/api/payslips", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const payslips = await storage.getApprovedPayslipsByUser(userId);
      res.json({ payslips });
    } catch (error) {
      console.error("Get user payslips error:", error);
      res.status(500).json({ message: "Failed to get payslips" });
    }
  });

  // ==================== LEAVE MANAGEMENT ENDPOINTS ====================

  // Admin: Get all leave balances
  app.get("/api/admin/leave/balances", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { year } = req.query as { year?: string };
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      const balances = await storage.getAllLeaveBalances(currentYear);
      res.json({ balances });
    } catch (error) {
      console.error("Get all leave balances error:", error);
      res.status(500).json({ message: "Failed to get leave balances" });
    }
  });

  // Admin: Create or update leave balance
  app.post("/api/admin/leave/balances", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const schema = z.object({
        userId: z.string(),
        leaveType: z.string(),
        totalDays: z.number().min(0),
        year: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const year = data.year || new Date().getFullYear();

      const balance = await storage.createOrUpdateLeaveBalance({
        userId: data.userId,
        leaveType: data.leaveType,
        totalDays: data.totalDays,
        usedDays: 0,
        year,
      });

      res.json({ success: true, balance });
    } catch (error) {
      console.error("Create/update leave balance error:", error);
      res.status(500).json({ message: "Failed to update leave balance" });
    }
  });

  // Admin: Get all leave applications
  app.get("/api/admin/leave/applications", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const applications = await storage.getAllLeaveApplications();
      res.json({ applications });
    } catch (error) {
      console.error("Get all leave applications error:", error);
      res.status(500).json({ message: "Failed to get leave applications" });
    }
  });

  // Admin: Review leave application (approve/reject)
  app.patch("/api/admin/leave/applications/:id", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const schema = z.object({
        status: z.enum(["approved", "rejected"]),
        reviewComments: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const adminId = req.session.userId!;

      const application = await storage.getLeaveApplicationById(id);
      if (!application) {
        return res.status(404).json({ message: "Leave application not found" });
      }

      // If approved, update leave balance
      if (data.status === "approved") {
        const balance = await storage.getLeaveBalance(
          application.userId,
          application.leaveType,
          new Date().getFullYear()
        );

        if (balance) {
          await storage.updateLeaveUsedDays(
            balance.id,
            balance.usedDays + application.totalDays
          );
        }
      }

      const updated = await storage.updateLeaveApplication(id, {
        status: data.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewComments: data.reviewComments || null,
      });

      res.json({ success: true, application: updated });
    } catch (error) {
      console.error("Review leave application error:", error);
      res.status(500).json({ message: "Failed to review leave application" });
    }
  });

  // User: Get leave balances
  app.get("/api/leave/balances", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const { year } = req.query as { year?: string };
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      
      const balances = await storage.getUserLeaveBalances(userId, currentYear);
      res.json({ balances });
    } catch (error) {
      console.error("Get user leave balances error:", error);
      res.status(500).json({ message: "Failed to get leave balances" });
    }
  });

  // User: Get leave applications
  app.get("/api/leave/applications", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const userId = req.session.userId;
      const applications = await storage.getUserLeaveApplications(userId);
      res.json({ applications });
    } catch (error) {
      console.error("Get user leave applications error:", error);
      res.status(500).json({ message: "Failed to get leave applications" });
    }
  });

  // User: Submit leave application
  app.post("/api/leave/applications", async (req: Request, res: Response) => {
    if (!req.session?.userId || req.session.isAdmin) {
      return res.status(401).json({ message: "User authentication required" });
    }

    try {
      const schema = z.object({
        leaveType: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        totalDays: z.number().min(1),
        reason: z.string().min(1),
      });

      const data = schema.parse(req.body);
      const userId = req.session.userId;

      // Check if user has enough leave balance
      const balance = await storage.getLeaveBalance(
        userId,
        data.leaveType,
        new Date().getFullYear()
      );

      if (balance) {
        const remainingDays = balance.totalDays - balance.usedDays;
        if (data.totalDays > remainingDays) {
          return res.status(400).json({ 
            message: `Insufficient leave balance. You have ${remainingDays} days remaining.` 
          });
        }
      }

      const application = await storage.createLeaveApplication({
        userId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        reason: data.reason,
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewComments: null,
      });

      res.json({ success: true, application });
    } catch (error) {
      console.error("Submit leave application error:", error);
      res.status(500).json({ message: "Failed to submit leave application" });
    }
  });

  // ==================== EMAIL ENDPOINTS ====================

  // Send welcome emails to selected users (admin only)
  app.post("/api/admin/users/send-welcome-email", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userIds: z.array(z.string()),
      });

      const { userIds } = schema.parse(req.body);
      
      if (userIds.length === 0) {
        return res.status(400).json({ message: "No users selected" });
      }

      const companySettings = await storage.getCompanySettings();
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            errors.push(`User ${userId} not found`);
            failed++;
            continue;
          }

          // Generate new temporary password
          const tempPassword = generateTempPassword(user.employeeCode || user.username || '');
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          // Update user with new password, timestamp, and force password change
          await storage.updateUser(userId, {
            passwordHash,
            welcomeEmailSentAt: new Date(),
            mustChangePassword: true,
          });

          // Generate QR code for app URL
          const appUrl = companySettings.appUrl || 'https://app.nexahrms.com';
          const qrCodeDataUrl = await QRCode.toDataURL(appUrl, { width: 150 });
          const qrCodeBase64 = qrCodeDataUrl.split(',')[1];

          // Send actual email using Resend
          if (resend) {
            const senderEmail = companySettings.senderEmail || 'onboarding@resend.dev';
            const senderName = companySettings.senderName || 'NexaHRMS';
            
            console.log(`Sending email to ${user.email} from ${senderName} <${senderEmail}>`);
            
            const { data, error } = await resend.emails.send({
              from: `${senderName} <${senderEmail}>`,
              to: user.email,
              subject: 'Welcome to NexaHRMS - Your Login Credentials',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Welcome to NexaHRMS!</h2>
                  <p>Dear ${user.name},</p>
                  <p>We're excited to provide you with a seamless, efficient, and user-friendly experience for managing all your HR needs. From attendance and leave management to performance, payroll, and beyond—everything you need is right here at your fingertips.</p>
                  <h3 style="color: #333;">Your Login Credentials</h3>
                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>App URL:</strong> <a href="${appUrl}">${appUrl}</a></p>
                    <p><strong>Username:</strong> ${user.employeeCode || user.username}</p>
                    <p><strong>Password:</strong> ${tempPassword}</p>
                  </div>
                  <p style="color: #e74c3c;"><strong>Important:</strong> You will be required to change your password upon first login.</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <p>Scan this QR code to access the app:</p>
                    <img src="cid:qrcode" alt="QR Code" style="width: 150px; height: 150px;" />
                  </div>
                  <p>Best regards,<br>${senderName} Team</p>
                </div>
              `,
              attachments: [
                {
                  filename: 'qrcode.png',
                  content: qrCodeBase64,
                  contentId: 'qrcode',
                },
              ],
            });
            
            if (error) {
              console.error(`Resend API error for ${user.email}:`, JSON.stringify(error));
              throw new Error(`Resend error: ${error.message}`);
            }
            
            console.log(`Resend API success for ${user.email}:`, JSON.stringify(data));
          }

          // Log the email
          await storage.createEmailLog({
            userId,
            emailType: 'welcome',
            recipientEmail: user.email,
            subject: 'Welcome to NexaHRMS - Your Login Credentials',
            status: 'sent',
            sentAt: new Date(),
          });

          console.log(`Welcome email sent to ${user.email}`);
          sent++;
        } catch (error: any) {
          console.error(`Failed to send email to user ${userId}:`, error);
          errors.push(`User ${userId}: ${error.message}`);
          failed++;
        }
      }

      res.json({
        success: true,
        message: `Sent ${sent} emails, ${failed} failed`,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Send welcome emails error:", error);
      res.status(500).json({ message: "Failed to send welcome emails" });
    }
  });

  // Resend welcome email to a single user (regenerates password)
  app.post("/api/admin/users/resend-welcome-email", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.string(),
      });

      const { userId } = schema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const companySettings = await storage.getCompanySettings();

      // Generate new temporary password
      const tempPassword = generateTempPassword(user.employeeCode || user.username || '');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Update user with new password, timestamp, and force password change
      await storage.updateUser(userId, {
        passwordHash,
        welcomeEmailSentAt: new Date(),
        mustChangePassword: true,
      });

      // Generate QR code for app URL
      const appUrl = companySettings.appUrl || 'https://app.nexahrms.com';
      const qrCodeDataUrl = await QRCode.toDataURL(appUrl, { width: 150 });
      const qrCodeBase64 = qrCodeDataUrl.split(',')[1];

      // Send actual email using Resend
      if (resend) {
        const senderEmail = companySettings.senderEmail || 'onboarding@resend.dev';
        const senderName = companySettings.senderName || 'NexaHRMS';
        
        console.log(`Resending email to ${user.email} from ${senderName} <${senderEmail}>`);
        
        const { data, error } = await resend.emails.send({
          from: `${senderName} <${senderEmail}>`,
          to: user.email,
          subject: 'Welcome to NexaHRMS - Your New Login Credentials',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to NexaHRMS!</h2>
              <p>Dear ${user.name},</p>
              <p>Your login credentials have been reset. Please use the new credentials below to access the system.</p>
              <h3 style="color: #333;">Your New Login Credentials</h3>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>App URL:</strong> <a href="${appUrl}">${appUrl}</a></p>
                <p><strong>Username:</strong> ${user.employeeCode || user.username}</p>
                <p><strong>Password:</strong> ${tempPassword}</p>
              </div>
              <p style="color: #e74c3c;"><strong>Important:</strong> You will be required to change your password upon first login.</p>
              <div style="text-align: center; margin: 20px 0;">
                <p>Scan this QR code to access the app:</p>
                <img src="cid:qrcode" alt="QR Code" style="width: 150px; height: 150px;" />
              </div>
              <p>Best regards,<br>${senderName} Team</p>
            </div>
          `,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrCodeBase64,
              contentId: 'qrcode',
            },
          ],
        });
        
        if (error) {
          console.error(`Resend API error for ${user.email}:`, JSON.stringify(error));
          return res.status(400).json({ message: `Email failed: ${error.message}` });
        }
        
        console.log(`Resend API success for ${user.email}:`, JSON.stringify(data));
      }

      // Log the email
      await storage.createEmailLog({
        userId,
        emailType: 'welcome',
        recipientEmail: user.email,
        subject: 'Welcome to NexaHRMS - Your New Login Credentials',
        status: 'sent',
        sentAt: new Date(),
      });

      console.log(`Welcome email resent to ${user.email}`);

      res.json({
        success: true,
        message: `Welcome email resent to ${user.email} with new password`,
      });
    } catch (error) {
      console.error("Resend welcome email error:", error);
      res.status(500).json({ message: "Failed to resend welcome email" });
    }
  });

  // Get email logs (admin only)
  app.get("/api/admin/email-logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllEmailLogs();
      res.json({ logs });
    } catch (error) {
      console.error("Get email logs error:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json({ logs });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Generate QR code for app URL (admin only)
  app.get("/api/admin/qr-code", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companySettings = await storage.getCompanySettings();
      const appUrl = companySettings.appUrl || 'https://app.nexahrms.com';
      
      const qrCodeDataUrl = await QRCode.toDataURL(appUrl, {
        errorCorrectionLevel: 'H',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({ 
        success: true, 
        qrCode: qrCodeDataUrl,
        appUrl 
      });
    } catch (error) {
      console.error("Generate QR code error:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Update email settings (admin only)
  app.put("/api/company/email-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        senderEmail: z.string().email().optional(),
        senderName: z.string().optional(),
        appUrl: z.string().url().optional(),
      });

      const data = schema.parse(req.body);
      const updated = await storage.updateCompanySettings(data);
      res.json({ success: true, settings: updated });
    } catch (error) {
      console.error("Update email settings error:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // Update company timezone (admin only)
  app.put("/api/company/timezone", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        defaultTimezone: z.string().min(1, "Timezone is required"),
      });

      const data = schema.parse(req.body);
      const updated = await storage.updateCompanySettings({ defaultTimezone: data.defaultTimezone });
      res.json({ success: true, settings: updated });
    } catch (error) {
      console.error("Update timezone error:", error);
      res.status(500).json({ message: "Failed to update timezone" });
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
