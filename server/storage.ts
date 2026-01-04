import { type User, type InsertUser, type CompanySettings, type AttendanceRecord, type InsertAttendanceRecord, type UserSession, type InsertUserSession, type LoginChallenge, type InsertLoginChallenge, type PayslipRecord, type InsertPayslipRecord, type LeaveBalance, type InsertLeaveBalance, type LeaveApplication, type InsertLeaveApplication, type EmailLog, type InsertEmailLog, type AuditLog, type InsertAuditLog, type PasswordOverrideLog, type InsertPasswordOverrideLog, type PayrollRecord, type InsertPayrollRecord, type LeaveHistory, type InsertLeaveHistory, type LeaveAuditLog, type InsertLeaveAuditLog, type PayrollLoanAccount, type InsertPayrollLoanAccount, type PayrollLoanRepayment, type InsertPayrollLoanRepayment, type PayrollAuditLog, type InsertPayrollAuditLog } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users, companySettings, attendanceRecords, userSessions, loginChallenges, payslipRecords, leaveBalances, leaveApplications, emailLogs, auditLogs, passwordOverrideLogs, payrollRecords, leaveHistory, leaveAuditLogs, payrollLoanAccounts, payrollLoanRepayments, payrollAuditLogs } from "@shared/schema";
import { eq, or, and, gte, lte, lt, desc, isNull, not, like, sql } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined>;
  getUserByAuthId(authId: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  approveUser(id: string): Promise<User | undefined>;
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  
  // Attendance methods
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined>;
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined>;
  deleteAttendanceRecord(id: string): Promise<void>;
  getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined>;
  getOpenAttendanceRecord(userId: string): Promise<AttendanceRecord | undefined>;
  getOrphanedAttendanceSessions(): Promise<AttendanceRecord[]>;
  getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  getAllAttendanceRecords(): Promise<AttendanceRecord[]>;
  
  // Session tracking methods
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getActiveSessions(userId: string): Promise<UserSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void>;
  updateSessionLastSeen(sessionId: string): Promise<void>;
  
  // Login challenge methods
  createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge>;
  getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined>;
  useLoginChallenge(challengeId: string): Promise<void>;
  cleanupExpiredChallenges(): Promise<void>;
  
  // Payslip methods
  createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord>;
  updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined>;
  getPayslipById(id: string): Promise<PayslipRecord | undefined>;
  getPayslipsByUser(userId: string): Promise<PayslipRecord[]>;
  getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]>;
  getAllPayslips(): Promise<PayslipRecord[]>;
  
  // Leave management methods
  createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined>;
  getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]>;
  getAllLeaveBalances(year: number): Promise<LeaveBalance[]>;
  updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined>;
  
  createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication>;
  updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined>;
  getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined>;
  getUserLeaveApplications(userId: string): Promise<LeaveApplication[]>;
  getAllLeaveApplications(): Promise<LeaveApplication[]>;
  getPendingLeaveApplications(): Promise<LeaveApplication[]>;
  
  // User update methods
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  bulkCreateUsers(usersData: Partial<User>[]): Promise<User[]>;
  getUserByEmployeeCode(employeeCode: string): Promise<User | undefined>;
  
  // Email log methods
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined>;
  getEmailLogsByUser(userId: string): Promise<EmailLog[]>;
  getAllEmailLogs(): Promise<EmailLog[]>;
  
  // Audit log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getAuditLogsByFieldPrefix(fieldPrefix: string): Promise<AuditLog[]>;
  getAllAuditLogs(): Promise<AuditLog[]>;
  
  // Password override log methods
  createPasswordOverrideLog(log: InsertPasswordOverrideLog): Promise<PasswordOverrideLog>;
  getPasswordOverrideLogsByUser(userId: string): Promise<PasswordOverrideLog[]>;
  getAllPasswordOverrideLogs(): Promise<PasswordOverrideLog[]>;
  
  // Payroll record methods (CSV import)
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  bulkCreatePayrollRecords(records: InsertPayrollRecord[]): Promise<PayrollRecord[]>;
  getPayrollRecords(year?: number, month?: number): Promise<PayrollRecord[]>;
  getPayrollRecordsByEmployee(employeeCode: string): Promise<PayrollRecord[]>;
  getPayrollRecordById(id: string): Promise<PayrollRecord | undefined>;
  updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord | undefined>;
  deletePayrollRecordsByPeriod(year: number, month: number): Promise<void>;
  searchPayrollRecords(year?: number, month?: number, employeeName?: string): Promise<PayrollRecord[]>;
  
  // Payroll audit log methods
  createPayrollAuditLog(log: InsertPayrollAuditLog): Promise<PayrollAuditLog>;
  getPayrollAuditLogsByRecord(payrollRecordId: string): Promise<PayrollAuditLog[]>;
  
  // Leave history methods (CSV import)
  bulkCreateLeaveHistory(records: InsertLeaveHistory[]): Promise<LeaveHistory[]>;
  getLeaveHistory(year?: number): Promise<LeaveHistory[]>;
  getLeaveHistoryById(id: string): Promise<LeaveHistory | undefined>;
  getLeaveHistoryByEmployee(employeeCode: string): Promise<LeaveHistory[]>;
  updateLeaveHistory(id: string, updates: Partial<LeaveHistory>): Promise<LeaveHistory | undefined>;
  deleteLeaveHistory(id: string): Promise<void>;
  deleteLeaveHistoryByYear(year: number): Promise<void>;
  getLeaveHistoryStats(year: number): Promise<{ leaveType: string; totalDays: number; count: number }[]>;
  
  // Leave audit log methods
  createLeaveAuditLog(log: InsertLeaveAuditLog): Promise<LeaveAuditLog>;
  getLeaveAuditLogs(limit?: number): Promise<LeaveAuditLog[]>;
  
  // Payroll Loan methods
  createPayrollLoanAccount(loan: InsertPayrollLoanAccount): Promise<PayrollLoanAccount>;
  updatePayrollLoanAccount(id: string, updates: Partial<PayrollLoanAccount>): Promise<PayrollLoanAccount | undefined>;
  getPayrollLoanAccount(id: string): Promise<PayrollLoanAccount | undefined>;
  getPayrollLoanAccountsByEmployee(employeeCode: string): Promise<PayrollLoanAccount[]>;
  getActivePayrollLoans(): Promise<PayrollLoanAccount[]>;
  getAllPayrollLoanAccounts(): Promise<PayrollLoanAccount[]>;
  
  // Payroll Loan Repayment methods
  createPayrollLoanRepayment(repayment: InsertPayrollLoanRepayment): Promise<PayrollLoanRepayment>;
  getLoanRepaymentsByLoan(loanAccountId: string): Promise<PayrollLoanRepayment[]>;
  getLoanRepaymentsByPeriod(year: number, month: number): Promise<PayrollLoanRepayment[]>;
  getEmployeeLoanRepaymentsForPeriod(employeeCode: string, year: number, month: number): Promise<PayrollLoanRepayment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companySettings: CompanySettings;

  constructor() {
    this.users = new Map();
    this.companySettings = {
      id: randomUUID(),
      companyName: "NexaHR",
      companyAddress: null,
      companyUen: null,
      logoUrl: null,
      clockInLogoUrl: null,
      faviconUrl: null,
      attendanceBufferMinutes: 15,
      defaultTimezone: "Asia/Singapore",
      updatedAt: new Date(),
      senderEmail: null,
      senderName: null,
      appUrl: "https://app.nexahrms.com",
    };
  }
  
  // Stub implementations for loan methods (MemStorage not used in production)
  async createPayrollLoanAccount(loan: InsertPayrollLoanAccount): Promise<PayrollLoanAccount> {
    throw new Error("Not implemented in MemStorage");
  }
  async updatePayrollLoanAccount(id: string, updates: Partial<PayrollLoanAccount>): Promise<PayrollLoanAccount | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async getPayrollLoanAccount(id: string): Promise<PayrollLoanAccount | undefined> {
    return undefined;
  }
  async getPayrollLoanAccountsByEmployee(employeeCode: string): Promise<PayrollLoanAccount[]> {
    return [];
  }
  async getActivePayrollLoans(): Promise<PayrollLoanAccount[]> {
    return [];
  }
  async getAllPayrollLoanAccounts(): Promise<PayrollLoanAccount[]> {
    return [];
  }
  async createPayrollLoanRepayment(repayment: InsertPayrollLoanRepayment): Promise<PayrollLoanRepayment> {
    throw new Error("Not implemented in MemStorage");
  }
  async getLoanRepaymentsByLoan(loanAccountId: string): Promise<PayrollLoanRepayment[]> {
    return [];
  }
  async getLoanRepaymentsByPeriod(year: number, month: number): Promise<PayrollLoanRepayment[]> {
    return [];
  }
  async getEmployeeLoanRepaymentsForPeriod(employeeCode: string, year: number, month: number): Promise<PayrollLoanRepayment[]> {
    return [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === emailOrUsername || user.username === username,
    );
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.authId === authId,
    );
  }

  async createUser(insertUser: Partial<User>): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      name: insertUser.name!,
      email: insertUser.email!,
      username: insertUser.username ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      mobileNumber: insertUser.mobileNumber ?? null,
      authId: insertUser.authId ?? null,
      role: insertUser.role ?? "user",
      isApproved: insertUser.isApproved ?? true,
      createdAt: new Date(),
      employeeCode: insertUser.employeeCode ?? null,
      shortName: insertUser.shortName ?? null,
      nricFin: insertUser.nricFin ?? null,
      gender: insertUser.gender ?? null,
      department: insertUser.department ?? null,
      section: insertUser.section ?? null,
      designation: insertUser.designation ?? null,
      fingerId: insertUser.fingerId ?? null,
      joinDate: insertUser.joinDate ?? null,
      resignDate: insertUser.resignDate ?? null,
      welcomeEmailSentAt: insertUser.welcomeEmailSentAt ?? null,
      mustChangePassword: insertUser.mustChangePassword ?? false,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async approveUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, isApproved: true };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    return this.companySettings;
  }

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    this.companySettings = {
      ...this.companySettings,
      ...settings,
      updatedAt: new Date(),
    };
    return this.companySettings;
  }

  // Attendance methods - stub implementations for MemStorage
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getOpenAttendanceRecord(userId: string): Promise<AttendanceRecord | undefined> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getOrphanedAttendanceSessions(): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }

  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    throw new Error("MemStorage attendance not implemented");
  }

  // Session tracking methods - stub implementations for MemStorage
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async revokeSession(sessionId: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async updateSessionLastSeen(sessionId: string): Promise<void> {
    throw new Error("MemStorage session tracking not implemented");
  }

  async createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async useLoginChallenge(challengeId: string): Promise<void> {
    throw new Error("MemStorage login challenge not implemented");
  }

  async cleanupExpiredChallenges(): Promise<void> {
    throw new Error("MemStorage login challenge not implemented");
  }

  // Payslip methods - stub implementations
  async createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord> {
    throw new Error("MemStorage payslip not implemented");
  }

  async updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getPayslipById(id: string): Promise<PayslipRecord | undefined> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  async getAllPayslips(): Promise<PayslipRecord[]> {
    throw new Error("MemStorage payslip not implemented");
  }

  // Leave management methods - stub implementations
  async createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    throw new Error("MemStorage leave not implemented");
  }

  async getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getAllLeaveBalances(year: number): Promise<LeaveBalance[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication> {
    throw new Error("MemStorage leave not implemented");
  }

  async updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined> {
    throw new Error("MemStorage leave not implemented");
  }

  async getUserLeaveApplications(userId: string): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
  }

  async getPendingLeaveApplications(): Promise<LeaveApplication[]> {
    throw new Error("MemStorage leave not implemented");
  }

  // User update methods - stub implementations
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    throw new Error("MemStorage updateUser not implemented");
  }

  async bulkCreateUsers(usersData: Partial<User>[]): Promise<User[]> {
    throw new Error("MemStorage bulkCreateUsers not implemented");
  }

  async getUserByEmployeeCode(employeeCode: string): Promise<User | undefined> {
    throw new Error("MemStorage getUserByEmployeeCode not implemented");
  }

  // Email log methods - stub implementations
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    throw new Error("MemStorage createEmailLog not implemented");
  }

  async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined> {
    throw new Error("MemStorage updateEmailLog not implemented");
  }

  async getEmailLogsByUser(userId: string): Promise<EmailLog[]> {
    throw new Error("MemStorage getEmailLogsByUser not implemented");
  }

  async getAllEmailLogs(): Promise<EmailLog[]> {
    throw new Error("MemStorage getAllEmailLogs not implemented");
  }

  // Audit log methods - stub implementations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    throw new Error("MemStorage createAuditLog not implemented");
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    throw new Error("MemStorage getAuditLogsByUser not implemented");
  }

  async getAuditLogsByFieldPrefix(fieldPrefix: string): Promise<AuditLog[]> {
    throw new Error("MemStorage getAuditLogsByFieldPrefix not implemented");
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    throw new Error("MemStorage getAllAuditLogs not implemented");
  }
  
  async createPasswordOverrideLog(log: InsertPasswordOverrideLog): Promise<PasswordOverrideLog> {
    throw new Error("MemStorage createPasswordOverrideLog not implemented");
  }
  
  async getPasswordOverrideLogsByUser(userId: string): Promise<PasswordOverrideLog[]> {
    throw new Error("MemStorage getPasswordOverrideLogsByUser not implemented");
  }
  
  async getAllPasswordOverrideLogs(): Promise<PasswordOverrideLog[]> {
    throw new Error("MemStorage getAllPasswordOverrideLogs not implemented");
  }
  
  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    throw new Error("MemStorage createPayrollRecord not implemented");
  }
  
  async bulkCreatePayrollRecords(records: InsertPayrollRecord[]): Promise<PayrollRecord[]> {
    throw new Error("MemStorage bulkCreatePayrollRecords not implemented");
  }
  
  async getPayrollRecords(year?: number, month?: number): Promise<PayrollRecord[]> {
    throw new Error("MemStorage getPayrollRecords not implemented");
  }
  
  async getPayrollRecordsByEmployee(employeeCode: string): Promise<PayrollRecord[]> {
    throw new Error("MemStorage getPayrollRecordsByEmployee not implemented");
  }
  
  async deletePayrollRecordsByPeriod(year: number, month: number): Promise<void> {
    throw new Error("MemStorage deletePayrollRecordsByPeriod not implemented");
  }
  
  async getPayrollRecordById(id: string): Promise<PayrollRecord | undefined> {
    throw new Error("MemStorage getPayrollRecordById not implemented");
  }
  
  async updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord | undefined> {
    throw new Error("MemStorage updatePayrollRecord not implemented");
  }
  
  async searchPayrollRecords(year?: number, month?: number, employeeName?: string): Promise<PayrollRecord[]> {
    throw new Error("MemStorage searchPayrollRecords not implemented");
  }
  
  async createPayrollAuditLog(log: InsertPayrollAuditLog): Promise<PayrollAuditLog> {
    throw new Error("MemStorage createPayrollAuditLog not implemented");
  }
  
  async getPayrollAuditLogsByRecord(payrollRecordId: string): Promise<PayrollAuditLog[]> {
    throw new Error("MemStorage getPayrollAuditLogsByRecord not implemented");
  }
  
  async bulkCreateLeaveHistory(records: InsertLeaveHistory[]): Promise<LeaveHistory[]> {
    throw new Error("MemStorage bulkCreateLeaveHistory not implemented");
  }
  
  async getLeaveHistory(year?: number): Promise<LeaveHistory[]> {
    throw new Error("MemStorage getLeaveHistory not implemented");
  }
  
  async getLeaveHistoryByEmployee(employeeCode: string): Promise<LeaveHistory[]> {
    throw new Error("MemStorage getLeaveHistoryByEmployee not implemented");
  }
  
  async deleteLeaveHistoryByYear(year: number): Promise<void> {
    throw new Error("MemStorage deleteLeaveHistoryByYear not implemented");
  }
  
  async getLeaveHistoryStats(year: number): Promise<{ leaveType: string; totalDays: number; count: number }[]> {
    throw new Error("MemStorage getLeaveHistoryStats not implemented");
  }
  
  async getLeaveHistoryById(id: string): Promise<LeaveHistory | undefined> {
    throw new Error("MemStorage getLeaveHistoryById not implemented");
  }
  
  async updateLeaveHistory(id: string, updates: Partial<LeaveHistory>): Promise<LeaveHistory | undefined> {
    throw new Error("MemStorage updateLeaveHistory not implemented");
  }
  
  async deleteLeaveHistory(id: string): Promise<void> {
    throw new Error("MemStorage deleteLeaveHistory not implemented");
  }
  
  async createLeaveAuditLog(log: InsertLeaveAuditLog): Promise<LeaveAuditLog> {
    throw new Error("MemStorage createLeaveAuditLog not implemented");
  }
  
  async getLeaveAuditLogs(limit?: number): Promise<LeaveAuditLog[]> {
    throw new Error("MemStorage getLeaveAuditLogs not implemented");
  }
}

