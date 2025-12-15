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
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // HR metadata fields
  employeeCode: text("employee_code"), // Employee code (e.g., 06001)
  shortName: text("short_name"), // Short name / nickname
  nricFin: text("nric_fin"), // NRIC/FIN number
  gender: text("gender"), // MALE, FEMALE
  department: text("department"), // Department name
  section: text("section"), // Section (e.g., SINGAPOREAN, FOREIGN)
  designation: text("designation"), // Job title/designation
  fingerId: text("finger_id"), // Finger/Face ID
  joinDate: text("join_date"), // Join date (DD-MM-YYYY)
  resignDate: text("resign_date"), // Resign date (DD-MM-YYYY)
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"), // When welcome email was last sent
  mustChangePassword: boolean("must_change_password").notNull().default(false), // Force password change on first login
});

export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull().default("NexaHR"),
  logoUrl: text("logo_url"), // URL to app logo in object storage (used in header/branding)
  clockInLogoUrl: text("clock_in_logo_url"), // URL to company logo displayed during clock-in
  faviconUrl: text("favicon_url"), // URL to favicon in object storage
  attendanceBufferMinutes: integer("attendance_buffer_minutes").notNull().default(15), // Max minutes buffer for clock in/out
  defaultTimezone: text("default_timezone").notNull().default("Asia/Singapore"), // IANA timezone for attendance calculations
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Email settings
  senderEmail: text("sender_email"), // Email address to send from
  senderName: text("sender_name"), // Sender display name
  appUrl: text("app_url").default("https://app.nexahrms.com"), // App URL for QR code
});

// Email logs for tracking sent emails
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailType: text("email_type").notNull(), // 'welcome', 'password_reset', etc.
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  errorMessage: text("error_message"), // Error message if failed
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // Format: YYYY-MM-DD for easy querying
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"), // Nullable - user might still be clocked in
  photoUrl: text("photo_url"), // URL to attendance photo in object storage
  latitude: text("latitude"), // GPS latitude (clock-in)
  longitude: text("longitude"), // GPS longitude (clock-in)
  clockOutLatitude: text("clock_out_latitude"), // GPS latitude (clock-out)
  clockOutLongitude: text("clock_out_longitude"), // GPS longitude (clock-out)
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

// Leave History (for imported historical leave data)
export const leaveHistory = pgTable("leave_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  leaveType: text("leave_type").notNull(), // 'AL', 'ML', 'OIL', 'UL', 'CL', etc.
  leaveDate: text("leave_date").notNull(), // Format: YYYY-MM-DD
  dayOfWeek: text("day_of_week"), // Monday, Tuesday, etc.
  remarks: text("remarks"),
  daysOrHours: text("days_or_hours").notNull().default("1.00 day"), // "1.00 day" or "4.00 hr"
  mlClaimAmount: integer("ml_claim_amount").default(0), // cents for medical leave claims
  year: integer("year").notNull(), // Year of the leave
  importedAt: timestamp("imported_at").notNull().defaultNow(),
});

export const insertLeaveHistorySchema = createInsertSchema(leaveHistory).omit({
  id: true,
  importedAt: true,
});

export type InsertLeaveHistory = z.infer<typeof insertLeaveHistorySchema>;
export type LeaveHistory = typeof leaveHistory.$inferSelect;

// Email log types
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// Audit logs for tracking admin changes to user data
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // User whose data was changed
  changedBy: text("changed_by").notNull(), // Admin username/email who made the change
  fieldChanged: text("field_changed").notNull(), // Which field was changed
  oldValue: text("old_value"), // Previous value (nullable for new records)
  newValue: text("new_value"), // New value
  changeType: text("change_type").notNull().default("update"), // 'create', 'update', 'delete'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Password override logs for tracking admin password resets
