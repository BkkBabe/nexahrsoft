import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").unique(), // Username for login (nullable for OAuth users)
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // Password hash (nullable for OAuth users)
  mobileNumber: text("mobile_number"), // Mobile number (optional)
  authId: text("auth_id").unique(), // Replit Auth ID for OAuth users
  role: text("role").notNull().default("user"), // 'admin' or 'user'
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull().default("NexaHR"),
  logoUrl: text("logo_url"), // URL to company logo in object storage
  faviconUrl: text("favicon_url"), // URL to favicon in object storage
  attendanceBufferMinutes: integer("attendance_buffer_minutes").notNull().default(15), // Max minutes buffer for clock in/out
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // Format: YYYY-MM-DD for easy querying
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"), // Nullable - user might still be clocked in
  photoUrl: text("photo_url"), // URL to attendance photo in object storage
  latitude: text("latitude"), // GPS latitude
  longitude: text("longitude"), // GPS longitude
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Internal DB ID
  sessionId: text("session_id").notNull().unique(), // Express session ID
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  userAgent: text("user_agent"), // Browser/device info
  ipAddress: text("ip_address"), // IP address
  revokedAt: timestamp("revoked_at"), // Null if active, timestamp if revoked
});

export const loginChallenges = pgTable("login_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeToken: text("challenge_token").notNull().unique(), // Signed token for validation
  ipAddress: text("ip_address"), // IP that initiated login
  userAgent: text("user_agent"), // Browser that initiated login
  expiresAt: timestamp("expires_at").notNull(), // Short-lived (2 minutes)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"), // Null if not used, timestamp if consumed
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true, // Don't allow direct password hash insertion
});

export const registerUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid mobile number format"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginUserSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});

export const clockInSchema = z.object({
  timestamp: z.string().datetime(), // ISO 8601 datetime string
});

export const clockOutSchema = z.object({
  recordId: z.string().uuid(),
  timestamp: z.string().datetime(), // ISO 8601 datetime string
});

export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type ClockIn = z.infer<typeof clockInSchema>;
export type ClockOut = z.infer<typeof clockOutSchema>;

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertLoginChallengeSchema = createInsertSchema(loginChallenges).omit({
  id: true,
  createdAt: true,
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertLoginChallenge = z.infer<typeof insertLoginChallengeSchema>;
export type LoginChallenge = typeof loginChallenges.$inferSelect;

// Payslip Management
export const payslipRecords = pgTable("payslip_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  periodStart: text("period_start").notNull(), // Format: YYYY-MM-DD
  periodEnd: text("period_end").notNull(), // Format: YYYY-MM-DD
  hourlyWage: integer("hourly_wage").notNull(), // Cents (e.g., 2500 = $25.00)
  totalHours: integer("total_hours").notNull(), // Total hours in half-hour increments (e.g., 80 = 40 hours)
  totalPay: integer("total_pay").notNull(), // Cents
  status: text("status").notNull().default("draft"), // 'draft' or 'approved'
  approvedAt: timestamp("approved_at"), // Nullable until approved
  approvedBy: varchar("approved_by"), // Admin identifier (not FK since admin is not in users table)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPayslipRecordSchema = createInsertSchema(payslipRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertPayslipRecord = z.infer<typeof insertPayslipRecordSchema>;
export type PayslipRecord = typeof payslipRecords.$inferSelect;

// Leave Management
export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  leaveType: text("leave_type").notNull(), // 'annual', 'sick', 'unpaid', etc.
  totalDays: integer("total_days").notNull().default(0), // Total entitled days
  usedDays: integer("used_days").notNull().default(0), // Days already used
  year: integer("year").notNull(), // Year for this balance
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leaveApplications = pgTable("leave_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  leaveType: text("leave_type").notNull(), // 'annual', 'sick', 'unpaid', etc.
  startDate: text("start_date").notNull(), // Format: YYYY-MM-DD
  endDate: text("end_date").notNull(), // Format: YYYY-MM-DD
  totalDays: integer("total_days").notNull(), // Number of days requested
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"), // When it was reviewed
  reviewComments: text("review_comments"), // Admin's comments
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveApplicationSchema = createInsertSchema(leaveApplications).omit({
  id: true,
  createdAt: true,
});

export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationSchema>;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