// PostgreSQL-backed storage implementation
export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmailOrUsername(emailOrUsername: string, username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(
        eq(users.email, emailOrUsername),
        eq(users.username, username),
        eq(users.employeeCode, emailOrUsername),
        eq(users.employeeCode, username)
      )
    );
    return user;
  }

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authId, authId));
    return user;
  }

  async createUser(insertUser: Partial<User>): Promise<User> {
    const [user] = await db.insert(users).values({
      name: insertUser.name!,
      email: insertUser.email!,
      username: insertUser.username ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      mobileNumber: insertUser.mobileNumber ?? null,
      authId: insertUser.authId ?? null,
      role: insertUser.role ?? "user",
      isApproved: insertUser.isApproved ?? true,
    }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async approveUser(id: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isApproved: true })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const [settings] = await db.select().from(companySettings).limit(1);
    
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(companySettings).values({
        companyName: "NexaHR",
        logoUrl: null,
        faviconUrl: null,
      }).returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
    // Get or create settings first
    let settings = await this.getCompanySettings();
    
    // Update the settings
    const [updated] = await db.update(companySettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(companySettings.id, settings.id))
      .returning();
    
    return updated;
  }

  // Attendance methods
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [attendanceRecord] = await db.insert(attendanceRecords)
      .values(record)
      .returning();
    return attendanceRecord;
  }

  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, id))
      .limit(1);
    return record;
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | undefined> {
    const [updated] = await db.update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, id))
      .returning();
    return updated;
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    await db.delete(attendanceRecords)
      .where(eq(attendanceRecords.id, id));
  }

  async getTodayAttendanceRecord(userId: string, date: string): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.date, date)
        )
      )
      .limit(1);
    return record;
  }

  async getOpenAttendanceRecord(userId: string): Promise<AttendanceRecord | undefined> {
    // Find any attendance record for this user that has no clock-out time (open session)
    const [record] = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          isNull(attendanceRecords.clockOutTime)
        )
      )
      .orderBy(desc(attendanceRecords.clockInTime))
      .limit(1);
    return record;
  }

  async getOrphanedAttendanceSessions(): Promise<AttendanceRecord[]> {
    // Find all attendance records without clock-out that are older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const records = await db.select()
      .from(attendanceRecords)
      .where(
        and(
          isNull(attendanceRecords.clockOutTime),
          lt(attendanceRecords.clockInTime, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(attendanceRecords.clockInTime));
    
    return records;
  }

  async getAttendanceRecordsByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      )
      .orderBy(desc(attendanceRecords.date));
  }

  async getAllUsersAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      console.log(`[Storage] getAllUsersAttendanceByDateRange: ${startDate} to ${endDate}`);
      const records = await db.select()
        .from(attendanceRecords)
        .where(
          and(
            gte(attendanceRecords.date, startDate),
            lte(attendanceRecords.date, endDate)
          )
        )
        .orderBy(desc(attendanceRecords.date));
      console.log(`[Storage] Query returned ${records.length} attendance records`);
      return records;
    } catch (error: any) {
      console.error(`[Storage] getAllUsersAttendanceByDateRange error:`, error.message);
      console.error(`[Storage] Error code:`, error.code);
      console.error(`[Storage] Full error:`, error);
      throw error;
    }
  }

  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    return await db.select()
      .from(attendanceRecords)
      .orderBy(desc(attendanceRecords.date));
  }

  // Session tracking methods
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [userSession] = await db.insert(userSessions)
      .values(session)
      .returning();
    return userSession;
  }

  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt)
        )
      )
      .orderBy(desc(userSessions.createdAt));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const conditions = [
      eq(userSessions.userId, userId),
      isNull(userSessions.revokedAt)
    ];
    
    if (exceptSessionId) {
      conditions.push(not(eq(userSessions.sessionId, exceptSessionId)));
    }
    
    await db.update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(...conditions));
  }

  async updateSessionLastSeen(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ lastSeen: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }

  // Login challenge methods
  async createLoginChallenge(challenge: InsertLoginChallenge): Promise<LoginChallenge> {
    const [loginChallenge] = await db.insert(loginChallenges)
      .values(challenge)
      .returning();
    return loginChallenge;
  }

  async getLoginChallenge(challengeToken: string): Promise<LoginChallenge | undefined> {
    const [challenge] = await db.select()
      .from(loginChallenges)
      .where(eq(loginChallenges.challengeToken, challengeToken))
      .limit(1);
    return challenge;
  }

  async useLoginChallenge(challengeId: string): Promise<void> {
    await db.update(loginChallenges)
      .set({ usedAt: new Date() })
      .where(eq(loginChallenges.id, challengeId));
  }

  async cleanupExpiredChallenges(): Promise<void> {
    const now = new Date();
    await db.delete(loginChallenges)
      .where(lte(loginChallenges.expiresAt, now));
  }

  // Payslip methods
  async createPayslip(payslip: InsertPayslipRecord): Promise<PayslipRecord> {
    const [record] = await db.insert(payslipRecords)
      .values(payslip)
      .returning();
    return record;
  }

  async updatePayslip(id: string, updates: Partial<PayslipRecord>): Promise<PayslipRecord | undefined> {
    const [updated] = await db.update(payslipRecords)
      .set(updates)
      .where(eq(payslipRecords.id, id))
      .returning();
    return updated;
  }

  async getPayslipById(id: string): Promise<PayslipRecord | undefined> {
    const [record] = await db.select()
      .from(payslipRecords)
      .where(eq(payslipRecords.id, id));
    return record;
  }

  async getPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .where(eq(payslipRecords.userId, userId))
      .orderBy(desc(payslipRecords.createdAt));
  }

  async getApprovedPayslipsByUser(userId: string): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .where(
        and(
          eq(payslipRecords.userId, userId),
          eq(payslipRecords.status, "approved")
        )
      )
      .orderBy(desc(payslipRecords.createdAt));
  }

  async getAllPayslips(): Promise<PayslipRecord[]> {
    return await db.select()
      .from(payslipRecords)
      .orderBy(desc(payslipRecords.createdAt));
  }

  // Leave management methods
  async createOrUpdateLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    // Check if balance already exists
    const [existing] = await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, balance.userId),
          eq(leaveBalances.leaveType, balance.leaveType),
          eq(leaveBalances.year, balance.year)
        )
      );

    if (existing) {
      // Update existing balance
      const [updated] = await db.update(leaveBalances)
        .set({
          totalDays: balance.totalDays,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new balance
      const [created] = await db.insert(leaveBalances)
        .values(balance)
        .returning();
      return created;
    }
  }

  async getLeaveBalance(userId: string, leaveType: string, year: number): Promise<LeaveBalance | undefined> {
    const [balance] = await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.leaveType, leaveType),
          eq(leaveBalances.year, year)
        )
      );
    return balance;
  }

  async getUserLeaveBalances(userId: string, year: number): Promise<LeaveBalance[]> {
    return await db.select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.year, year)
        )
      )
      .orderBy(leaveBalances.leaveType);
  }

  async getAllLeaveBalances(year: number): Promise<LeaveBalance[]> {
    return await db.select()
      .from(leaveBalances)
      .where(eq(leaveBalances.year, year))
      .orderBy(leaveBalances.userId, leaveBalances.leaveType);
  }

  async updateLeaveUsedDays(id: string, usedDays: number): Promise<LeaveBalance | undefined> {
    const [updated] = await db.update(leaveBalances)
      .set({
        usedDays,
        updatedAt: new Date(),
      })
      .where(eq(leaveBalances.id, id))
      .returning();
    return updated;
  }

  async createLeaveApplication(application: InsertLeaveApplication): Promise<LeaveApplication> {
    const [created] = await db.insert(leaveApplications)
      .values(application)
      .returning();
    return created;
  }

  async updateLeaveApplication(id: string, updates: Partial<LeaveApplication>): Promise<LeaveApplication | undefined> {
    const [updated] = await db.update(leaveApplications)
      .set(updates)
      .where(eq(leaveApplications.id, id))
      .returning();
    return updated;
  }

  async getLeaveApplicationById(id: string): Promise<LeaveApplication | undefined> {
    const [application] = await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.id, id));
    return application;
  }

  async getUserLeaveApplications(userId: string): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.userId, userId))
      .orderBy(desc(leaveApplications.createdAt));
  }

  async getAllLeaveApplications(): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .orderBy(desc(leaveApplications.createdAt));
  }

  async getPendingLeaveApplications(): Promise<LeaveApplication[]> {
    return await db.select()
      .from(leaveApplications)
      .where(eq(leaveApplications.status, "pending"))
      .orderBy(leaveApplications.createdAt);
  }

  // User update methods
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async bulkCreateUsers(usersData: Partial<User>[]): Promise<User[]> {
    if (usersData.length === 0) return [];
    
    const createdUsers: User[] = [];
    for (const userData of usersData) {
      try {
        const [created] = await db.insert(users)
          .values(userData as any)
          .returning();
        createdUsers.push(created);
      } catch (error) {
        console.error("Error creating user:", userData.email, error);
      }
    }
    return createdUsers;
  }

  async getUserByEmployeeCode(employeeCode: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.employeeCode, employeeCode))
      .limit(1);
    return user;
  }

  // Email log methods
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [created] = await db.insert(emailLogs)
      .values(log)
      .returning();
    return created;
  }

  async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined> {
    const [updated] = await db.update(emailLogs)
      .set(updates)
      .where(eq(emailLogs.id, id))
      .returning();
    return updated;
  }

  async getEmailLogsByUser(userId: string): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.createdAt));
  }

  async getAllEmailLogs(): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt));
  }

  // Audit log methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs)
      .values(log)
      .returning();
    return created;
  }

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByFieldPrefix(fieldPrefix: string): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(like(auditLogs.fieldChanged, `${fieldPrefix}%`))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt));
  }
  
  async createPasswordOverrideLog(log: InsertPasswordOverrideLog): Promise<PasswordOverrideLog> {
    const [result] = await db.insert(passwordOverrideLogs).values(log).returning();
    return result;
  }
  
  async getPasswordOverrideLogsByUser(userId: string): Promise<PasswordOverrideLog[]> {
    return await db.select()
      .from(passwordOverrideLogs)
      .where(eq(passwordOverrideLogs.userId, userId))
      .orderBy(desc(passwordOverrideLogs.createdAt));
  }
  
  async getAllPasswordOverrideLogs(): Promise<PasswordOverrideLog[]> {
    return await db.select()
      .from(passwordOverrideLogs)
      .orderBy(desc(passwordOverrideLogs.createdAt));
  }
  
  // Payroll record methods (CSV import)
  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [created] = await db.insert(payrollRecords)
      .values(record)
      .returning();
    return created;
  }
  
  async bulkCreatePayrollRecords(records: InsertPayrollRecord[]): Promise<PayrollRecord[]> {
    if (records.length === 0) return [];
    const created = await db.insert(payrollRecords)
      .values(records)
      .returning();
    return created;
  }
  
  async getPayrollRecords(year?: number, month?: number): Promise<PayrollRecord[]> {
    if (year !== undefined && month !== undefined) {
      return await db.select()
        .from(payrollRecords)
        .where(
          and(
            eq(payrollRecords.payPeriodYear, year),
            eq(payrollRecords.payPeriodMonth, month)
          )
        )
        .orderBy(desc(payrollRecords.importedAt));
    } else if (year !== undefined) {
      return await db.select()
        .from(payrollRecords)
        .where(eq(payrollRecords.payPeriodYear, year))
        .orderBy(desc(payrollRecords.importedAt));
    }
    return await db.select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.importedAt));
  }
  
  async getPayrollRecordsByEmployee(employeeCode: string): Promise<PayrollRecord[]> {
    return await db.select()
      .from(payrollRecords)
      .where(eq(payrollRecords.employeeCode, employeeCode))
      .orderBy(desc(payrollRecords.payPeriodYear), desc(payrollRecords.payPeriodMonth));
  }
  
  async deletePayrollRecordsByPeriod(year: number, month: number): Promise<void> {
    await db.delete(payrollRecords)
      .where(
        and(
          eq(payrollRecords.payPeriodYear, year),
          eq(payrollRecords.payPeriodMonth, month)
        )
      );
  }
  
  async getPayrollRecordById(id: string): Promise<PayrollRecord | undefined> {
    const [record] = await db.select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, id));
    return record;
  }
  
  async updatePayrollRecord(id: string, updates: Partial<PayrollRecord>): Promise<PayrollRecord | undefined> {
    const [updated] = await db.update(payrollRecords)
      .set(updates)
      .where(eq(payrollRecords.id, id))
      .returning();
    return updated;
  }
  
  async searchPayrollRecords(year?: number, month?: number, employeeName?: string): Promise<PayrollRecord[]> {
    const conditions = [];
    if (year !== undefined) {
      conditions.push(eq(payrollRecords.payPeriodYear, year));
    }
    if (month !== undefined) {
      conditions.push(eq(payrollRecords.payPeriodMonth, month));
    }
    if (employeeName) {
      conditions.push(like(payrollRecords.employeeName, `%${employeeName}%`));
    }
    
    if (conditions.length > 0) {
      return await db.select()
        .from(payrollRecords)
        .where(and(...conditions))
        .orderBy(payrollRecords.employeeName);
    }
    return await db.select()
      .from(payrollRecords)
      .orderBy(payrollRecords.employeeName);
  }
  
  async createPayrollAuditLog(log: InsertPayrollAuditLog): Promise<PayrollAuditLog> {
    const [created] = await db.insert(payrollAuditLogs)
      .values(log)
      .returning();
    return created;
  }
  
  async getPayrollAuditLogsByRecord(payrollRecordId: string): Promise<PayrollAuditLog[]> {
    return await db.select()
      .from(payrollAuditLogs)
      .where(eq(payrollAuditLogs.payrollRecordId, payrollRecordId))
      .orderBy(desc(payrollAuditLogs.changedAt));
  }
  
  // Leave history methods (CSV import)
  async bulkCreateLeaveHistory(records: InsertLeaveHistory[]): Promise<LeaveHistory[]> {
    if (records.length === 0) return [];
    const created = await db.insert(leaveHistory)
      .values(records)
      .returning();
    return created;
  }
  
  async getLeaveHistory(year?: number): Promise<LeaveHistory[]> {
    if (year !== undefined) {
      return await db.select()
        .from(leaveHistory)
        .where(eq(leaveHistory.year, year))
        .orderBy(desc(leaveHistory.leaveDate));
    }
    return await db.select()
      .from(leaveHistory)
      .orderBy(desc(leaveHistory.leaveDate));
  }
  
  async getLeaveHistoryByEmployee(employeeCode: string): Promise<LeaveHistory[]> {
    return await db.select()
      .from(leaveHistory)
      .where(eq(leaveHistory.employeeCode, employeeCode))
      .orderBy(desc(leaveHistory.leaveDate));
  }
  
  async deleteLeaveHistoryByYear(year: number): Promise<void> {
    await db.delete(leaveHistory)
      .where(eq(leaveHistory.year, year));
  }
  
  async getLeaveHistoryStats(year: number): Promise<{ leaveType: string; totalDays: number; count: number }[]> {
    const results = await db.select({
      leaveType: leaveHistory.leaveType,
      count: sql<number>`count(*)::int`,
      totalDays: sql<number>`sum(
        CASE 
          WHEN ${leaveHistory.daysOrHours} LIKE '%day%' THEN 
            CAST(REGEXP_REPLACE(${leaveHistory.daysOrHours}, '[^0-9.]', '', 'g') AS DECIMAL)
          WHEN ${leaveHistory.daysOrHours} LIKE '%hr%' THEN 
            CAST(REGEXP_REPLACE(${leaveHistory.daysOrHours}, '[^0-9.]', '', 'g') AS DECIMAL) / 8
          ELSE 1
        END
      )::numeric(10,2)`,
    })
      .from(leaveHistory)
      .where(eq(leaveHistory.year, year))
      .groupBy(leaveHistory.leaveType);
    return results.map(r => ({ 
      leaveType: r.leaveType, 
      totalDays: Number(r.totalDays) || 0, 
      count: r.count 
    }));
  }
  
  async getLeaveHistoryById(id: string): Promise<LeaveHistory | undefined> {
    const [record] = await db.select()
      .from(leaveHistory)
      .where(eq(leaveHistory.id, id));
    return record;
  }
  
  async updateLeaveHistory(id: string, updates: Partial<LeaveHistory>): Promise<LeaveHistory | undefined> {
    const [updated] = await db.update(leaveHistory)
      .set(updates)
      .where(eq(leaveHistory.id, id))
      .returning();
    return updated;
  }
  
  async deleteLeaveHistory(id: string): Promise<void> {
    await db.delete(leaveHistory)
      .where(eq(leaveHistory.id, id));
  }
  
  async createLeaveAuditLog(log: InsertLeaveAuditLog): Promise<LeaveAuditLog> {
    const [created] = await db.insert(leaveAuditLogs)
      .values(log)
      .returning();
    return created;
  }
  
  async getLeaveAuditLogs(limit?: number): Promise<LeaveAuditLog[]> {
    if (limit) {
      return await db.select()
        .from(leaveAuditLogs)
        .orderBy(desc(leaveAuditLogs.changedAt))
        .limit(limit);
    }
    return await db.select()
      .from(leaveAuditLogs)
      .orderBy(desc(leaveAuditLogs.changedAt));
  }
  
  // Payroll Loan Account methods
  async createPayrollLoanAccount(loan: InsertPayrollLoanAccount): Promise<PayrollLoanAccount> {
    const [created] = await db.insert(payrollLoanAccounts)
      .values(loan)
      .returning();
    return created;
  }
  
  async updatePayrollLoanAccount(id: string, updates: Partial<PayrollLoanAccount>): Promise<PayrollLoanAccount | undefined> {
    const [updated] = await db.update(payrollLoanAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payrollLoanAccounts.id, id))
      .returning();
    return updated;
  }
  
  async getPayrollLoanAccount(id: string): Promise<PayrollLoanAccount | undefined> {
    const [loan] = await db.select()
      .from(payrollLoanAccounts)
      .where(eq(payrollLoanAccounts.id, id));
    return loan;
  }
  
  async getPayrollLoanAccountsByEmployee(employeeCode: string): Promise<PayrollLoanAccount[]> {
    return await db.select()
      .from(payrollLoanAccounts)
      .where(eq(payrollLoanAccounts.employeeCode, employeeCode))
      .orderBy(desc(payrollLoanAccounts.createdAt));
  }
  
  async getActivePayrollLoans(): Promise<PayrollLoanAccount[]> {
    return await db.select()
      .from(payrollLoanAccounts)
      .where(eq(payrollLoanAccounts.status, "active"))
      .orderBy(desc(payrollLoanAccounts.createdAt));
  }
  
  async getAllPayrollLoanAccounts(): Promise<PayrollLoanAccount[]> {
    return await db.select()
      .from(payrollLoanAccounts)
      .orderBy(desc(payrollLoanAccounts.createdAt));
  }
  
  // Payroll Loan Repayment methods
  async createPayrollLoanRepayment(repayment: InsertPayrollLoanRepayment): Promise<PayrollLoanRepayment> {
    const [created] = await db.insert(payrollLoanRepayments)
      .values(repayment)
      .returning();
    
    // Update the loan's outstanding balance
    const loan = await this.getPayrollLoanAccount(repayment.loanAccountId);
    if (loan) {
      const newBalance = loan.outstandingBalance - repayment.repaymentAmount;
      await this.updatePayrollLoanAccount(loan.id, { 
        outstandingBalance: Math.max(0, newBalance),
        status: newBalance <= 0 ? "paid_off" : "active"
      });
    }
    
    return created;
  }
  
  async getLoanRepaymentsByLoan(loanAccountId: string): Promise<PayrollLoanRepayment[]> {
    return await db.select()
      .from(payrollLoanRepayments)
      .where(eq(payrollLoanRepayments.loanAccountId, loanAccountId))
      .orderBy(desc(payrollLoanRepayments.processedAt));
  }
  
  async getLoanRepaymentsByPeriod(year: number, month: number): Promise<PayrollLoanRepayment[]> {
    return await db.select()
      .from(payrollLoanRepayments)
      .where(and(
        eq(payrollLoanRepayments.payPeriodYear, year),
        eq(payrollLoanRepayments.payPeriodMonth, month)
      ))
      .orderBy(desc(payrollLoanRepayments.processedAt));
  }
  
  async getEmployeeLoanRepaymentsForPeriod(employeeCode: string, year: number, month: number): Promise<PayrollLoanRepayment[]> {
    // Get all loans for this employee first, then filter repayments
    const loans = await this.getPayrollLoanAccountsByEmployee(employeeCode);
    const loanIds = loans.map(l => l.id);
    
    if (loanIds.length === 0) return [];
    
    const allRepayments = await this.getLoanRepaymentsByPeriod(year, month);
    return allRepayments.filter(r => loanIds.includes(r.loanAccountId));
  }
}

export const storage = new PgStorage();