export const passwordOverrideLogs = pgTable("password_override_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // User whose password was reset
  changedBy: text("changed_by").notNull(), // Admin who made the change
  reason: text("reason"), // Optional reason for the override
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordOverrideLogSchema = createInsertSchema(passwordOverrideLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordOverrideLog = z.infer<typeof insertPasswordOverrideLogSchema>;
export type PasswordOverrideLog = typeof passwordOverrideLogs.$inferSelect;

// Comprehensive Payroll Records (from CSV import)
export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Link to user (nullable if employee not in system)
  payPeriod: text("pay_period").notNull(), // e.g., "NOV 2025", "JAN 2025"
  payPeriodYear: integer("pay_period_year").notNull(), // 2025
  payPeriodMonth: integer("pay_period_month").notNull(), // 1-12
  
  // Employee Info (from CSV)
  employeeCode: text("employee_code").notNull(),
  employeeName: text("employee_name").notNull(),
  deptCode: text("dept_code"),
  deptName: text("dept_name"),
  secCode: text("sec_code"),
  secName: text("sec_name"),
  catCode: text("cat_code"),
  catName: text("cat_name"),
  nric: text("nric"),
  joinDate: text("join_date"),
  
  // Salary Components (stored as cents to avoid floating point issues)
  totSalary: integer("tot_salary").notNull().default(0), // cents
  basicSalary: integer("basic_salary").notNull().default(0), // cents
  monthlyVariablesComponent: integer("monthly_variables_component").notNull().default(0), // cents
  
  // Overtime
  flat: integer("flat").notNull().default(0), // cents
  ot10: integer("ot10").notNull().default(0), // cents - OT 1.0x
  ot15: integer("ot15").notNull().default(0), // cents - OT 1.5x
  ot20: integer("ot20").notNull().default(0), // cents - OT 2.0x
  ot30: integer("ot30").notNull().default(0), // cents - OT 3.0x
  shiftAllowance: integer("shift_allowance").notNull().default(0), // cents
  totRestPhAmount: integer("tot_rest_ph_amount").notNull().default(0), // cents - Rest/PH Amount
  
  // Allowances with CPF (Ordinary)
  mobileAllowance: integer("mobile_allowance").notNull().default(0), // cents
  transportAllowance: integer("transport_allowance").notNull().default(0), // cents
  
  // Allowances with CPF (Additional)
  annualLeaveEncashment: integer("annual_leave_encashment").notNull().default(0), // cents
  serviceCallAllowances: integer("service_call_allowances").notNull().default(0), // cents
  
  // Allowances without CPF
  otherAllowance: integer("other_allowance").notNull().default(0), // cents
  houseRentalAllowances: integer("house_rental_allowances").notNull().default(0), // cents
  
  // Deductions - Loan Repayments (combined into single field as JSON or total)
  loanRepaymentTotal: integer("loan_repayment_total").notNull().default(0), // cents - total of all loans
  loanRepaymentDetails: text("loan_repayment_details"), // JSON string with breakdown if needed
  
  // Deductions without CPF
  noPayDay: integer("no_pay_day").notNull().default(0), // cents - deduction for unpaid leave
  
  // Community Contributions
  cc: integer("cc").notNull().default(0), // cents - Chinese Development Assistance Council
  cdac: integer("cdac").notNull().default(0), // cents
  ecf: integer("ecf").notNull().default(0), // cents - Eurasian Community Fund
  mbmf: integer("mbmf").notNull().default(0), // cents - Mosque Building & Mendaki Fund
  sinda: integer("sinda").notNull().default(0), // cents - Singapore Indian Development Association
  
  // Bonus
  bonus: integer("bonus").notNull().default(0), // cents
  
  // Totals
  grossWages: integer("gross_wages").notNull().default(0), // cents
  cpfWages: integer("cpf_wages").notNull().default(0), // cents
  
  // Levies
  sdf: integer("sdf").notNull().default(0), // cents - Skills Development Fund
  fwl: integer("fwl").notNull().default(0), // cents - Foreign Worker Levy
  
  // CPF Contributions
  employerCpf: integer("employer_cpf").notNull().default(0), // cents
  employeeCpf: integer("employee_cpf").notNull().default(0), // cents (stored as negative)
  totalCpf: integer("total_cpf").notNull().default(0), // cents - total CPF contribution
  
  // Final Amounts
  total: integer("total").notNull().default(0), // cents - total before deductions
  nett: integer("nett").notNull().default(0), // cents - final take-home pay
  
  // Payment Info
  payMode: text("pay_mode"), // 'BANK DISK', 'CASH', 'CHEQUE'
  chequeNo: text("cheque_no"),
  
  // Metadata
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  importedBy: text("imported_by"), // Admin who imported
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  importedAt: true,
});

export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// Attendance Audit Logs for tracking admin changes to attendance data
export const attendanceAuditLogs = pgTable("attendance_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(), // 'add', 'update', 'delete', 'end_clockin'
  tableName: text("table_name").notNull().default("attendance_records"),
  recordId: text("record_id"), // ID of the affected attendance record
  fieldName: text("field_name"), // Which field was changed (for updates)
  oldValue: text("old_value"), // Previous value
  newValue: text("new_value"), // New value
  changedBy: text("changed_by"), // Admin username who made the change
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  userId: varchar("user_id").references(() => users.id), // User whose attendance was affected
});

export const insertAttendanceAuditLogSchema = createInsertSchema(attendanceAuditLogs).omit({
  id: true,
  changedAt: true,
});

export type InsertAttendanceAuditLog = z.infer<typeof insertAttendanceAuditLogSchema>;
export type AttendanceAuditLog = typeof attendanceAuditLogs.$inferSelect;
